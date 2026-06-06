/** @type {import('next-sitemap').IConfig} */
const { TOOLS_CONFIG } = require("./config/tools.config");

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://toolsbar.com",
  generateRobotsTxt: false, // we manage robots.txt manually
  generateIndexSitemap: true,
  changefreq: "weekly",
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ["/admin", "/admin/*", "/api/*"],

  additionalPaths: async (config) => {
    const toolPaths = TOOLS_CONFIG.map((t) => ({
      loc: `/tools/${t.slug}`,
      priority: 0.9,
      changefreq: "monthly",
      lastmod: new Date().toISOString(),
    }));

    const staticPaths = [
      { loc: "/",               priority: 1.0,  changefreq: "daily" },
      { loc: "/tools",          priority: 0.95, changefreq: "weekly" },
      { loc: "/blog",           priority: 0.85, changefreq: "weekly" },
      { loc: "/about",          priority: 0.6,  changefreq: "monthly" },
      { loc: "/contact",        priority: 0.6,  changefreq: "monthly" },
      { loc: "/privacy-policy", priority: 0.4,  changefreq: "yearly" },
      { loc: "/terms",          priority: 0.4,  changefreq: "yearly" },
      { loc: "/disclaimer",     priority: 0.4,  changefreq: "yearly" },
      { loc: "/cookie-policy",  priority: 0.4,  changefreq: "yearly" },
    ].map((p) => ({ ...p, lastmod: new Date().toISOString() }));

    return [...staticPaths, ...toolPaths];
  },
};
