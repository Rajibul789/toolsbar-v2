"use client";

/**
 * app/(blog)/error.tsx
 *
 * Error boundary for the Blog route group.
 * Catches errors thrown during:
 *   - Blog post rendering (/blog/[slug])
 *   - Blog category pages (/blog/category/[slug])
 *   - Blog author pages (/blog/author/[slug])
 *   - Blog tag pages (/blog/tag/[slug])
 *   - Blog index page (/blog)
 *   - MDX / markdown rendering failures
 *   - Supabase image load failures
 *   - Blog post not found (404 handling)
 *
 * Extracts the blog slug from the URL for additional panel context.
 * Preserves the site header/footer — only the blog segment resets.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[blog/error.tsx] Blog error:", error);
    if (error.digest) console.error("[blog/error.tsx] Digest:", error.digest);
  }, [error]);

  const route =
    typeof window !== "undefined" ? window.location.pathname : "/blog";

  // Extract blog slug from URL: /blog/how-to-split-pdf → "how-to-split-pdf"
  const blogSlug =
    typeof window !== "undefined"
      ? window.location.pathname.match(/^\/blog\/([^/]+)/)?.[1] ?? null
      : null;

  const enrichedError = Object.assign(error, {
    blogSlug,
  });

  return (
    <ErrorPanel
      error={enrichedError}
      reset={reset}
      route={route}
    />
  );
}