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

        // Exactly one modifier rule applies per shortcut:
        //  - meta: Cmd (macOS) or Ctrl (Windows/Linux)
        //  - ctrl: Ctrl only (previously ignored, so ctrl-only shortcuts never fired)
        //  - neither: no Cmd/Ctrl held, so plain keys don't hijack browser shortcuts
        const modifierMatch = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : shortcut.ctrl
            ? e.ctrlKey && !e.metaKey
            : !e.metaKey && !e.ctrlKey;
        // Shift is only enforced when a shortcut asks for it (some layouts need
        // Shift to type keys like "/", so it is otherwise ignored).
        const shiftMatch = shortcut.shift ? e.shiftKey : true;

        if (keyMatch && modifierMatch && shiftMatch) {
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