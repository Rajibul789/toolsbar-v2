import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site.config";

interface ToolMetaOptions {
  name: string;
  slug: string;
  description: string;
  keywords: string[];
}

export function generateToolMeta({
  name,
  slug,
  description,
  keywords,
}: ToolMetaOptions): Metadata {
  const title = `${name} – Free Online Tool | ToolsBar`;
  const fullUrl = `${SITE_CONFIG.url}/tools/${slug}`;

  return {
    title,
    description,
    keywords: keywords.join(", "),
    alternates: { canonical: `/tools/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: fullUrl,
      siteName: SITE_CONFIG.name,
      images: [{ url: `${SITE_CONFIG.url}/images/og-tools.jpg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_CONFIG.url}/images/og-tools.jpg`],
    },
  };
}

interface BlogMetaOptions {
  title: string;
  slug: string;
  description: string;
  image?: string;
  publishedAt?: Date;
  author?: string;
}

export function generateBlogMeta({
  title,
  slug,
  description,
  image,
  publishedAt,
  author,
}: BlogMetaOptions): Metadata {
  const seoTitle = `${title} | ToolsBar Blog`;
  const url = `${SITE_CONFIG.url}/blog/${slug}`;
  const ogImage = image ?? `${SITE_CONFIG.url}/images/og-blog.jpg`;

  return {
    title: seoTitle,
    description,
    alternates: { canonical: `/blog/${slug}` },
    authors: author ? [{ name: author }] : undefined,
    openGraph: {
      title: seoTitle,
      description,
      type: "article",
      url,
      siteName: SITE_CONFIG.name,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      publishedTime: publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description,
      images: [ogImage],
    },
  };
}

export function buildToolSchema(opts: {
  name: string;
  slug: string;
  description: string;
  features: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    description: opts.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
    url: `${SITE_CONFIG.url}/tools/${opts.slug}`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: opts.features,
    provider: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  };
}

export function buildFaqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; href: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, href }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE_CONFIG.url}${href}`,
    })),
  };
}
