export type ToolCategory =
  | "pdf-tools"
  | "image-tools"
  | "text-tools"
  | "social-tools"
  | "developer-tools";

export type NeonColor =
  | "cyan"
  | "green"
  | "purple"
  | "red"
  | "orange"
  | "yellow"
  | "pink"
  | "blue";

export type ProcessingMode = "browser" | "hybrid" | "server";

export interface ToolConfig {
  slug: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  category: ToolCategory;
  icon: string; // Lucide icon name
  accentColor: NeonColor;
  processingMode: ProcessingMode;
  maxFileSizeMb: number;
  acceptedTypes: string[];
  acceptedExtensions: string[];
  isNew?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  order: number;
  keywords: string[];
  howItWorks: string[];
  useCases: string[];
  faq: Array<{ question: string; answer: string }>;
}

export type ToolCategoryConfig = {
  id: ToolCategory;
  name: string;
  description: string;
  icon: string;
  color: NeonColor;
  order: number;
};

// ================================================================
// TOOL CATEGORIES
// ================================================================
export const TOOL_CATEGORIES: ToolCategoryConfig[] = [
  {
    id: "pdf-tools",
    name: "PDF Tools",
    description: "Split, merge, compress, and convert PDF files instantly.",
    icon: "FileText",
    color: "cyan",
    order: 1,
  },
  {
    id: "image-tools",
    name: "Image Tools",
    description: "Compress, convert, and transform any image format.",
    icon: "Image",
    color: "purple",
    order: 2,
  },
  {
    id: "text-tools",
    name: "Text & Document Tools",
    description: "Create, convert, and format text documents and PDFs.",
    icon: "FileEdit",
    color: "green",
    order: 3,
  },
  {
    id: "social-tools",
    name: "Social & Marketing",
    description: "Boost your content with hashtags, links, and more.",
    icon: "Share2",
    color: "pink",
    order: 4,
  },
  {
    id: "developer-tools",
    name: "Developer Tools",
    description: "Utilities built for builders. QR, CodePack, and beyond.",
    icon: "Terminal",
    color: "orange",
    order: 5,
  },
];

// ================================================================
// TOOLS REGISTRY
// ================================================================
export const TOOLS_CONFIG: ToolConfig[] = [
  // ======================== PDF TOOLS ========================
  {
    slug: "pdf-split",
    name: "PDF Split",
    shortDesc: "Extract individual pages or page ranges from any PDF file.",
    longDesc:
      "Our PDF Split tool lets you break any PDF into individual pages or custom page ranges — completely free, with no file uploads. Your document never leaves your device.",
    category: "pdf-tools",
    icon: "Scissors",
    accentColor: "cyan",
    processingMode: "hybrid",
    maxFileSizeMb: 50,
    acceptedTypes: ["application/pdf"],
    acceptedExtensions: [".pdf"],
    isPopular: true,
    isFeatured: true,
    order: 1,
    keywords: ["split pdf", "extract pdf pages", "pdf page extractor", "separate pdf"],
    howItWorks: [
      "Upload your PDF file by dragging it into the drop zone.",
      "Select the pages or ranges you want to extract.",
      "Click Split — processing happens entirely in your browser.",
      "Download individual pages or a zip of all selected pages.",
    ],
    useCases: [
      "Extract specific pages from a large report before sharing.",
      "Separate a multi-chapter ebook into individual chapter files.",
      "Pull out a single invoice from a combined financial PDF.",
    ],
    faq: [
      {
        question: "Is PDF Split completely free?",
        answer: "Yes. PDF Split is 100% free with no usage limits.",
      },
      {
        question: "Does my file get uploaded to a server?",
        answer:
          "For most files, splitting happens entirely in your browser. Only very large or complex files fall back to our secure processing server — files are deleted immediately after.",
      },
      {
        question: "What is the maximum PDF size I can split?",
        answer:
          "You can split PDFs up to 50 MB in size.",
      },
    ],
  },
  {
    slug: "pdf-merge",
    name: "PDF Merge",
    shortDesc: "Combine multiple PDF files into a single seamless document.",
    longDesc:
      "Drag in multiple PDFs, arrange them in any order, and merge into a single polished document — 100% browser-based, no file uploads needed.",
    category: "pdf-tools",
    icon: "GitMerge",
    accentColor: "purple",
    processingMode: "browser",
    maxFileSizeMb: 100,
    acceptedTypes: ["application/pdf"],
    acceptedExtensions: [".pdf"],
    isPopular: true,
    order: 2,
    keywords: ["merge pdf", "combine pdf", "join pdf files", "pdf combiner"],
    howItWorks: [
      "Upload two or more PDF files.",
      "Drag to reorder them as desired.",
      "Click Merge — all processing is in-browser.",
      "Download your combined PDF instantly.",
    ],
    useCases: [
      "Combine multiple reports into a single submission document.",
      "Merge scanned document pages into one PDF.",
      "Assemble a portfolio PDF from individual project files.",
    ],
    faq: [
      {
        question: "How many PDFs can I merge at once?",
        answer: "You can merge up to 20 PDF files in a single operation.",
      },
      {
        question: "Will the quality of my PDFs be affected?",
        answer:
          "No. PDF Merge combines files at the structural level — no re-rendering, no quality loss.",
      },
    ],
  },
  {
    slug: "pdf-compress",
    name: "PDF Compress",
    shortDesc: "Reduce PDF file size significantly without losing readability.",
    longDesc:
      "Our PDF Compress tool re-renders each page at optimized quality settings to dramatically reduce file size — great for email attachments and uploading to portals.",
    category: "pdf-tools",
    icon: "PackageMinus",
    accentColor: "orange",
    processingMode: "browser",
    maxFileSizeMb: 50,
    acceptedTypes: ["application/pdf"],
    acceptedExtensions: [".pdf"],
    isPopular: true,
    order: 3,
    keywords: ["compress pdf", "reduce pdf size", "shrink pdf", "pdf optimizer"],
    howItWorks: [
      "Upload your PDF file.",
      "Choose a compression level (light, balanced, maximum).",
      "Click Compress — processed entirely in your browser.",
      "Compare original vs compressed size, then download.",
    ],
    useCases: [
      "Shrink a PDF before attaching to an email.",
      "Reduce size for upload limits on government portals.",
      "Compress scanned documents for easier sharing.",
    ],
    faq: [
      {
        question: "How much can it reduce my PDF size?",
        answer:
          "Compression results vary by content. Image-heavy PDFs often compress 60–80%. Text-heavy PDFs may compress 20–40%.",
      },
    ],
  },
  {
    slug: "pdf-to-text",
    name: "PDF to Text",
    shortDesc: "Extract all readable text content from any PDF document.",
    longDesc:
      "Instantly pull all text from a PDF into clean, copyable plain text. Uses PDF.js to read text layer data directly — no OCR needed for standard PDFs.",
    category: "pdf-tools",
    icon: "FileOutput",
    accentColor: "green",
    processingMode: "browser",
    maxFileSizeMb: 30,
    acceptedTypes: ["application/pdf"],
    acceptedExtensions: [".pdf"],
    isNew: true,
    order: 4,
    keywords: ["pdf to text", "extract text from pdf", "pdf text extraction", "copy pdf text"],
    howItWorks: [
      "Upload your PDF file.",
      "Text is extracted instantly page by page.",
      "Review the extracted text in the preview panel.",
      "Copy to clipboard or download as a .txt file.",
    ],
    useCases: [
      "Extract text from a PDF resume for editing in Word.",
      "Pull contract content into a text editor for review.",
      "Convert a PDF article to plain text for summarizing.",
    ],
    faq: [
      {
        question: "Does it work on scanned PDFs?",
        answer:
          "Scanned PDFs that contain images of text (not a text layer) will return empty results. Use our Image to Word tool with OCR for scanned documents.",
      },
    ],
  },

  // ======================== IMAGE TOOLS ========================
  {
    slug: "image-compressor",
    name: "Image Compressor",
    shortDesc: "Compress JPG, PNG, and WebP images up to 80% smaller.",
    longDesc:
      "Reduce image file sizes dramatically while maintaining visual quality. Uses browser Canvas API for compression — no uploads, fully private.",
    category: "image-tools",
    icon: "ImageDown",
    accentColor: "purple",
    processingMode: "browser",
    maxFileSizeMb: 20,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
    acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    isPopular: true,
    order: 5,
    keywords: ["compress image", "reduce image size", "image optimizer", "jpg compressor"],
    howItWorks: [
      "Upload one or more images.",
      "Adjust the quality slider (default: 80%).",
      "See the before/after file size comparison.",
      "Download compressed images individually or as a zip.",
    ],
    useCases: [
      "Optimize product images for your e-commerce store.",
      "Compress photos before uploading to social media.",
      "Reduce blog images to improve page load speed.",
    ],
    faq: [
      {
        question: "Can I compress multiple images at once?",
        answer: "Yes — upload up to 10 images in one batch.",
      },
    ],
  },
  {
    slug: "image-converter",
    name: "Image Converter",
    shortDesc: "Convert images between JPG, PNG, WebP, BMP, and more.",
    longDesc:
      "Format-convert any image in your browser. Supports JPG, PNG, WebP, BMP, and GIF output — fast, free, and private.",
    category: "image-tools",
    icon: "RefreshCw",
    accentColor: "blue",
    processingMode: "browser",
    maxFileSizeMb: 20,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"],
    acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
    isPopular: true,
    order: 6,
    keywords: ["image converter", "jpg to png", "png to webp", "convert image format"],
    howItWorks: [
      "Upload your image file.",
      "Select the output format.",
      "Optionally adjust quality for lossy formats.",
      "Download the converted image.",
    ],
    useCases: [
      "Convert PNG to WebP for better web performance.",
      "Convert a GIF frame to JPG for editing.",
      "Convert BMP to PNG for lossless quality.",
    ],
    faq: [
      {
        question: "Does conversion reduce image quality?",
        answer:
          "Conversion to lossy formats (JPG, WebP) uses adjustable quality. PNG and BMP conversions are lossless.",
      },
    ],
  },
  {
    slug: "image-to-pdf",
    name: "Image to PDF",
    shortDesc: "Turn multiple images into a single polished PDF document.",
    longDesc:
      "Combine JPG, PNG, or WebP images into a properly-sized PDF. Reorder pages before exporting — all processed in your browser.",
    category: "image-tools",
    icon: "Images",
    accentColor: "cyan",
    processingMode: "browser",
    maxFileSizeMb: 50,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
    acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    order: 7,
    keywords: ["image to pdf", "photos to pdf", "jpg to pdf", "pictures to pdf"],
    howItWorks: [
      "Upload one or multiple images.",
      "Drag to reorder as desired.",
      "Choose page size (A4, Letter, or fit-to-image).",
      "Click Convert and download your PDF.",
    ],
    useCases: [
      "Combine scanned document photos into a PDF for submission.",
      "Create a photo album PDF for sharing.",
      "Compile product shots into a single PDF catalog.",
    ],
    faq: [],
  },
  {
    slug: "image-to-word",
    name: "Image to Word",
    shortDesc: "Extract text from images using OCR and save as a DOCX file.",
    longDesc:
      "Upload any image with text — receipts, scanned documents, whiteboards — and our OCR engine (Tesseract.js) reads it and exports a clean Word document.",
    category: "image-tools",
    icon: "ScanText",
    accentColor: "green",
    processingMode: "browser",
    maxFileSizeMb: 10,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
    acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    isNew: true,
    order: 8,
    keywords: ["image to word", "ocr", "extract text from image", "photo to word", "scanned document to word"],
    howItWorks: [
      "Upload an image containing text.",
      "OCR runs in your browser using Tesseract.js.",
      "Review the extracted text in the preview.",
      "Download as a .docx Word document.",
    ],
    useCases: [
      "Convert a photo of a whiteboard meeting into an editable document.",
      "Extract text from a scanned receipt or invoice.",
      "Turn a photographed handwritten note into a Word file.",
    ],
    faq: [
      {
        question: "How accurate is the OCR?",
        answer:
          "Accuracy is highest on clear, high-contrast images with standard fonts. Handwriting recognition accuracy varies.",
      },
      {
        question: "Does it support languages other than English?",
        answer:
          "Tesseract.js supports 100+ languages. The tool currently defaults to English — multi-language support is coming soon.",
      },
    ],
  },

  // ======================== TEXT TOOLS ========================
  {
    slug: "text-to-pdf",
    name: "Text to PDF",
    shortDesc: "Write and format rich Markdown documents, export as PDF.",
    longDesc:
      "A powerful in-browser document editor. Write in Markdown or rich text, see a live preview, and export to a beautifully formatted PDF. Auto-saves your work locally.",
    category: "text-tools",
    icon: "FileEdit",
    accentColor: "green",
    processingMode: "browser",
    maxFileSizeMb: 0,
    acceptedTypes: [],
    acceptedExtensions: [],
    isPopular: true,
    isFeatured: true,
    order: 9,
    keywords: ["text to pdf", "markdown to pdf", "create pdf online", "write pdf", "rich text pdf"],
    howItWorks: [
      "Write or paste your content into the editor.",
      "Use Markdown for formatting: **bold**, *italic*, headings, tables.",
      "See your document rendered live in the preview panel.",
      "Click Export PDF to download your formatted document.",
    ],
    useCases: [
      "Write a formatted report or proposal and export as PDF.",
      "Convert Markdown notes from Obsidian or Notion to PDF.",
      "Create a clean CV or cover letter directly in your browser.",
    ],
    faq: [
      {
        question: "Will my work be saved if I close the tab?",
        answer:
          "Yes — your content is auto-saved to your browser's localStorage every 30 seconds.",
      },
      {
        question: "What Markdown features are supported?",
        answer:
          "Headings, bold, italic, underline, tables, ordered and unordered lists, code blocks, blockquotes, and hyperlinks.",
      },
    ],
  },
  {
    slug: "txt-to-pdf",
    name: "TXT to PDF",
    shortDesc: "Upload a plain .txt file and convert it to a PDF instantly.",
    longDesc:
      "Simple, fast TXT to PDF conversion. Upload a plain text file, preview the content, and export as a clean PDF document — no formatting required.",
    category: "text-tools",
    icon: "FileType",
    accentColor: "yellow",
    processingMode: "browser",
    maxFileSizeMb: 5,
    acceptedTypes: ["text/plain"],
    acceptedExtensions: [".txt"],
    isNew: true,
    order: 10,
    keywords: ["txt to pdf", "text file to pdf", "convert txt file", "plain text to pdf"],
    howItWorks: [
      "Upload a .txt file or drag it into the drop zone.",
      "Preview the content in the viewer.",
      "Choose font size and page size.",
      "Click Convert and download your PDF.",
    ],
    useCases: [
      "Convert a log file to PDF for archiving.",
      "Turn a plain text novel draft into a PDF for sharing.",
      "Convert exported notes from terminal to PDF.",
    ],
    faq: [],
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    shortDesc: "Convert DOC and DOCX files to PDF. Upload, convert, download.",
    longDesc:
      "Upload a Microsoft Word document and convert it to PDF in your browser using mammoth.js and jsPDF. No Word installation required, no file uploads to servers.",
    category: "text-tools",
    icon: "FileOutput",
    accentColor: "blue",
    processingMode: "browser",
    maxFileSizeMb: 20,
    acceptedTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
    acceptedExtensions: [".docx", ".doc"],
    isPopular: true,
    order: 11,
    keywords: ["word to pdf", "docx to pdf", "doc to pdf", "convert word document"],
    howItWorks: [
      "Upload a .docx or .doc file.",
      "A preview of the converted content is shown.",
      "Click Convert to PDF.",
      "Download your PDF file.",
    ],
    useCases: [
      "Convert a Word resume to PDF before sending to employers.",
      "Turn a DOCX report into a PDF for distribution.",
      "Convert a Word contract to PDF for signing.",
    ],
    faq: [
      {
        question: "Is complex DOCX formatting preserved?",
        answer:
          "Basic formatting (headings, paragraphs, bold, italic, lists, tables) is preserved. Complex layouts with multi-column sections or advanced macros may not convert perfectly.",
      },
    ],
  },

  // ======================== SOCIAL TOOLS ========================
  {
    slug: "hashtag-generator",
    name: "Hashtag Generator",
    shortDesc: "Generate trending hashtags for Instagram, YouTube, and TikTok.",
    longDesc:
      "Enter a topic or paste your caption, and instantly receive optimized hashtag sets for Instagram, YouTube, and TikTok — organized by category and popularity tier.",
    category: "social-tools",
    icon: "Hash",
    accentColor: "pink",
    processingMode: "browser",
    maxFileSizeMb: 0,
    acceptedTypes: [],
    acceptedExtensions: [],
    isPopular: true,
    order: 12,
    keywords: ["hashtag generator", "instagram hashtags", "youtube tags", "tiktok hashtags"],
    howItWorks: [
      "Enter your topic, caption, or keywords.",
      "Select your target platform (Instagram / YouTube / TikTok).",
      "Click Generate for curated, tiered hashtag sets.",
      "Copy and paste directly to your post.",
    ],
    useCases: [
      "Find niche hashtags to boost Instagram post reach.",
      "Generate YouTube tags for better video discovery.",
      "Build a TikTok hashtag strategy for a content series.",
    ],
    faq: [],
  },
  {
    slug: "url-shortener",
    name: "URL Shortener",
    shortDesc: "Shorten long URLs into clean, shareable links instantly.",
    longDesc:
      "Powered by a Cloudflare Worker, ToolsBar URL Shortener creates clean, short links in milliseconds — no account required.",
    category: "social-tools",
    icon: "Link2",
    accentColor: "blue",
    processingMode: "server",
    maxFileSizeMb: 0,
    acceptedTypes: [],
    acceptedExtensions: [],
    order: 13,
    keywords: ["url shortener", "link shortener", "shorten url", "short link"],
    howItWorks: [
      "Paste your long URL into the input.",
      "Click Shorten.",
      "Copy the generated short link.",
      "Share it anywhere.",
    ],
    useCases: [
      "Shorten affiliate links before sharing on social media.",
      "Create clean URLs for print materials.",
      "Make long document share links more readable.",
    ],
    faq: [],
  },


  // ======================== PDF TO EXCEL ========================
  {
    slug: "pdf-to-excel",
    name: "PDF to Excel",
    shortDesc: "Extract text and table data from PDFs and export as an Excel spreadsheet.",
    longDesc: "Upload a PDF, extract all readable text page by page, and download as an .xlsx Excel file. Powered by pdfjs-dist and SheetJS — 100% browser-based.",
    category: "text-tools",
    icon: "Table",
    accentColor: "green",
    processingMode: "browser",
    maxFileSizeMb: 30,
    acceptedTypes: ["application/pdf"],
    acceptedExtensions: [".pdf"],
    isNew: true,
    order: 12,
    keywords: ["pdf to excel", "pdf to xlsx", "extract pdf table", "pdf spreadsheet"],
    howItWorks: [
      "Upload your PDF file.",
      "Text is extracted from every page using PDF.js.",
      "Content is structured as rows in a spreadsheet.",
      "Click Download to save the .xlsx file.",
    ],
    useCases: [
      "Extract a data table from a PDF report into Excel.",
      "Convert a PDF price list into an editable spreadsheet.",
      "Pull data from a PDF into a workbook for analysis.",
    ],
    faq: [
      { question: "Does it preserve table formatting?", answer: "Basic text and simple tables convert well. Complex multi-column layouts may need manual adjustment after export." },
    ],
  },

  // ======================== DEVELOPER TOOLS ========================
  {
    slug: "codepack-builder",
    name: "CodePack Builder",
    shortDesc: "Build and zip multi-file code projects directly in your browser.",
    longDesc:
      "Create a structured code project by adding files and folders in the browser, then download the whole thing as a ready-to-use ZIP archive — powered by JSZip.",
    category: "developer-tools",
    icon: "PackageOpen",
    accentColor: "orange",
    processingMode: "browser",
    maxFileSizeMb: 0,
    acceptedTypes: [],
    acceptedExtensions: [],
    order: 14,
    keywords: ["code packer", "zip code project", "project builder", "code archive"],
    howItWorks: [
      "Add folders and files to the project tree.",
      "Write or paste code into each file.",
      "Preview the project structure.",
      "Click Download ZIP to get your packaged project.",
    ],
    useCases: [
      "Package a quick code snippet project to share with a client.",
      "Create a starter template to send to a student.",
      "Archive a browser-only mini-project.",
    ],
    faq: [],
  },
  {
    slug: "qr-scanner",
    name: "QR Scanner",
    shortDesc: "Scan QR codes using your camera or by uploading an image.",
    longDesc:
      "Decode any QR code instantly in your browser using html5-qrcode. Use your device camera for live scanning or upload an image of a QR code.",
    category: "developer-tools",
    icon: "QrCode",
    accentColor: "green",
    processingMode: "browser",
    maxFileSizeMb: 5,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    isNew: true,
    order: 15,
    keywords: ["qr code scanner", "qr reader", "decode qr code", "scan qr code"],
    howItWorks: [
      "Choose: use camera for live scanning, or upload a QR code image.",
      "Point your camera at the QR code (if using camera mode).",
      "The decoded content appears instantly.",
      "Copy the decoded text or URL.",
    ],
    useCases: [
      "Quickly decode a QR code from a printed flyer or packaging.",
      "Check what URL a suspicious QR code resolves to before visiting.",
      "Extract contact info from a QR business card.",
    ],
    faq: [
      {
        question: "Do I need to give camera permission?",
        answer:
          "Camera mode requires camera permission. Image upload mode works without any camera access.",
      },
    ],
  },
];

// ================================================================
// HELPERS
// ================================================================

export function getToolBySlug(slug: string): ToolConfig | undefined {
  return TOOLS_CONFIG.find((t) => t.slug === slug);
}

export function getToolsByCategory(category: ToolCategory): ToolConfig[] {
  return TOOLS_CONFIG.filter((t) => t.category === category).sort(
    (a, b) => a.order - b.order
  );
}

export function getFeaturedTools(): ToolConfig[] {
  return TOOLS_CONFIG.filter((t) => t.isFeatured);
}

export function getPopularTools(limit = 6): ToolConfig[] {
  return TOOLS_CONFIG.filter((t) => t.isPopular).slice(0, limit);
}

export function getNewTools(): ToolConfig[] {
  return TOOLS_CONFIG.filter((t) => t.isNew);
}

export function searchTools(query: string): ToolConfig[] {
  const q = query.toLowerCase().trim();
  if (!q) return TOOLS_CONFIG;
  return TOOLS_CONFIG.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.shortDesc.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.includes(q))
  );
}

export const NEON_COLOR_MAP: Record<NeonColor, string> = {
  cyan:   "var(--neon-cyan)",
  green:  "var(--neon-green)",
  purple: "var(--neon-purple)",
  red:    "var(--neon-red)",
  orange: "var(--neon-orange)",
  yellow: "var(--neon-yellow)",
  pink:   "var(--neon-pink)",
  blue:   "var(--neon-blue)",
};

export const NEON_BG_CLASS: Record<NeonColor, string> = {
  cyan:   "rgba(0,245,255,0.08)",
  green:  "rgba(0,255,136,0.08)",
  purple: "rgba(191,0,255,0.08)",
  red:    "rgba(255,0,60,0.08)",
  orange: "rgba(255,102,0,0.08)",
  yellow: "rgba(255,204,0,0.08)",
  pink:   "rgba(255,0,170,0.08)",
  blue:   "rgba(0,102,255,0.08)",
};

export const NEON_BORDER_CLASS: Record<NeonColor, string> = {
  cyan:   "rgba(0,245,255,0.2)",
  green:  "rgba(0,255,136,0.2)",
  purple: "rgba(191,0,255,0.2)",
  red:    "rgba(255,0,60,0.2)",
  orange: "rgba(255,102,0,0.2)",
  yellow: "rgba(255,204,0,0.2)",
  pink:   "rgba(255,0,170,0.2)",
  blue:   "rgba(0,102,255,0.2)",
};
