"use client";

/**
 * app/error.tsx
 *
 * Next.js route-level error boundary.
 * Part 5: Auto-logs to ErrorLog table via /api/errors/log.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

function autoLog(error: Error & { digest?: string }, route: string) {
  fetch("/api/errors/log", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorType:  error.name    || "RouteError",
      message:    error.message || "Unknown route error",
      stackTrace: error.stack   ?? null,
      route,
    }),
  }).catch(() => {});
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error.tsx] Route error:", error);
    const route = typeof window !== "undefined" ? window.location.pathname : "/";
    autoLog(error, route);
  }, [error]);

  return <ErrorPanel error={error} reset={reset} />;
}