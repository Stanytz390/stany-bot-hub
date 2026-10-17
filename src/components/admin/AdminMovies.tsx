import { useState, useEffect } from "react";
import {
  adminGetMovies,
  adminCreateMovie,
  adminUpdateMovie,
  adminDeleteMovie,
} from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import type { Movie } from "@/types";
import {
  Film,
  Plus,
  Search,
  Trash2,
  Edit2,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";

export function AdminMovies() {
  const { showToast } = useToast();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    synopsis: "",
    posterImage: "",
    backdropImage: "",
    trailerUrl: "",
    genre: "Action, Sci-Fi",
    releaseYear: 2025,
    duration: "1h 55m",
    rating: 8.5,
    maturityRating: "PG-13",
    priceTZS: 15000,
    priceSQ: 10,
    discount: 0,
    watchUrl: "",
    externalWatchUrl: "",
    isFeatured: false,
    isTrending: false,
    isPublished: true,
  });

  const loadMovies = async () => {
    try {
      setLoading(true);
      const res = await adminGetMovies(search, genreFilter);
      setMovies(res.items || []);
    } catch {
      showToast("Failed to load movies", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, [genreFilter]);

  const handleOpenAdd = () => {
    setEditingMovie(null);
    setFormData({
      title: "",
      slug: "",
      synopsis: "",
      posterImage: "",
      backdropImage: "",
      trailerUrl: "",
      genre: "Action, Sci-Fi",
      releaseYear: 2025,
      duration: "1h 55m",
      rating: 8.5,
      maturityRating: "PG-13",
      priceTZS: 15000,
      priceSQ: 10,
      discount: 0,
      watchUrl: "",
      externalWatchUrl: "",
      isFeatured: false,
      isTrending: false,
      isPublished: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      slug: movie.slug,
      synopsis: movie.synopsis,
      posterImage: movie.posterImage,
      backdropImage: movie.backdropImage || "",
      trailerUrl: movie.trailerUrl || "",
      genre: movie.genre,
      releaseYear: movie.releaseYear,
      duration: movie.duration,
      rating: movie.rating || 8.5,
      maturityRating: movie.maturityRating || "PG-13",
      priceTZS: movie.priceTZS,
      priceSQ: movie.priceSQ,
      discount: movie.discount || 0,
      watchUrl: movie.watchUrl || "",
      externalWatchUrl: movie.externalWatchUrl || "",
      isFeatured: movie.isFeatured,
      isTrending: movie.isTrending,
      isPublished: movie.isPublished,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.synopsis || !formData.posterImage) {
      showToast("Please fill in Title, Synopsis, and Poster Image", "error");
      return;
    }

    try {
      setSaving(true);
      if (editingMovie) {
        await adminUpdateMovie(editingMovie._id, formData);
        showToast("Movie updated successfully", "success");
      } else {
        await adminCreateMovie(formData);
        showToast("Movie created successfully", "success");
      }
      setModalOpen(false);
      loadMovies();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (movie: Movie) => {
    try {
      await adminUpdateMovie(movie._id, { isPublished: !movie.isPublished });
      showToast(`Movie ${movie.isPublished ? "unpublished" : "published"}`, "success");
      loadMovies();
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await adminDeleteMovie(id);
      showToast("Movie deleted successfully", "success");
      loadMovies();
    } catch {
      showToast("Failed to delete movie", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-emerald-400" />
            Cinema Movies Management
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage movies catalog, trailers, authorized stream links, and SQ pricing
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          Add New Movie
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search films..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadMovies()}
            className="w-full bg-[#0d1017] border border-border/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Genres</option>
          <option value="Action">Action</option>
          <option value="Sci-Fi">Sci-Fi</option>
          <option value="Drama">Drama</option>
          <option value="Thriller">Thriller</option>
          <option value="Comedy">Comedy</option>
          <option value="Horror">Horror</option>
        </select>

        <button
          onClick={loadMovies}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium transition"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#0d1017] border border-border/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 border-b border-border/60 text-zinc-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Film</th>
                <th className="py-3 px-4">Genre / Specs</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    Loading movies...
                  </td>
                </tr>
              ) : movies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No films found. Click &quot;Add New Movie&quot; to add one.
                  </td>
                </tr>
              ) : (
                movies.map((movie) => (
                  <tr key={movie._id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={movie.posterImage}
                          alt={movie.title}
                          className="w-10 h-14 object-cover rounded-md bg-zinc-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-xs">{movie.title}</p>
                          <p className="text-[11px] text-zinc-500 truncate">/{movie.slug}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {movie.isFeatured && (
                              <span className="text-[10px] text-emerald-400 font-bold">Featured</span>
                            )}
                            {movie.isTrending && (
                              <span className="text-[10px] text-amber-400 font-bold">Trending</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">{movie.genre}</p>
                      <p className="text-[11px] text-zinc-400">
                        {movie.releaseYear} · {movie.duration} · {movie.maturityRating}
                      </p>
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      <p className="font-bold text-emerald-400">{movie.priceSQ} SQ</p>
                      <p className="text-[11px] text-zinc-400">{movie.priceTZS.toLocaleString()} TZS</p>
                      {movie.discount > 0 && (
                        <span className="text-[10px] text-amber-400">-{movie.discount}% discount</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {movie.rating}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleTogglePublish(movie)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                          movie.isPublished
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {movie.isPublished ? (
                          <>
                            <Eye className="w-3 h-3" /> Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Draft
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(movie)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(movie._id, movie.title)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#0f121a] border border-border/80 p-6 shadow-2xl my-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Film className="w-5 h-5 text-emerald-400" />
              {editingMovie ? `Edit "${editingMovie.title}"` : "Add New Movie to Cinema"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Custom Slug (optional)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. neon-horizon"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Synopsis *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Poster Image URL *</label>
                  <input
                    type="text"
                    required
                    value={formData.posterImage}
                    onChange={(e) => setFormData({ ...formData, posterImage: e.target.value })}
                    placeholder="Vertical 3:4 poster"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Backdrop Image URL</label>
                  <input
                    type="text"
                    value={formData.backdropImage}
                    onChange={(e) => setFormData({ ...formData, backdropImage: e.target.value })}
                    placeholder="Widescreen 16:9 backdrop"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Genre(s)</label>
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder="Sci-Fi, Action, Thriller"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Release Year</label>
                  <input
                    type="number"
                    value={formData.releaseYear}
                    onChange={(e) => setFormData({ ...formData, releaseYear: Number(e.target.value) })}
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="2h 15m"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Price (SQ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceSQ}
                    onChange={(e) => setFormData({ ...formData, priceSQ: Number(e.target.value) })}
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Price (TZS)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceTZS}
                    onChange={(e) => setFormData({ ...formData, priceTZS: Number(e.target.value) })}
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Score (1-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Trailer URL (YouTube)</label>
                  <input
                    type="text"
                    value={formData.trailerUrl}
                    onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                    placeholder="https://youtube.com/..."
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Authorized Stream URL</label>
                  <input
                    type="text"
                    value={formData.watchUrl}
                    onChange={(e) => setFormData({ ...formData, watchUrl: e.target.value })}
                    placeholder="Authorized stream MP4 or player embed"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                  />
                  Featured in Hero Carousel
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formData.isTrending}
                    onChange={(e) => setFormData({ ...formData, isTrending: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                  />
                  Trending Shelf
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                  />
                  Published (Visible to public)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                >
                  {saving ? "Saving..." : editingMovie ? "Update Film" : "Create Film"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
