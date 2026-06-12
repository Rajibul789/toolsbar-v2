"use client";

/**
 * app/(admin)/error.tsx
 *
 * Error boundary for the entire Admin Panel route group.
 * Catches errors thrown in: /admin/*, /admin/tools, /admin/blog,
 * /admin/settings, /admin/categories, /admin/tags, /admin/homepage, /admin/seo.
 *
 * Admin errors ALWAYS show the full developer panel regardless of the
 * errorRevealEnabled toggle — admins need technical details to diagnose issues.
 * (Toggle behaviour wired in Part 4.)
 *
 * Preserves the admin layout (sidebar, header) — only the crashed page
 * segment resets, not the surrounding navigation.
 */

import { useEffect } from "react";
import { ErrorPanel } from "@/lib/errors/error-panel";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/error.tsx] Admin panel error:", error);
    if (error.digest) console.error("[admin/error.tsx] Digest:", error.digest);
  }, [error]);

  // Derive route context from window (safe — error.tsx is always "use client")
  const route =
    typeof window !== "undefined" ? window.location.pathname : "/admin";

  return (
    <ErrorPanel
      error={error}
      reset={reset}
      route={route}
      // userRole injected by session context in Part 4
    />
  );
}