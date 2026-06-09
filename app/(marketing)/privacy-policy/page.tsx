import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ToolsBar",
  description: "ToolsBar Privacy Policy — how we handle your data, cookies, and file processing.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  const updated = "January 1, 2025";

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <div className="section-label mb-4">Legal</div>
          <h1 className="font-display text-3xl font-black text-white tracking-wider mb-2">
            PRIVACY POLICY
          </h1>
          <p className="text-xs font-mono text-text-muted">Last updated: {updated}</p>
        </div>

        <div className="prose-cyber space-y-8">
          <div className="glass-panel p-6" style={{ borderColor: "rgba(0,245,255,0.1)" }}>
            <h2>Overview</h2>
            <p>
              ToolsBar ("we", "us", "our") is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, and safeguard information when you use our
              website at toolsbar.com (the "Service").
            </p>
            <p>
              <strong>Key point:</strong> Most of our tools process your files entirely within
              your browser. In these cases, your files are never transmitted to our servers and
              we have no access to them whatsoever.
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Information We Collect</h2>
            <h3>Automatically Collected Information</h3>
            <p>
              When you visit ToolsBar, we may automatically collect certain information, including:
            </p>
            <ul>
              <li>IP address (anonymized for analytics)</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Pages visited and time spent</li>
              <li>Referring URL</li>
            </ul>

            <h3>Files and Documents</h3>
            <p>
              For tools that process files entirely in your browser (the majority of our tools),
              your files remain on your device at all times. We do not receive, store, or have
              access to these files.
            </p>
            <p>
              For the PDF Split tool, when browser-side processing is not feasible due to file
              size or complexity, files may be temporarily transmitted to our processing server.
              These files are automatically and permanently deleted immediately after processing
              is complete. We do not retain, analyze, or share these files.
            </p>

            <h3>LocalStorage Data</h3>
            <p>
              Some tools (like Text to PDF) use your browser's localStorage to save your work
              locally. This data stays on your device and is never sent to us.
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Google AdSense and Advertising</h2>
            <p>
              ToolsBar uses Google AdSense to display advertisements. Google, as a third-party
              vendor, uses cookies to serve ads based on your prior visits to our website and
              other websites on the Internet.
            </p>
            <p>
              Google's use of advertising cookies enables it and its partners to serve ads to
              you based on your visit to our site and/or other sites on the Internet. You may
              opt out of personalized advertising by visiting{" "}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
                Google Ads Settings
              </a>
              .
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service
              and hold certain information. Cookies are files with a small amount of data stored
              on your device.
            </p>
            <p>Types of cookies we use:</p>
            <ul>
              <li><strong>Essential cookies:</strong> Required for the Service to function (e.g., admin session cookies).</li>
              <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website.</li>
              <li><strong>Advertising cookies:</strong> Used by Google AdSense to serve relevant ads.</li>
            </ul>
            <p>
              You can instruct your browser to refuse all cookies or to indicate when a cookie
              is being sent. See our Cookie Policy for more details.
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Third-Party Services</h2>
            <p>Our Service uses the following third-party services:</p>
            <ul>
              <li><strong>Google AdSense</strong> — advertising network</li>
              <li><strong>Google Analytics</strong> — website analytics (anonymized)</li>
              <li><strong>Cloudflare</strong> — URL Shortener (Worker)</li>
              <li><strong>Render.com</strong> — PDF split processing server (files deleted immediately)</li>
            </ul>
            <p>
              Each third-party service has its own Privacy Policy governing the use of your
              information. We encourage you to review these policies.
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Data Retention</h2>
            <p>
              We retain analytics data in anonymized, aggregated form. Files processed via our
              server-side PDF Split fallback are permanently deleted immediately after download
              is complete — typically within seconds.
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Your Rights (GDPR / CCPA)</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:hello@toolsbar.com">hello@toolsbar.com</a>.
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Children's Privacy</h2>
            <p>
              ToolsBar does not knowingly collect personal information from children under 13.
              If you believe we have inadvertently collected such information, please contact us
              immediately.
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of changes
              by updating the "Last updated" date at the top of this page. We encourage you to
              review this policy periodically.
            </p>
          </div>

          <div className="glass-panel p-6">
            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p>
              <a href="mailto:hello@toolsbar.com">hello@toolsbar.com</a>
              <br />
              ToolsBar — toolsbar.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
