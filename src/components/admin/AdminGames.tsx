import { useState, useEffect } from "react";
import {
  adminGetGames,
  adminCreateGame,
  adminUpdateGame,
  adminDeleteGame,
} from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import type { Game } from "@/types";
import {
  Gamepad2,
  Plus,
  Search,
  Trash2,
  Edit2,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";

export function AdminGames() {
  const { showToast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    coverImage: "",
    bannerImage: "",
    trailerUrl: "",
    category: "Action",
    platform: "PC / Android",
    priceTZS: 20000,
    priceSQ: 15,
    discount: 0,
    rating: 4.8,
    downloadUrl: "",
    externalStoreUrl: "",
    isFeatured: false,
    isPublished: true,
  });

  const loadGames = async () => {
    try {
      setLoading(true);
      const res = await adminGetGames(search, categoryFilter);
      setGames(res.items || []);
    } catch {
      showToast("Failed to load games", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, [categoryFilter]);

  const handleOpenAdd = () => {
    setEditingGame(null);
    setFormData({
      title: "",
      slug: "",
      description: "",
      coverImage: "",
      bannerImage: "",
      trailerUrl: "",
      category: "Action",
      platform: "PC / Android",
      priceTZS: 20000,
      priceSQ: 15,
      discount: 0,
      rating: 4.8,
      downloadUrl: "",
      externalStoreUrl: "",
      isFeatured: false,
      isPublished: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      title: game.title,
      slug: game.slug,
      description: game.description,
      coverImage: game.coverImage,
      bannerImage: game.bannerImage || "",
      trailerUrl: game.trailerUrl || "",
      category: game.category,
      platform: game.platform,
      priceTZS: game.priceTZS,
      priceSQ: game.priceSQ,
      discount: game.discount || 0,
      rating: game.rating || 4.8,
      downloadUrl: game.downloadUrl || "",
      externalStoreUrl: game.externalStoreUrl || "",
      isFeatured: game.isFeatured,
      isPublished: game.isPublished,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.coverImage) {
      showToast("Please fill in Title, Description, and Cover Image", "error");
      return;
    }

    try {
      setSaving(true);
      if (editingGame) {
        await adminUpdateGame(editingGame._id, formData);
        showToast("Game updated successfully", "success");
      } else {
        await adminCreateGame(formData);
        showToast("Game created successfully", "success");
      }
      setModalOpen(false);
      loadGames();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (game: Game) => {
    try {
      await adminUpdateGame(game._id, { isPublished: !game.isPublished });
      showToast(`Game ${game.isPublished ? "unpublished" : "published"}`, "success");
      loadGames();
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await adminDeleteGame(id);
      showToast("Game deleted successfully", "success");
      loadGames();
    } catch {
      showToast("Failed to delete game", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
            Games Catalog Management
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage games, cover art, trailers, SQ/TZS pricing, and download links
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          Add New Game
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadGames()}
            className="w-full bg-[#0d1017] border border-border/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Categories</option>
          <option value="Action">Action</option>
          <option value="Adventure">Adventure</option>
          <option value="RPG">RPG</option>
          <option value="Strategy">Strategy</option>
          <option value="Racing">Racing</option>
          <option value="Sports">Sports</option>
        </select>

        <button
          onClick={loadGames}
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
                <th className="py-3 px-4">Game</th>
                <th className="py-3 px-4">Category / Platform</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    Loading games...
                  </td>
                </tr>
              ) : games.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No games found. Click &quot;Add New Game&quot; to create one.
                  </td>
                </tr>
              ) : (
                games.map((game) => (
                  <tr key={game._id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={game.coverImage}
                          alt={game.title}
                          className="w-10 h-14 object-cover rounded-md bg-zinc-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-xs">{game.title}</p>
                          <p className="text-[11px] text-zinc-500 truncate">/{game.slug}</p>
                          {game.isFeatured && (
                            <span className="inline-block mt-0.5 text-[10px] text-emerald-400 font-bold">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">{game.category}</p>
                      <p className="text-[11px] text-zinc-400">{game.platform}</p>
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      <p className="font-bold text-emerald-400">{game.priceSQ} SQ</p>
                      <p className="text-[11px] text-zinc-400">{game.priceTZS.toLocaleString()} TZS</p>
                      {game.discount > 0 && (
                        <span className="text-[10px] text-amber-400">-{game.discount}% discount</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {game.rating}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleTogglePublish(game)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                          game.isPublished
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {game.isPublished ? (
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
                          onClick={() => handleOpenEdit(game)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(game._id, game.title)}
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
              <Gamepad2 className="w-5 h-5 text-emerald-400" />
              {editingGame ? `Edit "${editingGame.title}"` : "Add New Game to Store"}
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
                    placeholder="e.g. cyber-odyssey"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Cover Image URL *</label>
                  <input
                    type="text"
                    required
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="https://... or /src/assets/..."
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Banner Image URL</label>
                  <input
                    type="text"
                    value={formData.bannerImage}
                    onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                    placeholder="Landscape 16:9 banner"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Action RPG, Strategy, etc."
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Platform</label>
                  <input
                    type="text"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    placeholder="PC, Android, etc."
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

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
                  <label className="text-xs text-zinc-400 block mb-1">Score (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Download URL (optional)</label>
                  <input
                    type="text"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                    placeholder="https://... direct file installer"
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Official Store URL (optional)</label>
                  <input
                    type="text"
                    value={formData.externalStoreUrl}
                    onChange={(e) => setFormData({ ...formData, externalStoreUrl: e.target.value })}
                    placeholder="https://store.steampowered.com/..."
                    className="w-full bg-[#0d1017] border border-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
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
                  {saving ? "Saving..." : editingGame ? "Update Game" : "Create Game"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
