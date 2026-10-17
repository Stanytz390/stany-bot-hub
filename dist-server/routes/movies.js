import { Router } from "express";
import { Movie } from "../models/Movie.js";
import { MoviePurchase } from "../models/MoviePurchase.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { authGuard } from "../middleware/auth.js";
import { roleOf } from "../middleware/roleGuard.js";
const router = Router();
// Helper to check admin permission
const adminCheck = (req, res, next) => {
    const role = roleOf(req.user);
    if (role !== "admin") {
        res.status(403).json({ error: "Administrator access required" });
        return;
    }
    next();
};
// GET /api/movies - Public movie catalog
router.get("/", async (req, res) => {
    try {
        const { q, genre, trending, featured, sort, limit = "24", page = "1" } = req.query;
        const filter = { isPublished: true };
        if (genre && genre !== "All") {
            filter.genre = new RegExp(String(genre), "i");
        }
        if (trending === "true") {
            filter.isTrending = true;
        }
        if (featured === "true") {
            filter.isFeatured = true;
        }
        if (q) {
            filter.$or = [
                { title: { $regex: String(q), $options: "i" } },
                { synopsis: { $regex: String(q), $options: "i" } },
                { genre: { $regex: String(q), $options: "i" } },
            ];
        }
        let sortOption = { createdAt: -1 };
        if (sort === "rating")
            sortOption = { rating: -1 };
        else if (sort === "price-asc")
            sortOption = { priceSQ: 1 };
        else if (sort === "price-desc")
            sortOption = { priceSQ: -1 };
        else if (sort === "year")
            sortOption = { releaseYear: -1 };
        else if (sort === "featured")
            sortOption = { isFeatured: -1, isTrending: -1 };
        const pageNum = Math.max(1, parseInt(String(page)) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 24));
        const skip = (pageNum - 1) * limitNum;
        const [movies, total, genresList] = await Promise.all([
            Movie.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
            Movie.countDocuments(filter),
            Movie.distinct("genre", { isPublished: true }),
        ]);
        // Flatten comma-separated genres into unique tags
        const uniqueGenres = Array.from(new Set(genresList
            .flatMap((g) => (g ? g.split(",").map((s) => s.trim()) : []))
            .filter(Boolean))).sort();
        res.json({ movies, total, page: pageNum, pages: Math.ceil(total / limitNum), genres: uniqueGenres });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch movies" });
    }
});
// GET /api/movies/library/mine - User's purchased movies
router.get("/library/mine", authGuard, async (req, res) => {
    try {
        const userId = req.user?._id;
        const purchases = await MoviePurchase.find({ userId, status: "completed" })
            .populate("movieId")
            .sort({ createdAt: -1 })
            .lean();
        const movies = purchases
            .filter((p) => p.movieId)
            .map((p) => ({
            purchaseId: p._id,
            purchasedAt: p.createdAt,
            priceSQ: p.priceSQ,
            movie: p.movieId,
        }));
        res.json({ items: movies, count: movies.length });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch user movie library" });
    }
});
// GET /api/movies/:slug - Movie details & related
router.get("/:slug", async (req, res) => {
    try {
        const { slug } = req.params;
        const movie = await Movie.findOne({ slug, isPublished: true }).lean();
        if (!movie) {
            res.status(404).json({ error: "Movie not found" });
            return;
        }
        const firstGenre = movie.genre.split(",")[0]?.trim() || "";
        const related = await Movie.find({
            genre: new RegExp(firstGenre, "i"),
            _id: { $ne: movie._id },
            isPublished: true,
        })
            .limit(4)
            .lean();
        // Check ownership if user token is provided
        let isOwned = false;
        const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
        if (token) {
            try {
                const jwt = (await import("jsonwebtoken")).default;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "");
                if (decoded?.userId) {
                    const owned = await MoviePurchase.findOne({ userId: decoded.userId, movieId: movie._id });
                    if (owned)
                        isOwned = true;
                }
            }
            catch {
                // silent
            }
        }
        res.json({ movie, related, isOwned });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch movie details" });
    }
});
// POST /api/movies/:id/purchase - Purchase with SQ coins
router.post("/:id/purchase", authGuard, async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }
        const movie = await Movie.findById(req.params.id);
        if (!movie || !movie.isPublished) {
            res.status(404).json({ error: "Movie not found or unavailable for purchase" });
            return;
        }
        // Check if already owned
        const existing = await MoviePurchase.findOne({ userId, movieId: movie._id });
        if (existing) {
            res.status(400).json({ error: "You already own this movie in your cinema library" });
            return;
        }
        // Calculate final SQ price
        const discount = Math.max(0, Math.min(100, movie.discount || 0));
        const finalPriceSQ = Math.max(0, Math.round(movie.priceSQ * (1 - discount / 100)));
        // Fetch fresh user balance
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        if (user.txCoins < finalPriceSQ) {
            res.status(400).json({
                error: `Insufficient SQ balance. Required: ${finalPriceSQ} SQ, Available: ${user.txCoins} SQ. Please top up your wallet.`,
                requiredSq: finalPriceSQ,
                balance: user.txCoins,
            });
            return;
        }
        // Deduct coins & record purchase
        user.txCoins -= finalPriceSQ;
        await user.save();
        const purchase = await MoviePurchase.create({
            userId,
            movieId: movie._id,
            priceSQ: finalPriceSQ,
            priceTZS: movie.priceTZS,
            status: "completed",
        });
        await Transaction.create({
            userId,
            type: "movie_purchase",
            txAmount: -finalPriceSQ,
            tzsAmount: movie.priceTZS,
            itemName: `Movie: ${movie.title}`,
            reference: `MOVIE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            method: "SQ Wallet",
            status: "success",
        });
        res.json({
            success: true,
            message: `Successfully purchased "${movie.title}"! You can now watch it in your library.`,
            newBalance: user.txCoins,
            purchaseId: purchase._id,
            movie: {
                _id: movie._id,
                title: movie.title,
                watchUrl: movie.watchUrl,
                externalWatchUrl: movie.externalWatchUrl,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: "Purchase transaction failed" });
    }
});
// ADMIN ROUTES
// GET /api/movies/admin/all - Admin list
router.get("/admin/all", authGuard, adminCheck, async (req, res) => {
    try {
        const { q, genre } = req.query;
        const filter = {};
        if (genre)
            filter.genre = new RegExp(String(genre), "i");
        if (q) {
            filter.$or = [
                { title: { $regex: String(q), $options: "i" } },
                { slug: { $regex: String(q), $options: "i" } },
            ];
        }
        const movies = await Movie.find(filter).sort({ createdAt: -1 }).lean();
        res.json({ items: movies, count: movies.length });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch admin movies" });
    }
});
// POST /api/movies/admin - Create new movie
router.post("/admin", authGuard, adminCheck, async (req, res) => {
    try {
        const { title, slug, synopsis, posterImage, backdropImage, trailerUrl, genre, releaseYear, duration, rating, maturityRating, priceTZS, priceSQ, discount, watchUrl, externalWatchUrl, isFeatured, isTrending, isPublished, } = req.body;
        if (!title || !synopsis || !posterImage) {
            res.status(400).json({ error: "Title, synopsis, and poster image are required" });
            return;
        }
        const finalSlug = (slug || title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        const existing = await Movie.findOne({ slug: finalSlug });
        if (existing) {
            res.status(400).json({ error: "A movie with this slug already exists" });
            return;
        }
        const movie = await Movie.create({
            title,
            slug: finalSlug,
            synopsis,
            posterImage,
            backdropImage: backdropImage || "",
            trailerUrl: trailerUrl || "",
            genre: genre || "Action, Sci-Fi",
            releaseYear: Number(releaseYear) || 2025,
            duration: duration || "1h 50m",
            rating: Number(rating) || 8.5,
            maturityRating: maturityRating || "PG-13",
            priceTZS: Number(priceTZS) || 0,
            priceSQ: Number(priceSQ) || 0,
            discount: Number(discount) || 0,
            watchUrl: watchUrl || "",
            externalWatchUrl: externalWatchUrl || "",
            isFeatured: Boolean(isFeatured),
            isTrending: Boolean(isTrending),
            isPublished: isPublished !== false,
        });
        res.status(201).json({ success: true, movie });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create movie" });
    }
});
// PATCH /api/movies/admin/:id - Update movie
router.patch("/admin/:id", authGuard, adminCheck, async (req, res) => {
    try {
        const movie = await Movie.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        if (!movie) {
            res.status(404).json({ error: "Movie not found" });
            return;
        }
        res.json({ success: true, movie });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update movie" });
    }
});
// DELETE /api/movies/admin/:id - Delete movie
router.delete("/admin/:id", authGuard, adminCheck, async (req, res) => {
    try {
        const movie = await Movie.findByIdAndDelete(req.params.id);
        if (!movie) {
            res.status(404).json({ error: "Movie not found" });
            return;
        }
        res.json({ success: true, message: "Movie deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to delete movie" });
    }
});
export default router;
