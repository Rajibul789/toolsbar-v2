import type { Metadata } from "next";
import { HeroSection }         from "@/components/home/HeroSection";
import { FeaturedToolsSlider } from "@/components/home/FeaturedToolsSlider";
import { PopularToolsSection } from "@/components/home/PopularToolsSection";
import { ToolsGrid }           from "@/components/home/ToolsGrid";
import { WhyChooseUs }         from "@/components/home/WhyChooseUs";
import { FAQSection }          from "@/components/home/FAQSection";
import { BlogPreviewSection }  from "@/components/home/BlogPreviewSection";
import { RecentlyUsedSection } from "@/components/home/RecentlyUsedSection";
import { JsonLd }              from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "ToolsBar – Free Online PDF, Image & Developer Tools",
  description:
    "15+ free online tools for PDF split, merge, compress, image conversion, Word to PDF, hashtag generation, and more. 100% browser-based — no file uploads, no accounts.",
  alternates: { canonical: "/" },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ToolsBar",
  url: "https://toolsbar.com",
  description: "Free online tools for PDF, images, text conversion, and developers.",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: "https://toolsbar.com/tools?q={search_term_string}" },
    "query-input": "required name=search_term_string",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ToolsBar",
  url: "https://toolsbar.com",
  logo: "https://toolsbar.com/icons/icon-192.png",
  contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "hello@toolsbar.com" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteSchema} />
      <JsonLd data={orgSchema} />

      {/* 1. Full-screen hero with Matrix Rain + search */}
      <HeroSection />

      {/* 2. Recently used tools — client-only, from Zustand/localStorage */}
      <RecentlyUsedSection />

      {/* 3. Netflix-style featured tools carousel */}
      <FeaturedToolsSlider />

      {/* 4. Popular Tools — highlighted with usage badges */}
      <PopularToolsSection />

      {/* 5. All tools by category */}
      <ToolsGrid />

      {/* 6. Why ToolsBar feature highlights */}
      <WhyChooseUs />

      {/* 7. FAQ accordion */}
      <FAQSection />

      {/* 8. Latest blog articles */}
      <BlogPreviewSection />
    </>
  );
}
