import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | ToolsBar",
  description: "ToolsBar disclaimer — limitations of liability and accuracy of our free online tools.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <div className="section-label mb-4">Legal</div>
          <h1 className="font-display text-3xl font-black text-white tracking-wider mb-2">DISCLAIMER</h1>
          <p className="text-xs font-mono text-text-muted">Last updated: January 1, 2025</p>
        </div>

        <div className="prose-cyber space-y-5">
          {[
            {
              title: "General Disclaimer",
              body: "The information and tools provided by ToolsBar are for general informational and utility purposes only. All tools are provided on an 'as is' basis without any guarantee of completeness, accuracy, timeliness, or of the results obtained from their use.",
            },
            {
              title: "Tool Accuracy",
              body: "While we strive to ensure all tools function correctly, ToolsBar cannot guarantee that outputs are error-free or suitable for all use cases. Always verify critical outputs, especially for legal, medical, or financial documents, before relying on them.",
            },
            {
              title: "File Conversion Limitations",
              body: "Document conversion tools (Word to PDF, Text to PDF, etc.) may not perfectly preserve all formatting from complex source documents. Conversions are provided as a convenience — we recommend reviewing converted files before official use.",
            },
            {
              title: "OCR Accuracy",
              body: "The Image to Word tool uses optical character recognition (Tesseract.js). OCR accuracy varies based on image quality, font type, and document complexity. Results should be reviewed and corrected as needed.",
            },
            {
              title: "Third-Party Links",
              body: "Our service may contain links to external websites. We have no control over the content of those sites and accept no responsibility for them or for any loss or damage that may arise from your use of them.",
            },
            {
              title: "No Professional Advice",
              body: "Nothing on ToolsBar constitutes professional legal, financial, medical, or other professional advice. Always consult qualified professionals for important decisions.",
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
