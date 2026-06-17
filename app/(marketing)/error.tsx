"use client";

/**
 * app/(marketing)/error.tsx
 *
 * Error boundary for the Marketing route group.
 * Part 5: Auto-logs marketing page errors.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

function autoLog(error: Error & { digest?: string }, route: string) {
  fetch("/api/errors/log", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorType:  error.name    || "MarketingError",
      message:    error.message || "Marketing page error",
      stackTrace: error.stack   ?? null,
      route,
    }),
  }).catch(() => {});
}

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[marketing/error.tsx] Marketing error:", error);
    const route = typeof window !== "undefined" ? window.location.pathname : "/";
    autoLog(error, route);
  }, [error]);

  const route = typeof window !== "undefined" ? window.location.pathname : "/";
  return <ErrorPanel error={error} reset={reset} route={route} />;
}