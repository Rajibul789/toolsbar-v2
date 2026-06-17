"use client";

/**
 * app/(blog)/error.tsx
 *
 * Error boundary for the Blog route group.
 * Part 5: Auto-logs blog rendering and publishing errors.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

function autoLog(error: Error & { digest?: string }, route: string, blogSlug: string | null) {
  fetch("/api/errors/log", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorType:  error.name    || "BlogError",
      message:    error.message || "Blog rendering error",
      stackTrace: error.stack   ?? null,
      route,
      blogSlug,
    }),
  }).catch(() => {});
}

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const route    = typeof window !== "undefined" ? window.location.pathname : "/blog";
  const blogSlug = typeof window !== "undefined"
    ? window.location.pathname.match(/^\/blog\/([^/]+)/)?.[1] ?? null
    : null;

  useEffect(() => {
    console.error("[blog/error.tsx] Blog error:", error);
    autoLog(error, route, blogSlug);
  }, [error, route, blogSlug]);

  const enrichedError = Object.assign(error, { blogSlug });
  return <ErrorPanel error={enrichedError} reset={reset} route={route} />;
}