import type { Metadata } from "next";
import { HistoryPageClient } from "@/components/tools/HistoryPageClient";

export const metadata: Metadata = {
  title: "My History & Favorites | ToolsBar",
  description: "View your recently used tools and saved favorites.",
  robots: { index: false },
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <div className="section-label mb-3">Personal</div>
          <h1 className="font-display text-3xl font-black text-white tracking-wider">
            MY HISTORY &amp; FAVORITES
          </h1>
          <p className="text-text-muted font-mono text-sm mt-2">
            All stored locally in your browser — never sent to our servers.
          </p>
        </div>
        <HistoryPageClient />
      </div>
    </div>
  );
}
