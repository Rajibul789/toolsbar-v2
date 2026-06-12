import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster }             from "sonner";
import { ThemeProvider }       from "@/components/providers/ThemeProvider";
import { CursorEffect }        from "@/components/animations/CursorEffect";
import { ErrorRevealProvider } from "@/lib/errors/error-context";
import { ErrorBoundary }       from "@/lib/errors/error-boundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolsbar.com"),
  title: {
    template: "%s | ToolsBar – Free Online Tools",
    default:  "ToolsBar – Free Online PDF, Image & Developer Tools",
  },
  description:
    "ToolsBar provides 15+ free, privacy-first online tools for PDF processing, image editing, text conversion, and developer utilities — all running 100% in your browser.",
  keywords: [
    "free online tools","pdf tools","image compressor","pdf split","pdf merge",
    "word to pdf","image converter","hashtag generator","url shortener","browser tools",
    "ocr","qr scanner","text to pdf","pdf to text",
  ],
  authors:    [{ name: "ToolsBar Team" }],
  creator:    "ToolsBar",
  publisher:  "ToolsBar",
  robots: {
    index: true, follow: true,
    googleBot: {
      index: true, follow: true,
      "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website", locale: "en_US",
    url: "https://toolsbar.com", siteName: "ToolsBar",
    title: "ToolsBar – Free Online PDF, Image & Developer Tools",
    description: "15+ free privacy-first tools. No uploads. No signups. Just results.",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630, alt: "ToolsBar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ToolsBar – Free Online PDF, Image & Developer Tools",
    description: "15+ free privacy-first tools. No uploads. No signups.",
    images: ["/images/og-image.jpg"],
  },
  manifest: "/manifest.json",
  icons: {
    icon:  [{ url: "/favicon.ico" }, { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor:   "#010610",
  width:        "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased font-body bg-abyss text-foreground">
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

              {children}

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