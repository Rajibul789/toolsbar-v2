"use client";

/**
 * lib/errors/error-context.tsx
 *
 * Global Error Reveal Context — Part 4 upgrade.
 *
 * Toggle controls whether the full technical error panel is shown (ON)
 * or the professional user-friendly fallback is shown (OFF).
 *
 * Persistence (Part 4):
 *   1. On mount → fetches current value from GET /api/admin/settings/error-reveal
 *   2. On change (admin toggle) → PATCHes /api/admin/settings/error-reveal + DB
 *   3. localStorage acts as a fast client-side cache to prevent flicker on navigation
 *
 * Default: true (show real errors) — safe for new installs, changed by admin in Settings.
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
const API_ENDPOINT = "/api/admin/settings/error-reveal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorRevealContextValue {
  /** Whether the full developer error panel is enabled */
  errorRevealEnabled: boolean;
  /** Whether the DB value is currently being loaded */
  isLoading: boolean;
  /**
   * Set the toggle — persists to DB (admin only, call from settings page).
   * Returns true on success, false on failure.
   */
  setErrorRevealEnabled: (enabled: boolean) => Promise<boolean>;
  /** Convenience toggle */
  toggleErrorReveal: () => Promise<boolean>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ErrorRevealContext = createContext<ErrorRevealContextValue>({
  errorRevealEnabled:    true,
  isLoading:             true,
  setErrorRevealEnabled: async () => false,
  toggleErrorReveal:     async () => false,
});

// ─── Cache helpers ────────────────────────────────────────────────────────────

function readCache(): boolean | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v !== null ? v === "true" : null;
  } catch {
    return null;
  }
}

function writeCache(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {}
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ErrorRevealProvider({ children }: { children: ReactNode }) {
  // Always initialize as true on both server and client to avoid hydration mismatch.
  // localStorage is unavailable during SSR — reading it in useState lazy initializer
  // would cause a hydration mismatch if the cached value is false.
  const [enabled,   setEnabled]   = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount: first apply cache instantly (prevents flicker), then confirm from DB
  useEffect(() => {
    let cancelled = false;

    // Step 1 — instant cache hydration (synchronous, no network)
    const cached = readCache();
    if (cached !== null && !cancelled) {
      setEnabled(cached);
    }

    // Step 2 — authoritative DB value (async)
    async function loadFromDB() {
      try {
        const res = await fetch(API_ENDPOINT, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { enabled: boolean };
        if (!cancelled) {
          setEnabled(data.enabled);
          writeCache(data.enabled);
        }
      } catch {
        // DB unavailable — keep localStorage / default value
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFromDB();
    return () => { cancelled = true; };
  }, []);

  // ── Set enabled — persists to DB ───────────────────────────────────────────
  const setErrorRevealEnabled = useCallback(async (value: boolean): Promise<boolean> => {
    // Optimistic update
    setEnabled(value);
    writeCache(value);

    try {
      const res = await fetch(API_ENDPOINT, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ enabled: value }),
      });

      if (!res.ok) {
        // Revert on failure
        const prev = !value;
        setEnabled(prev);
        writeCache(prev);
        return false;
      }

      return true;
    } catch {
      // Revert on network error
      const prev = !value;
      setEnabled(prev);
      writeCache(prev);
      return false;
    }
  }, []);

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const toggleErrorReveal = useCallback(async (): Promise<boolean> => {
    const next = !enabled;
    return setErrorRevealEnabled(next);
  }, [enabled, setErrorRevealEnabled]);

  return (
    <ErrorRevealContext.Provider
      value={{ errorRevealEnabled: enabled, isLoading, setErrorRevealEnabled, toggleErrorReveal }}
    >
      {children}
    </ErrorRevealContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useErrorReveal(): ErrorRevealContextValue {
  return useContext(ErrorRevealContext);
}