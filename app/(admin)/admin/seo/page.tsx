import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "SEO Settings" };

const SEO_FIELDS = [
  {
    group: "Global Defaults",
    fields: [
      { key: "site_title",         label: "Site Title",              value: "ToolsBar – Free Online PDF, Image & Developer Tools", type: "text" },
      { key: "site_description",   label: "Site Meta Description",   value: "15+ free online tools for PDF, images, and documents. 100% browser-based.", type: "textarea" },
      { key: "site_keywords",      label: "Global Keywords",         value: "free online tools, pdf tools, image compressor, word to pdf", type: "text" },
    ],
  },
  {
    group: "Open Graph",
    fields: [
      { key: "og_site_name",       label: "OG Site Name",            value: "ToolsBar", type: "text" },
      { key: "og_image_url",       label: "Default OG Image URL",    value: "/images/og-image.jpg", type: "text" },
      { key: "og_twitter_handle",  label: "Twitter @Handle",         value: "@toolsbar", type: "text" },
    ],
  },
  {
    group: "Verification",
    fields: [
      { key: "google_verification",       label: "Google Search Console Code", value: "", type: "text" },
      { key: "bing_verification",         label: "Bing Webmaster Code",        value: "", type: "text" },
      { key: "google_analytics_id",       label: "GA4 Measurement ID",         value: "", type: "text" },
    ],
  },
  {
    group: "Schema.org",
    fields: [
      { key: "org_name",    label: "Organization Name",    value: "ToolsBar", type: "text" },
      { key: "org_url",     label: "Organization URL",     value: "https://toolsbar.com", type: "text" },
      { key: "org_email",   label: "Contact Email",        value: "hello@toolsbar.com", type: "text" },
    ],
  },
];

export default function AdminSeoPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.25)" }}
        >
          <TrendingUp className="w-5 h-5 text-neon-orange" />
        </div>
        <div>
          <h1 className="font-display text-xl font-black text-white tracking-widest">SEO SETTINGS</h1>
          <p className="text-xs font-mono text-text-muted">
            Global metadata, schema.org markup, and verification codes
          </p>
        </div>
      </div>

      <div className="space-y-8 max-w-2xl">
        {SEO_FIELDS.map(({ group, fields }) => (
          <div key={group}>
            <h2 className="font-display text-xs font-bold tracking-widest text-neon-orange uppercase mb-4">
              {group}
            </h2>
            <div className="glass-panel p-6 space-y-5">
              {fields.map(({ key, label, value, type }) => (
                <div key={key}>
                  <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
                    {label}
                  </label>
                  {type === "textarea" ? (
                    <textarea
                      name={key}
                      defaultValue={value}
                      rows={3}
                      className="input-cyber w-full text-sm resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      name={key}
                      defaultValue={value}
                      className="input-cyber w-full text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="btn-neon-green text-sm font-mono px-6 py-3">
          Save All SEO Settings
        </button>

        {/* Tips */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(255,102,0,0.04)", border: "1px solid rgba(255,102,0,0.12)" }}
        >
          <h3 className="text-xs font-mono font-semibold text-neon-orange mb-3 uppercase tracking-wider">
            📡 SEO Checklist
          </h3>
          <ul className="space-y-1.5">
            {[
              "Sitemap submitted to Google Search Console",
              "robots.txt verified (blocks /admin and /api/auth)",
              "All tool pages have unique title + description",
              "JSON-LD schema present on homepage, tool pages, and blog posts",
              "Core Web Vitals passing (check PageSpeed Insights)",
              "Internal links from blog posts to related tools",
              "15+ high-quality blog posts published before AdSense application",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs font-mono text-text-muted">
                <span className="text-neon-orange mt-0.5">▸</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
