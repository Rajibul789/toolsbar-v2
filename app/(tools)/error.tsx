"use client";

/**
 * app/(tools)/error.tsx
 *
 * Error boundary for the Tools route group.
 * Part 5: Auto-logs tool execution, PDF, and image processing errors.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

function autoLog(error: Error & { digest?: string }, route: string, toolSlug: string | null) {
  fetch("/api/errors/log", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      errorType:  error.name    || "ToolError",
      message:    error.message || "Tool execution error",
      stackTrace: error.stack   ?? null,
      route,
      toolSlug,
    }),
  }).catch(() => {});
}

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const route    = typeof window !== "undefined" ? window.location.pathname : "/tools";
  const toolSlug = typeof window !== "undefined"
    ? window.location.pathname.match(/^\/tools\/([^/]+)/)?.[1] ?? null
    : null;

  useEffect(() => {
    console.error("[tools/error.tsx] Tool error:", error);
    autoLog(error, route, toolSlug);
  }, [error, route, toolSlug]);

  const enrichedError = Object.assign(error, { toolSlug });
  return <ErrorPanel error={enrichedError} reset={reset} route={route} />;
}