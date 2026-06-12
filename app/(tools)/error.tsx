"use client";

/**
 * app/(tools)/error.tsx
 *
 * Error boundary for the Tools route group.
 * Catches errors thrown during:
 *   - Tool page rendering (/tools/[slug])
 *   - Tool category pages (/tool-category/[category])
 *   - PDF processing failures
 *   - Image processing failures
 *   - File conversion errors
 *   - Client-side tool execution errors
 *
 * Extracts the tool slug from the URL for additional context in the panel.
 * Preserves the site header/footer — only the tool page crashes.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[tools/error.tsx] Tool error:", error);
    if (error.digest) console.error("[tools/error.tsx] Digest:", error.digest);
  }, [error]);

  const route =
    typeof window !== "undefined" ? window.location.pathname : "/tools";

  // Extract tool slug from URL: /tools/pdf-split → "pdf-split"
  const toolSlug =
    typeof window !== "undefined"
      ? window.location.pathname.match(/^\/tools\/([^/]+)/)?.[1] ?? null
      : null;

  // Augment the error with the tool slug for the panel display
  const enrichedError = Object.assign(error, {
    toolSlug,
  });

  return (
    <ErrorPanel
      error={enrichedError}
      reset={reset}
      route={route}
    />
  );
}