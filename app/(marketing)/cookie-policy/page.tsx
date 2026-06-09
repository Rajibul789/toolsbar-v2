import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | ToolsBar",
  description: "ToolsBar Cookie Policy — what cookies we use and how to control them.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <div className="section-label mb-4">Legal</div>
          <h1 className="font-display text-3xl font-black text-white tracking-wider mb-2">COOKIE POLICY</h1>
          <p className="text-xs font-mono text-text-muted">Last updated: January 1, 2025</p>
        </div>

        <div className="prose-cyber space-y-5">
          <div className="glass-panel p-6">
            <h2>What are cookies?</h2>
            <p>Cookies are small text files that are placed on your device when you visit a website. They help the website remember your preferences and improve your experience. ToolsBar uses cookies sparingly and only where necessary.</p>
          </div>

          <div className="glass-panel p-6">
            <h2>Types of cookies we use</h2>

            <h3>Essential Cookies</h3>
            <p>These cookies are required for the website to function and cannot be disabled. They include session cookies for admin authentication. These cookies do not track your browsing activity on other sites.</p>

            <h3>Analytics Cookies (Optional)</h3>
            <p>We may use anonymized analytics cookies to understand how visitors interact with our website. All data is aggregated and does not identify individual users. You can opt out of analytics cookies without affecting site functionality.</p>

            <h3>Advertising Cookies (Google AdSense)</h3>
            <p>ToolsBar uses Google AdSense to display advertisements. Google uses cookies to serve ads based on your prior visits to our website and other websites. You can opt out of personalized advertising at <a href="https://www.google.com/settings/ads" className="text-neon-cyan">Google Ads Settings</a> or via the <a href="https://optout.networkadvertising.org/" className="text-neon-cyan">NAI opt-out page</a>.</p>

            <h3>LocalStorage (Not Cookies)</h3>
            <p>Some tools (like Text to PDF) use your browser's localStorage to save your work locally between sessions. This data stays on your device and is never sent to us. You can clear it by clearing your browser's local storage.</p>
          </div>

          <div className="glass-panel p-6">
            <h2>How to control cookies</h2>
            <p>You can control and delete cookies through your browser settings:</p>
            <ul>
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-neon-cyan" target="_blank" rel="noopener">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-neon-cyan" target="_blank" rel="noopener">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-neon-cyan" target="_blank" rel="noopener">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-neon-cyan" target="_blank" rel="noopener">Microsoft Edge</a></li>
            </ul>
            <p>Note that disabling cookies may affect some functionality of the site, particularly if you use the admin panel.</p>
          </div>

          <div className="glass-panel p-6">
            <h2>Contact</h2>
            <p>For questions about our use of cookies, contact us at <a href="mailto:hello@toolsbar.com" className="text-neon-cyan">hello@toolsbar.com</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
