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
import { getFeaturedTools }    from "@/lib/data/tools";
import { getHomepageConfig }   from "@/lib/data/homepage";
import { getPublishedPosts }   from "@/lib/data/blog";
import { getSeoSettings }      from "@/lib/data/seo";

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

// Server component — fetches DB-backed featured tools, homepage config, and
// blog posts so admin changes (Tools, Homepage Builder, Blog) reflect without
// redeployment. Each admin route calls revalidateTag/revalidatePath on save.
export default async function HomePage() {
  const [featuredTools, homepage, blogData, seo] = await Promise.all([
    getFeaturedTools(),
    getHomepageConfig(),
    getPublishedPosts({ limit: 3 }),
    getSeoSettings(),
  ]);

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seo.orgName,
    url: seo.orgUrl,
    logo: "https://toolsbar.com/icons/icon-192.png",
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: seo.orgEmail },
  };

  return (
    <>
      <JsonLd data={websiteSchema} />
      <JsonLd data={orgSchema} />

      {/* 1. Full-screen hero with Matrix Rain + search */}
      {homepage.showHero && (
        <HeroSection headline={homepage.heroHeadline} typewriterLines={homepage.typewriterLines} />
      )}

      {/* 2. Recently used tools — client-only, from Zustand/localStorage */}
      {homepage.showRecentlyUsed && <RecentlyUsedSection />}

      {/* 3. Netflix-style featured tools carousel — DB-backed */}
      {homepage.showFeatured && <FeaturedToolsSlider serverTools={featuredTools} />}

      {/* 4. Popular Tools — highlighted with usage badges */}
      <PopularToolsSection />

      {/* 5. All tools by category */}
      {homepage.showToolsGrid && <ToolsGrid />}

      {/* 6. Why ToolsBar feature highlights */}
      {homepage.showWhyUs && <WhyChooseUs />}

      {/* 7. FAQ accordion */}
      {homepage.showFaq && <FAQSection />}

      {/* 8. Latest blog articles */}
      {homepage.showBlogPreview && <BlogPreviewSection posts={blogData.posts} />}
    </>
  );
}