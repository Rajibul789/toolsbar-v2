"use client";

import { useToolsStore } from "@/stores/toolsStore";
import { toast } from "sonner";

export function useFavorites() {
  const { favorites, toggleFavorite, isFavorite } = useToolsStore();

  function handleToggle(slug: string, name: string) {
    const wasFav = isFavorite(slug);
    toggleFavorite(slug);
    toast(wasFav ? `Removed ${name} from favorites` : `Added ${name} to favorites`, {
      icon: wasFav ? "💔" : "❤️",
    });
  }

  return { favorites, toggleFavorite: handleToggle, isFavorite };
}
