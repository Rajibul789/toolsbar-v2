import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ToolsBar",
  description: "ToolsBar Terms of Service — rules and guidelines for using our free online tools.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <div className="section-label mb-4">Legal</div>
          <h1 className="font-display text-3xl font-black text-white tracking-wider mb-2">TERMS OF SERVICE</h1>
          <p className="text-xs font-mono text-text-muted">Last updated: January 1, 2025</p>
        </div>

        <div className="prose-cyber space-y-6">
          {[
            {
              title: "1. Acceptance of Terms",
              body: "By accessing and using ToolsBar (toolsbar.com), you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services.",
            },
            {
              title: "2. Description of Service",
              body: "ToolsBar provides free, browser-based online tools for PDF processing, image editing, document conversion, and developer utilities. Most tools process files locally in your browser. Some features may use server-side processing with immediate file deletion.",
            },
            {
              title: "3. Acceptable Use",
              body: "You agree to use ToolsBar only for lawful purposes. You must not: (a) upload files containing malware or harmful code; (b) attempt to circumvent security measures; (c) use the service to process files you do not have rights to; (d) engage in activities that disrupt or damage the service.",
            },
            {
              title: "4. Intellectual Property",
              body: "ToolsBar and its original content, features, and functionality are owned by ToolsBar and protected by international copyright laws. You retain all rights to files you process using our tools. We claim no ownership over your files.",
            },
            {
              title: "5. Disclaimer of Warranties",
              body: "ToolsBar is provided 'as is' and 'as available' without any warranties, expressed or implied. We do not guarantee that the service will be error-free, uninterrupted, or that results will meet your specific requirements. Use the service at your own risk.",
            },
            {
              title: "6. Limitation of Liability",
              body: "To the maximum extent permitted by law, ToolsBar shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service, including loss of data or profits.",
            },
            {
              title: "7. File Processing",
              body: "Browser-based tools process files entirely on your device — we never receive these files. For server-side processing (e.g. large PDF splits), files are transmitted over encrypted HTTPS connections and permanently deleted immediately after processing. We make no guarantees about file output accuracy for all document types.",
            },
            {
              title: "8. Third-Party Services",
              body: "ToolsBar uses third-party services including Google AdSense, Cloudflare, and Render.com. These services are governed by their own terms of service and privacy policies.",
            },
            {
              title: "9. Modifications to Service",
              body: "We reserve the right to modify or discontinue the service at any time without notice. We are not liable to you or any third party for any modification, suspension, or discontinuance of the service.",
            },
            {
              title: "10. Governing Law",
              body: "These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.",
            },
            {
              title: "11. Contact",
              body: "For questions about these Terms, contact us at hello@toolsbar.com.",
            },
          ].map(({ title, body }) => (
            <div key={title} className="glass-panel p-6">
              <h2 className="font-display text-sm font-bold text-neon-cyan mb-3 tracking-widest">{title.toUpperCase()}</h2>
              <p className="text-sm font-mono text-text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
