"use client";

/**
 * app/(marketing)/error.tsx
 *
 * Error boundary for the Marketing route group.
 * Catches errors thrown during:
 *   - Homepage rendering (/)
 *   - About page (/about)
 *   - Contact page (/contact)
 *   - Legal pages (/privacy-policy, /terms, /disclaimer, /cookie-policy)
 *   - Any marketing page component failure
 *
 * Preserves the site header/footer — only the page content segment resets.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[marketing/error.tsx] Marketing page error:", error);
    if (error.digest) console.error("[marketing/error.tsx] Digest:", error.digest);
  }, [error]);

  const route =
    typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <ErrorPanel
      error={error}
      reset={reset}
      route={route}
    />
  );
}