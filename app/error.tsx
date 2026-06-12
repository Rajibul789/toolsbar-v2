"use client";

/**
 * app/error.tsx
 *
 * Next.js route-level error boundary.
 * Catches errors in any route segment and its children.
 * Replaced generic crash page with the full Error Reveal Panel.
 *
 * Receives:
 *   error  — The thrown Error object (includes .digest for server errors)
 *   reset  — Function to re-render the segment and retry
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Always log to console so browser devtools capture it regardless of panel mode
  useEffect(() => {
    console.error("[app/error.tsx] Caught route error:", error);
    if (error.digest) {
      console.error("[app/error.tsx] Server digest:", error.digest);
    }
  }, [error]);

  return (
    <ErrorPanel
      error={error}
      reset={reset}
      // route auto-detected from window.location inside ErrorPanel
      // userId and userRole: Part 4 will inject these via context
    />
  );
}