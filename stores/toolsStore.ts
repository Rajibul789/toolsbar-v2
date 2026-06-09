import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentTool {
  slug: string;
  name: string;
  usedAt: number;
}

interface ToolsState {
  favorites:    string[];       // tool slugs
  recentTools:  RecentTool[];
  addFavorite:    (slug: string) => void;
  removeFavorite: (slug: string) => void;
  toggleFavorite: (slug: string) => void;
  isFavorite:     (slug: string) => boolean;
  addRecentTool:  (slug: string, name: string) => void;
  clearHistory:   () => void;
}

export const useToolsStore = create<ToolsState>()(
  persist(
    (set, get) => ({
      favorites:   [],
      recentTools: [],

      addFavorite: (slug) =>
        set((s) => ({
          favorites: s.favorites.includes(slug) ? s.favorites : [...s.favorites, slug],
        })),

      removeFavorite: (slug) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f !== slug) })),

      toggleFavorite: (slug) => {
        const { favorites, addFavorite, removeFavorite } = get();
        favorites.includes(slug) ? removeFavorite(slug) : addFavorite(slug);
      },

      isFavorite: (slug) => get().favorites.includes(slug),

      addRecentTool: (slug, name) =>
        set((s) => {
          const filtered = s.recentTools.filter((r) => r.slug !== slug);
          const updated = [{ slug, name, usedAt: Date.now() }, ...filtered].slice(0, 10);
          return { recentTools: updated };
        }),

      clearHistory: () => set({ recentTools: [] }),
    }),
    {
      name: "toolsbar-tools-store",
      partialize: (state) => ({
        favorites:   state.favorites,
        recentTools: state.recentTools,
      }),
    }
  )
);
