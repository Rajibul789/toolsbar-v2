import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { MaintenancePage } from "@/components/maintenance/MaintenancePage";

export const metadata: Metadata = {
  title: "Under Maintenance | ToolsBar",
  description: "ToolsBar is temporarily down for maintenance. We'll be back shortly.",
  robots: { index: false, follow: false },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ToolsBar — Under Maintenance",
  description: "ToolsBar is temporarily offline for scheduled maintenance.",
};

/**
 * Directly-visitable preview route at /maintenance.
 * The actual site-wide gate lives in app/layout.tsx, which renders
 * the same <MaintenancePage /> component when maintenance mode is ON.
 */
export default function MaintenancePageRoute() {
  return (
    <>
      <JsonLd data={schema} />
      <MaintenancePage />
    </>
  );
}