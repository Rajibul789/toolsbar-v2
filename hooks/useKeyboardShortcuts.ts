"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Shortcut {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(extraShortcuts: Shortcut[] = []) {
  const router = useRouter();

  const defaultShortcuts: Shortcut[] = [
    {
      key: "k",
      meta: true,
      action: () => router.push("/tools"),
      description: "Open tool search",
    },
    {
      key: "/",
      action: () => router.push("/tools"),
      description: "Go to tools directory",
    },
    {
      key: "h",
      meta: true,
      action: () => router.push("/"),
      description: "Go home",
    },
    {
      key: "b",
      meta: true,
      action: () => router.push("/blog"),
      description: "Go to blog",
    },
  ];

  const allShortcuts = [...defaultShortcuts, ...extraShortcuts];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      for (const shortcut of allShortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const metaMatch = shortcut.meta ? e.metaKey || e.ctrlKey : true;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !shortcut.ctrl || e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !shortcut.shift || true;

        if (keyMatch && (shortcut.meta ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey) && shiftMatch) {
          if (shortcut.meta || shortcut.ctrl) e.preventDefault();
          shortcut.action();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allShortcuts]);

  return allShortcuts;
}
