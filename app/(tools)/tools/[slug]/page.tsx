import { notFound } from "next/navigation";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getToolBySlug, TOOLS_CONFIG } from "@/config/tools.config";
import { ToolPageShell } from "@/components/tools/ToolPageShell";

// Loading skeleton shown while each tool chunk loads
function ToolSkeleton() {
  return (
    <div className="space-y-4 py-8 animate-pulse">
      {[90, 70, 85, 55].map((w, i) => (
        <div key={i} className="h-3 rounded-full"
          style={{ width: `${w}%`, background: "rgba(0,245,255,0.07)" }} />
      ))}
      <div className="h-32 rounded-xl mt-6" style={{ background: "rgba(0,245,255,0.04)" }} />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ComponentType<any>;

// All tool components — loaded on-demand (zero bundle cost until visited)
const TOOL_COMPONENTS: Record<string, AnyComponent> = {
  "pdf-split":         dynamic(() => import("@/components/tools/implementations/PdfSplit").then((m) => m.PdfSplit),               { loading: ToolSkeleton }),
  "pdf-merge":         dynamic(() => import("@/components/tools/implementations/PdfMerge").then((m) => m.PdfMerge),               { loading: ToolSkeleton }),
  "pdf-compress":      dynamic(() => import("@/components/tools/implementations/PdfCompress").then((m) => m.PdfCompress),         { loading: ToolSkeleton }),
  "pdf-to-text":       dynamic(() => import("@/components/tools/implementations/PdfToText").then((m) => m.PdfToText),             { loading: ToolSkeleton }),
  "pdf-to-excel":      dynamic(() => import("@/components/tools/implementations/PdfToExcel").then((m) => m.PdfToExcel),           { loading: ToolSkeleton }),
  "image-compressor":  dynamic(() => import("@/components/tools/implementations/ImageCompressor").then((m) => m.ImageCompressor), { loading: ToolSkeleton }),
  "image-converter":   dynamic(() => import("@/components/tools/implementations/ImageConverter").then((m) => m.ImageConverter),   { loading: ToolSkeleton }),
  "image-to-pdf":      dynamic(() => import("@/components/tools/implementations/ImageToPdf").then((m) => m.ImageToPdf),           { loading: ToolSkeleton }),
  "image-to-word":     dynamic(() => import("@/components/tools/implementations/ImageToWord").then((m) => m.ImageToWord),         { loading: ToolSkeleton }),
  "text-to-pdf":       dynamic(() => import("@/components/tools/implementations/TextToPdf").then((m) => m.TextToPdf),             { loading: ToolSkeleton }),
  "txt-to-pdf":        dynamic(() => import("@/components/tools/implementations/TxtToPdf").then((m) => m.TxtToPdf),               { loading: ToolSkeleton }),
  "word-to-pdf":       dynamic(() => import("@/components/tools/implementations/WordToPdf").then((m) => m.WordToPdf),             { loading: ToolSkeleton }),
  "hashtag-generator": dynamic(() => import("@/components/tools/implementations/HashtagGenerator").then((m) => m.HashtagGenerator),{ loading: ToolSkeleton }),
  "url-shortener":     dynamic(() => import("@/components/tools/implementations/UrlShortener").then((m) => m.UrlShortener),       { loading: ToolSkeleton }),
  "codepack-builder":  dynamic(() => import("@/components/tools/implementations/CodePackBuilder").then((m) => m.CodePackBuilder),  { loading: ToolSkeleton }),
  "qr-scanner":        dynamic(() => import("@/components/tools/implementations/QrScanner").then((m) => m.QrScanner),             { loading: ToolSkeleton }),
};

// ── Static params for SSG ────────────────────────────────────────────────────
export function generateStaticParams() {
  return TOOLS_CONFIG.map((t) => ({ slug: t.slug }));
}

// ── SEO metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return {};

  const title       = `${tool.name} – Free Online Tool | ToolsBar`;
  const description = `${tool.shortDesc} Free, browser-based — no file uploads, no account required.`;

  return {
    title,
    description,
    keywords: tool.keywords.join(", "),
    alternates: { canonical: `/tools/${slug}` },
    openGraph: { title, description, type: "website", url: `/tools/${slug}` },
    twitter:   { card: "summary", title, description },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  // 404 if tool not found in registry
  if (!tool) return notFound();

  // 404 if no implementation exists for this slug
  const ToolComponent = TOOL_COMPONENTS[slug];
  if (!ToolComponent) return notFound();

  return (
    <ToolPageShell tool={tool}>
      <ToolComponent />
    </ToolPageShell>
  );
}
