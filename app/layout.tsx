import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { Toaster }             from "sonner";
import { ThemeProvider }       from "@/components/providers/ThemeProvider";
import { CursorEffect }        from "@/components/animations/CursorEffect";
import { ErrorRevealProvider } from "@/lib/errors/error-context";
import { ErrorBoundary }       from "@/lib/errors/error-boundary";
import { getMaintenanceMode }  from "@/lib/data/settings";
import { MaintenancePage }     from "@/components/maintenance/MaintenancePage";
import { getSeoSettings }      from "@/lib/data/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolsbar.com"),
    title: {
      template: `%s | ${seo.ogSiteName} – Free Online Tools`,
      default:  seo.siteTitle,
    },
    description: seo.siteDescription,
    keywords: seo.siteKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    authors:    [{ name: "ToolsBar Team" }],
    creator:    seo.ogSiteName,
    publisher:  seo.ogSiteName,
    robots: {
      index: true, follow: true,
      googleBot: {
        index: true, follow: true,
        "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website", locale: "en_US",
      url: "https://toolsbar.com", siteName: seo.ogSiteName,
      title: seo.siteTitle,
      description: seo.siteDescription,
      images: [{ url: seo.ogImageUrl, width: 1200, height: 630, alt: seo.ogSiteName }],
    },
    twitter: {
      card: "summary_large_image",
      site: seo.ogTwitterHandle || undefined,
      title: seo.siteTitle,
      description: seo.siteDescription,
      images: [seo.ogImageUrl],
    },
    manifest: "/manifest.json",
    icons: {
      icon:  [{ url: "/favicon.ico" }, { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" }],
      apple: [{ url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    verification: {
      google: seo.googleVerification || undefined,
      other: seo.bingVerification ? { "msvalidate.01": seo.bingVerification } : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor:   "#010610",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ── Maintenance mode gate ─────────────────────────────────────────────────
  // When enabled by the admin (Settings → Maintenance Mode), every public
  // route renders the maintenance page instead of its normal content.
  // /admin/* is exempt so the admin can always log in and disable it again.
  // x-pathname is set by middleware.ts on every request (Server Components
  // have no access to usePathname()).
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isAdminRoute = pathname.startsWith("/admin");
  const maintenanceOn = isAdminRoute ? false : await getMaintenanceMode();
  const { googleAnalyticsId } = await getSeoSettings();

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased font-body bg-abyss text-foreground">
        {googleAnalyticsId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');`}
            </Script>
          </>
        )}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {/*
            Error Reveal System providers.
            ErrorRevealProvider: supplies the ON/OFF toggle to all error panels.
            ErrorBoundary: catches any React render error that slips past
            route-level error.tsx boundaries (e.g. errors inside providers).
          */}
          <ErrorRevealProvider>
            <ErrorBoundary>

              {/* Global grain texture overlay */}
              <div
                className="pointer-events-none fixed inset-0 z-[2] opacity-[0.025]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Custom cyberpunk cursor (desktop only) */}
              <CursorEffect />

              {maintenanceOn ? <MaintenancePage /> : children}

              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: "rgba(10, 15, 30, 0.95)",
                    border: "1px solid rgba(0, 245, 255, 0.2)",
                    color: "#e2e8f0",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.875rem",
                  },
                }}
              />

            </ErrorBoundary>
          </ErrorRevealProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}