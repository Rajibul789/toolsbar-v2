"use client";

/**
 * app/global-error.tsx
 *
 * Next.js Global Error Handler.
 * Catches errors thrown in the ROOT layout (app/layout.tsx) and above.
 * This is the last resort error boundary for the entire application.
 *
 * IMPORTANT:
 *   - Must render its own <html> and <body> tags (replaces the entire layout).
 *   - Cannot rely on providers from layout.tsx (they may have crashed).
 *   - Uses only inline styles — globals.css may not have loaded.
 *   - ErrorRevealProvider is instantiated here independently.
 */

import { ErrorRevealProvider } from "@/lib/errors/error-context";
import { ErrorPanel } from "@/lib/errors/error-panel";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error — ToolsBar</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { background: #000; color: #fff; }
        `}</style>
      </head>
      <body>
        {/*
          Provide the context independently — layout providers are unavailable
          because this error may have originated FROM the layout itself.
        */}
        <ErrorRevealProvider>
          <ErrorPanel
            error={error}
            reset={reset}
          />
        </ErrorRevealProvider>
      </body>
    </html>
  );
}