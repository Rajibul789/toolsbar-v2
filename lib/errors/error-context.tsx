"use client";

/**
 * lib/errors/error-context.tsx
 *
 * Global Error Reveal Context.
 * Controls whether the full technical error panel is shown (ON)
 * or the professional user-friendly fallback (OFF).
 *
 * Part 1 default: ON (show real errors always).
 * Part 4 will add the admin toggle that persists this to the database.
 *
 * Storage: localStorage key "toolsbar_error_reveal"
 * Falls back to true (reveal) when key is missing or unreadable.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const STORAGE_KEY = "toolsbar_error_reveal";

interface ErrorRevealContextValue {
  /** Whether the full developer error panel is enabled */
  errorRevealEnabled: boolean;
  /** Toggle the panel on/off (persisted to localStorage, DB in Part 4) */
  setErrorRevealEnabled: (enabled: boolean) => void;
  /** Convenience toggle */
  toggleErrorReveal: () => void;
}

const ErrorRevealContext = createContext<ErrorRevealContextValue>({
  errorRevealEnabled: true,
  setErrorRevealEnabled: () => {},
  toggleErrorReveal: () => {},
});

export function ErrorRevealProvider({ children }: { children: ReactNode }) {
  // Default true — show full errors.
  // Part 4 will load the persisted value from Prisma on mount.
  const [errorRevealEnabled, setEnabled] = useState<boolean>(true);

  // Hydrate from localStorage on client
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setEnabled(stored === "true");
      }
    } catch {
      // localStorage unavailable (SSR, private browsing) — keep default
    }
  }, []);

  const setErrorRevealEnabled = useCallback((enabled: boolean) => {
    setEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // ignore storage failures
    }
  }, []);

  const toggleErrorReveal = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  return (
    <ErrorRevealContext.Provider
      value={{ errorRevealEnabled, setErrorRevealEnabled, toggleErrorReveal }}
    >
      {children}
    </ErrorRevealContext.Provider>
  );
}

export function useErrorReveal(): ErrorRevealContextValue {
  return useContext(ErrorRevealContext);
}