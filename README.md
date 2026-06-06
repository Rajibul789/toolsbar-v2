# ToolsBar v2

**Premium cyberpunk-themed online tools platform built with Next.js 15.**

> 15+ free browser-based tools for PDF, images, text, and developers. No file uploads. No accounts. All processing in your browser.

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/toolsbar-v2.git
cd toolsbar-v2

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Set up the database
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin panel.

---

## Prerequisites

- Node.js 20+
- A Supabase project (free tier works) — [supabase.com](https://supabase.com)
- Your existing Render.com PDF split backend (already running)
- Your existing Cloudflare Worker for URL shortener (already running)

---

## Tech Stack

| Layer        | Technology                                    |
|--------------|-----------------------------------------------|
| Framework    | Next.js 15 (App Router)                       |
| Language     | TypeScript 5                                  |
| Styling      | Tailwind CSS + custom cyberpunk design system |
| Components   | Shadcn UI + Radix UI                          |
| Animations   | Framer Motion 11                              |
| Database     | PostgreSQL via Supabase + Prisma ORM          |
| Auth         | Custom JWT via httpOnly cookies               |
| File Upload  | react-dropzone                                |
| PDF          | pdf-lib, pdfjs-dist, jspdf                    |
| Images       | Browser Canvas API                            |
| OCR          | tesseract.js                                  |
| DOCX         | mammoth, docx                                 |
| ZIP          | jszip                                         |
| QR           | html5-qrcode                                  |
| Markdown     | react-markdown, @uiw/react-md-editor          |

---

## Project Structure

```
toolsbar-v2/
├── app/
│   ├── (marketing)/       # Homepage, About, Contact, Legal pages
│   ├── (tools)/           # Tool directory + individual tool pages
│   ├── (blog)/            # Blog listing, posts, categories, tags
│   ├── (admin)/           # Admin panel (protected)
│   └── api/               # API routes
├── components/
│   ├── animations/        # MatrixRain, CyberScanner, GlitchText, TypeWriter
│   ├── home/              # Homepage sections
│   ├── layout/            # Header, Footer
│   ├── tools/             # ToolCard, UploadZone, ResultReveal + implementations
│   ├── blog/              # Blog components
│   ├── admin/             # Admin UI components
│   └── seo/               # JsonLd, structured data
├── config/
│   ├── tools.config.ts    # Static tools registry (source of truth)
│   └── site.config.ts     # Site-wide constants
├── lib/
│   ├── utils.ts           # Utilities
│   └── db.ts              # Prisma client
├── stores/
│   └── toolsStore.ts      # Zustand: favorites + recent tools
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Initial data seeding
└── public/
    └── robots.txt
```

---

## Tools Included

### PDF Tools
| Tool | Processing | Library |
|------|-----------|---------|
| PDF Split | Hybrid (browser + server fallback) | pdf-lib + pdfjs-dist |
| PDF Merge | Browser | pdf-lib |
| PDF Compress | Browser | pdfjs-dist + jspdf |
| PDF to Text | Browser | pdfjs-dist |

### Image Tools
| Tool | Processing | Library |
|------|-----------|---------|
| Image Compressor | Browser | Canvas API |
| Image Converter | Browser | Canvas API |
| Image to PDF | Browser | jspdf |
| Image to Word (OCR) | Browser | tesseract.js + docx |

### Text Tools
| Tool | Processing | Library |
|------|-----------|---------|
| Text to PDF | Browser | @uiw/react-md-editor + jspdf + html2canvas |
| TXT to PDF | Browser | jspdf |
| Word to PDF | Browser | mammoth + jspdf + html2canvas |

### Social Tools
| Tool | Processing | |
|------|-----------|---|
| Hashtag Generator | Browser | Built-in database |
| URL Shortener | Cloudflare Worker | Via /api/url-shorten |

### Developer Tools
| Tool | Processing | Library |
|------|-----------|---------|
| CodePack Builder | Browser | jszip |
| QR Scanner | Browser | html5-qrcode |

---

## Admin Panel

Access at `/admin/login` with:
- Email: `admin@toolsbar.com`
- Password: Value of `ADMIN_INITIAL_PASSWORD` in `.env.local`

**Change your password immediately after first login.**

### Admin Features
- **Tool Manager**: Enable/disable tools, set featured, add NEW badge, reorder
- **Blog CMS**: Create/edit/delete posts with Markdown editor, draft/publish/schedule
- **Homepage Builder**: Configure featured tool slider, hero content
- **SEO Settings**: Global meta tags and schema markup
- **Category Manager**: Blog and tool categories

---

## Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string**
3. Copy the **Connection pooling** string → `DATABASE_URL`
4. Copy the **Direct connection** string → `DIRECT_URL`
5. Run `npx prisma db push` to create tables
6. Run `npx tsx prisma/seed.ts` to seed initial data

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# or via CLI:
vercel env add DATABASE_URL
vercel env add DIRECT_URL
# ... add all variables from .env.example
```

**Important**: Set `NEXTAUTH_SECRET` to a long random string in production.

---

## AdSense Integration

After AdSense approval:
1. Add your publisher ID to `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`
2. Add slot IDs for each placement
3. Uncomment the `<AdSlot />` components in:
   - `app/(marketing)/page.tsx` (homepage)
   - `app/(tools)/tools/[slug]/page.tsx` (tool pages)
   - Blog pages

---

## Adding a New Tool

1. **Add to tools registry** (`config/tools.config.ts`):
```typescript
{
  slug: "my-new-tool",
  name: "My New Tool",
  shortDesc: "Brief description",
  // ...rest of config
}
```

2. **Create the component** (`components/tools/implementations/MyNewTool.tsx`):
```typescript
export function MyNewTool() {
  // Use UploadZone, CyberScanner, ResultReveal
}
```

3. **Register it in the page** (`app/(tools)/tools/[slug]/page.tsx`):
```typescript
"my-new-tool": dynamic(() => import("@/components/tools/implementations/MyNewTool")),
```

4. **Sync to database**:
```bash
npx tsx prisma/seed.ts
```

No other changes needed. The tool appears automatically in navigation and search.

---

## License

MIT © ToolsBar
