import { Router, type Response, type NextFunction } from "express";
import { Game } from "../models/Game.js";
import { GamePurchase } from "../models/GamePurchase.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { roleOf } from "../middleware/roleGuard.js";

const router = Router();

// Helper to check admin permission
const adminCheck = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = roleOf(req.user as unknown as { email?: string; role?: string });
  if (role !== "admin") {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }
  next();
};

// GET /api/games - Public list of published games
router.get("/", async (req, res) => {
  try {
    const { q, category, platform, featured, sort, limit = "24", page = "1" } = req.query;
    const filter: Record<string, unknown> = { isPublished: true };

    if (category && category !== "All") {
      filter.category = category;
    }
    if (platform && platform !== "All") {
      filter.platform = new RegExp(String(platform), "i");
    }
    if (featured === "true") {
      filter.isFeatured = true;
    }
    if (q) {
      filter.$or = [
        { title: { $regex: String(q), $options: "i" } },
        { description: { $regex: String(q), $options: "i" } },
        { category: { $regex: String(q), $options: "i" } },
      ];
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "price-asc") sortOption = { priceSQ: 1 };
    else if (sort === "price-desc") sortOption = { priceSQ: -1 };
    else if (sort === "rating") sortOption = { rating: -1 };
    else if (sort === "featured") sortOption = { isFeatured: -1, createdAt: -1 };

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 24));
    const skip = (pageNum - 1) * limitNum;

    const [games, total, categories] = await Promise.all([
      Game.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
      Game.countDocuments(filter),
      Game.distinct("category", { isPublished: true }),
    ]);

    res.json({ games, total, page: pageNum, pages: Math.ceil(total / limitNum), categories });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

// GET /api/games/library/mine - User's owned games
router.get("/library/mine", authGuard, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    const purchases = await GamePurchase.find({ userId, status: "completed" })
      .populate("gameId")
      .sort({ createdAt: -1 })
      .lean();

    const games = purchases
      .filter((p) => p.gameId)
      .map((p) => ({
        purchaseId: p._id,
        purchasedAt: p.createdAt,
        priceSQ: p.priceSQ,
        game: p.gameId,
      }));

    res.json({ items: games, count: games.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user game library" });
  }
});

// GET /api/games/:slug - Game details & related
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const game = await Game.findOne({ slug, isPublished: true }).lean();
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const related = await Game.find({
      category: game.category,
      _id: { $ne: game._id },
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { userId: string };
        if (decoded?.userId) {
          const owned = await GamePurchase.findOne({ userId: decoded.userId, gameId: game._id });
          if (owned) isOwned = true;
        }
      } catch {
        // silent
      }
    }

    res.json({ game, related, isOwned });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch game details" });
  }
});

// POST /api/games/:id/purchase - Purchase with SQ coins
router.post("/:id/purchase", authGuard, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const game = await Game.findById(req.params.id);
    if (!game || !game.isPublished) {
      res.status(404).json({ error: "Game not found or unavailable for purchase" });
      return;
    }

    // Check if already owned
    const existing = await GamePurchase.findOne({ userId, gameId: game._id });
    if (existing) {
      res.status(400).json({ error: "You already own this game in your library" });
      return;
    }

    // Calculate final SQ price
    const discount = Math.max(0, Math.min(100, game.discount || 0));
    const finalPriceSQ = Math.max(0, Math.round(game.priceSQ * (1 - discount / 100)));

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

    const purchase = await GamePurchase.create({
      userId,
      gameId: game._id,
      priceSQ: finalPriceSQ,
      priceTZS: game.priceTZS,
      status: "completed",
    });

    await Transaction.create({
      userId,
      type: "game_purchase",
      txAmount: -finalPriceSQ,
      tzsAmount: game.priceTZS,
      itemName: `Game: ${game.title}`,
      reference: `GAME-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      method: "SQ Wallet",
      status: "success",
    });

    res.json({
      success: true,
      message: `Successfully purchased "${game.title}"! It has been added to your library.`,
      newBalance: user.txCoins,
      purchaseId: purchase._id,
      game: {
        _id: game._id,
        title: game.title,
        downloadUrl: game.downloadUrl,
        externalStoreUrl: game.externalStoreUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Purchase transaction failed" });
  }
});

// ADMIN ROUTES
// GET /api/games/admin/all - Admin list with all statuses
router.get("/admin/all", authGuard, adminCheck, async (req, res) => {
  try {
    const { q, category } = req.query;
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (q) {
      filter.$or = [
        { title: { $regex: String(q), $options: "i" } },
        { slug: { $regex: String(q), $options: "i" } },
      ];
    }
    const games = await Game.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ items: games, count: games.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin games" });
  }
});

// POST /api/games/admin - Create new game
router.post("/admin", authGuard, adminCheck, async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      coverImage,
      bannerImage,
      screenshots,
      trailerUrl,
      category,
      platform,
      priceTZS,
      priceSQ,
      discount,
      rating,
      downloadUrl,
      externalStoreUrl,
      isFeatured,
      isPublished,
    } = req.body;

    if (!title || !description || !coverImage) {
      res.status(400).json({ error: "Title, description, and cover image are required" });
      return;
    }

    const finalSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existing = await Game.findOne({ slug: finalSlug });
    if (existing) {
      res.status(400).json({ error: "A game with this slug already exists" });
      return;
    }

    const game = await Game.create({
      title,
      slug: finalSlug,
      description,
      coverImage,
      bannerImage: bannerImage || "",
      screenshots: Array.isArray(screenshots) ? screenshots : [],
      trailerUrl: trailerUrl || "",
      category: category || "Action",
      platform: platform || "PC / Android",
      priceTZS: Number(priceTZS) || 0,
      priceSQ: Number(priceSQ) || 0,
      discount: Number(discount) || 0,
      rating: Number(rating) || 4.8,
      downloadUrl: downloadUrl || "",
      externalStoreUrl: externalStoreUrl || "",
      isFeatured: Boolean(isFeatured),
      isPublished: isPublished !== false,
    });

    res.status(201).json({ success: true, game });
  } catch (error) {
    res.status(500).json({ error: "Failed to create game" });
  }
});

// PATCH /api/games/admin/:id - Update game
router.patch("/admin/:id", authGuard, adminCheck, async (req, res) => {
  try {
    const game = await Game.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json({ success: true, game });
  } catch (error) {
    res.status(500).json({ error: "Failed to update game" });
  }
});

// DELETE /api/games/admin/:id - Delete game
router.delete("/admin/:id", authGuard, adminCheck, async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json({ success: true, message: "Game deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete game" });
  }
});

export default router;
