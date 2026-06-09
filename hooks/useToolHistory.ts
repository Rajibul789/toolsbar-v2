"use client";

import { useToolsStore } from "@/stores/toolsStore";

export function useToolHistory() {
  const { recentTools, addRecentTool, clearHistory } = useToolsStore();

  return {
    recentTools: recentTools.slice(0, 8), // Cap to 8
    trackTool: addRecentTool,
    clearHistory,
  };
}
