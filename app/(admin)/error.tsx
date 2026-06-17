"use client";

/**
 * app/(admin)/error.tsx
 *
 * Error boundary for the entire Admin Panel route group.
 * Part 5: Auto-logs admin errors to ErrorLog table.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

function autoLog(error: Error & { digest?: string }, route: string) {
  fetch("/api/errors/log", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorType:  error.name    || "AdminError",
      message:    error.message || "Admin panel error",
      stackTrace: error.stack   ?? null,
      route,
    }),
  }).catch(() => {});
}

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/error.tsx] Admin panel error:", error);
    const route = typeof window !== "undefined" ? window.location.pathname : "/admin";
    autoLog(error, route);
  }, [error]);

  const route = typeof window !== "undefined" ? window.location.pathname : "/admin";
  return <ErrorPanel error={error} reset={reset} route={route} />;
}