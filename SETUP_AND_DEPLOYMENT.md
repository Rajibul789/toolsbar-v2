# ToolsBar v2 — Complete Setup & Deployment Guide

## TABLE OF CONTENTS

1. [Prerequisites](#1-prerequisites)
2. [GitHub Setup](#2-github-setup)
3. [GitHub Codespaces Setup](#3-github-codespaces-setup)
4. [Database Setup (Supabase)](#4-database-setup-supabase)
5. [Environment Variables](#5-environment-variables)
6. [Running Commands in Codespaces](#6-running-commands-in-codespaces)
7. [Vercel Deployment](#7-vercel-deployment)
8. [Admin Panel Guide](#8-admin-panel-guide)
9. [Admin Login Credentials](#9-admin-login-credentials)
10. [Post-Deployment Checklist](#10-post-deployment-checklist)

---

## 1. PREREQUISITES

You need free accounts on these platforms (all free, no credit card):

| Platform | Purpose | Sign Up |
|---|---|---|
| **GitHub** | Store your code | github.com |
| **Supabase** | Database (PostgreSQL) | supabase.com |
| **Vercel** | Hosting + domain | vercel.com |

---

## 2. GITHUB SETUP

### Step 1 — Create a GitHub account
Go to **github.com** and sign up if you don't have an account.

### Step 2 — Create a new repository

1. Click the **+** icon in the top right → **New repository**
2. Fill in:
   - **Repository name:** `toolsbar-v2`
   - **Description:** `Premium cyberpunk tools platform`
   - **Visibility:** `Public` (required for free Codespaces minutes)
   - **Do NOT** check "Add README" (you already have one)
3. Click **Create repository**

### Step 3 — Upload your code

GitHub will show you a page with upload instructions. Since you have a ZIP file:

**Option A — Drag and Drop (easiest)**
1. On the empty repository page, click **uploading an existing file**
2. Unzip `toolsbar-v2.zip` on your computer
3. Drag the entire `toolsbar-v2` folder contents into the GitHub upload area
4. Scroll down, click **Commit changes**

**Option B — GitHub Desktop App**
1. Download GitHub Desktop from **desktop.github.com**
2. Sign in with your GitHub account
3. Click **File → Add Local Repository**
4. Select the unzipped `toolsbar-v2` folder
5. Click **Publish repository** → make sure "Keep this code private" is unchecked
6. Click **Publish Repository**

---

## 3. GITHUB CODESPACES SETUP

Codespaces gives you a full VS Code environment in your browser — no local setup needed.

### Step 1 — Open Codespaces

1. Go to your `toolsbar-v2` repository on GitHub
2. Click the green **< > Code** button
3. Click the **Codespaces** tab
4. Click **Create codespace on main**
5. Wait ~2 minutes for the environment to build

> **Free tier:** GitHub gives you **120 core-hours/month** free on a 2-core machine.
> This is enough for development. Your codespace auto-pauses after 30 minutes of inactivity.

### Step 2 — The Codespaces environment

You will see a VS Code editor in your browser. The terminal is at the bottom.
All commands from this guide are run in that terminal.

---

## 4. DATABASE SETUP (SUPABASE)

### Step 1 — Create a Supabase project

1. Go to **supabase.com** and sign up (free)
2. Click **New Project**
3. Fill in:
   - **Organization:** your username (auto-created)
   - **Name:** `toolsbar-v2`
   - **Database Password:** create a strong password — **SAVE THIS**
   - **Region:** choose the closest to your users
4. Click **Create new project** — wait ~2 minutes

### Step 2 — Get your connection strings

1. In your Supabase project, go to **Settings → Database**
2. Scroll to **Connection string** section
3. Select **URI** format
4. You need TWO strings:

**Connection Pooling (for `DATABASE_URL`):**
- Click the **Transaction** mode tab (port 6543)
- Copy the URI — it looks like:
  `postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`

**Direct Connection (for `DIRECT_URL`):**
- Click the **Session** mode tab OR scroll to find the direct connection
- It looks like:
  `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`

> **Important:** Replace `[YOUR-PASSWORD]` in the URLs with the database password you set in Step 1.

### Step 3 — Get Supabase API keys

1. Go to **Settings → API**
2. Copy:
   - **Project URL** → your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → your `SUPABASE_SERVICE_ROLE_KEY`

### Step 4 — Create Storage buckets (for blog images)

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name: `blog-images`, set to **Public**
4. Click **Create bucket**

---

## 5. ENVIRONMENT VARIABLES

In your Codespace terminal, create the `.env.local` file:

```bash
cp .env.example .env.local
```

Then open `.env.local` in the editor and fill in every value:

```env
# Site URL (use your Vercel URL after deployment)
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app

# Database — from Supabase (Step 4 above)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# Supabase API keys
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Admin security — CHANGE THIS to something strong
NEXTAUTH_SECRET=use-openssl-rand-base64-32-to-generate-this
ADMIN_INITIAL_PASSWORD=YourStrongPassword@2025!

# URL Shortener (your existing Cloudflare Worker)
URL_SHORTENER_WORKER_URL=https://url.kazirajibulislam567567.workers.dev

# AdSense (leave empty until you apply)
NEXT_PUBLIC_ADSENSE_PUBLISHER_ID=
```

**Generate a secure NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Copy the output and paste it as the value of `NEXTAUTH_SECRET`.

---

## 6. RUNNING COMMANDS IN CODESPACES

Open the terminal in Codespaces (View → Terminal, or Ctrl+`).
Run these commands **in order**:

### Step 1 — Install dependencies
```bash
npm install
```
> This installs all packages from `package.json`. Takes 2–3 minutes on first run.

### Step 2 — Generate Prisma client
```bash
npm run db:generate
```
> Creates TypeScript types from your database schema.

### Step 3 — Push schema to Supabase
```bash
npm run db:push
```
> Creates all the database tables in your Supabase PostgreSQL.
> You should see: `✔ Generated Prisma Client`

### Step 4 — Seed the database (creates admin account + tool data)
```bash
npm run db:seed
```
> This creates:
> - Your admin account (`admin@toolsbar.com` with your chosen password)
> - All tool categories
> - All 15+ tool entries
> - Default homepage config

You should see output like:
```
✓ Admin: admin@toolsbar.com
  ✓ Category: PDF Tools
  ✓ Category: Image Tools
  ...
  ✓ Tool: PDF Split
  ✓ Tool: PDF Merge
  ...
✅ Seed complete!
```

### Step 5 — Start the development server
```bash
npm run dev
```
> The server starts at port 3000.
> Codespaces will show a popup: **"Open in Browser"** — click it.
> Or go to the **Ports** tab at the bottom and click the 🌐 globe icon next to port 3000.

### Step 6 — Test the admin panel locally
With the dev server running, visit:
```
https://[your-codespace-name]-3000.app.github.dev/admin/login
```

Log in with:
- **Email:** `admin@toolsbar.com`
- **Password:** the value you set for `ADMIN_INITIAL_PASSWORD`

---

## 7. VERCEL DEPLOYMENT

### Step 1 — Connect GitHub to Vercel

1. Go to **vercel.com** and sign up with your GitHub account
2. Click **Add New... → Project**
3. Find your `toolsbar-v2` repository and click **Import**

### Step 2 — Configure the project

On the configuration page:
- **Framework Preset:** Next.js (auto-detected ✅)
- **Root Directory:** `./` (leave as is)
- **Build Command:** `npm run build` (auto-detected ✅)
- **Output Directory:** `.next` (auto-detected ✅)
- **Node.js Version:** Select **20.x**

### Step 3 — Add environment variables

**This is the most important step.** Click **Environment Variables** and add each one:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` ← use your Vercel subdomain |
| `DATABASE_URL` | Your Supabase pooling connection string |
| `DIRECT_URL` | Your Supabase direct connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXTAUTH_SECRET` | The random string you generated |
| `ADMIN_INITIAL_PASSWORD` | Your chosen admin password |
| `URL_SHORTENER_WORKER_URL` | Your Cloudflare Worker URL |

> **Tip:** You can add all variables at once by clicking the **import .env** button and uploading your `.env.local` file.

### Step 4 — Deploy

Click **Deploy**. Vercel will:
1. Install dependencies
2. Run `npm run build`
3. Run `npm run postbuild` (generates sitemap)
4. Deploy to `your-project.vercel.app`

First deployment takes ~3 minutes. You'll see a live URL like:
```
https://toolsbar-v2.vercel.app
```

### Step 5 — Update NEXT_PUBLIC_SITE_URL

After deployment:
1. In Vercel dashboard → your project → **Settings → Environment Variables**
2. Update `NEXT_PUBLIC_SITE_URL` to your actual Vercel URL
3. Go to **Deployments** → click **Redeploy** → **Redeploy without cache**

### Step 6 — Verify deployment

Visit your Vercel URL and check:
- ✅ Homepage loads with Matrix Rain animation
- ✅ Tools page shows all 15+ tools
- ✅ `/admin/login` page loads
- ✅ Admin login works with your credentials

---

## 8. ADMIN PANEL GUIDE

### Accessing the admin panel

URL: `https://your-project.vercel.app/admin`

If not logged in, you will be automatically redirected to:
`https://your-project.vercel.app/admin/login`

The admin panel is protected by middleware — no unauthenticated access to any `/admin` route.

### Admin panel sections

| Section | URL | What you can do |
|---|---|---|
| **Dashboard** | `/admin` | Overview stats, quick links |
| **Tool Manager** | `/admin/tools` | Enable/disable tools, set featured ⭐, add NEW badge, reorder |
| **Blog** | `/admin/blog` | View all posts, published/draft status, views |
| **New Post** | `/admin/blog/new` | Full MDX editor with SEO fields, FAQ builder |
| **Homepage** | `/admin/homepage` | Control featured slider, hero content, section visibility |
| **Categories** | `/admin/categories` | Create/edit/delete blog categories |
| **Tags** | `/admin/tags` | Manage blog tags |
| **SEO** | `/admin/seo` | Global meta tags, schema, analytics IDs |
| **Settings** | `/admin/settings` | Change password, session duration, maintenance mode |

### Featuring a tool (appears in the hero slider)

1. Go to `/admin/tools`
2. Find the tool you want to feature
3. Click the ⭐ star button → turns yellow = featured
4. The tool automatically appears in the Netflix-style hero slider on the homepage
5. Go to `/admin/homepage` to set the slider order and custom headline

### Publishing a blog post

1. Go to `/admin/blog/new`
2. Fill in:
   - **Title** — SEO-optimized, 50-60 characters
   - **Excerpt** — 150-160 characters
   - **Content** — write in Markdown in the editor
   - **Category** — select from dropdown
   - **SEO fields** — meta title, description, keywords
   - **Related Tool** — link the post to a specific tool
   - **FAQ** — add Q&A pairs (generates JSON-LD schema automatically)
3. Select **Publish Now** or **Draft** in the top-right dropdown
4. Click **Save Post**

---

## 9. ADMIN LOGIN CREDENTIALS

### Are credentials hardcoded?

**No.** Admin credentials are NOT hardcoded anywhere in the source code.

Here is exactly how they work:

```
Your ADMIN_INITIAL_PASSWORD env variable
         ↓
  npm run db:seed
         ↓
  bcrypt.hash(password, 12)  ← salted, one-way hash
         ↓
  Stored in Supabase database
  (admins table → passwordHash column)
         ↓
  Login: bcrypt.compare(input, hash)
         ↓
  If match → create session token → set httpOnly cookie
```

### What this means:

1. **The plain-text password never touches the database** — only the bcrypt hash is stored
2. **The hash cannot be reversed** — even if someone accessed your database, they cannot recover the password
3. **The source code contains no passwords** — it is safe to make your GitHub repo public
4. **Changing the password:**
   - Go to `/admin/settings` → Change Password form
   - Or: update `ADMIN_INITIAL_PASSWORD` in Vercel env vars and re-run the seed script

### Session management

- Admin sessions use a **random 32-byte token** stored in an **httpOnly cookie**
- Cookies are inaccessible to JavaScript (XSS-safe)
- Sessions expire after **7 days** by default
- Sessions are stored in the `admin_sessions` database table
- Logging out immediately deletes the session from the database

### If you forget your admin password

Option 1 — Reset via Supabase dashboard:
```sql
-- Run this in Supabase → SQL Editor
-- First install bcrypt extension if not present
-- Then update with a new hash

UPDATE admins 
SET "passwordHash" = '$2a$12$NEW_BCRYPT_HASH_HERE'
WHERE email = 'admin@toolsbar.com';
```

Option 2 — Re-seed with new password:
```bash
# In Codespaces terminal:
# 1. Update ADMIN_INITIAL_PASSWORD in .env.local
# 2. Run:
npm run db:seed
# The admin will be upserted with the new password
```

Option 3 — Generate hash directly:
```bash
# In Codespaces terminal:
node -e "const b=require('bcryptjs');b.hash('YourNewPassword',12).then(h=>console.log(h))"
# Copy the output hash and update it in the database via Supabase SQL editor
```

---

## 10. POST-DEPLOYMENT CHECKLIST

After your site is live on Vercel, complete these steps in order:

### SEO & Search Console
- [ ] Submit `https://your-project.vercel.app/sitemap.xml` to Google Search Console
- [ ] Submit `https://your-project.vercel.app/sitemap.xml` to Bing Webmaster Tools
- [ ] Verify no crawl errors in Search Console
- [ ] Check robots.txt is accessible at `/robots.txt`

### Content (required before AdSense application)
- [ ] Write and publish 15+ original blog posts (one per tool + some guides)
- [ ] All legal pages have real, original content (About, Privacy, Terms, Disclaimer, Cookie Policy)
- [ ] All tool pages have content (descriptions are pre-filled from config)
- [ ] Contact page is working (test the form)

### AdSense Application
- [ ] Verify site has been live for at least 2 weeks
- [ ] Verify 15+ pages of original content exist
- [ ] Apply at **adsense.google.com**
- [ ] After approval: add your publisher ID and slot IDs to Vercel env vars
- [ ] Uncomment the `<AdSlot />` components in:
  - `app/(marketing)/page.tsx`
  - `app/(tools)/tools/[slug]/page.tsx`
- [ ] Redeploy

### Performance
- [ ] Run Lighthouse audit on your Vercel URL (target: 90+)
- [ ] Check Core Web Vitals in Google Search Console
- [ ] Verify all images have alt text

### Security
- [ ] Change admin password from the default immediately after first login
- [ ] Verify `/admin` routes redirect to login when not authenticated
- [ ] Confirm environment variables are not exposed to the browser (check browser Network tab)

---

## QUICK REFERENCE — ALL COMMANDS

```bash
# Install dependencies
npm install

# Database setup (run once)
npm run db:generate    # Generate Prisma types
npm run db:push        # Create tables in Supabase
npm run db:seed        # Seed admin + tools + categories

# Development
npm run dev            # Start dev server at localhost:3000

# Production build (Vercel does this automatically)
npm run build          # Build Next.js + generate sitemap
npm start              # Start production server

# Database utilities
npm run db:studio      # Open Prisma Studio (visual DB browser)
npm run db:migrate     # Create a new migration (advanced)

# Generate a secure secret
openssl rand -base64 32
```

---

## COMMON ISSUES & SOLUTIONS

**Issue:** `PrismaClientInitializationError` on deploy
**Fix:** Check that `DATABASE_URL` and `DIRECT_URL` are set in Vercel env vars and the Supabase database is accessible.

**Issue:** Admin login says "Invalid credentials"
**Fix:** Make sure you ran `npm run db:seed` after setting `ADMIN_INITIAL_PASSWORD`. The password must be seeded into the database — changing the env var alone does nothing.

**Issue:** Build fails with `Cannot find module 'tailwindcss-animate'`
**Fix:** Run `npm install` again — this package is in `package.json` and will be installed.

**Issue:** PDF Split not working
**Fix:** The tool uses the internal Next.js API route `/api/pdf/split` which uses `pdf-lib`. No external service needed. Check browser console for errors.

**Issue:** URL Shortener returns error
**Fix:** Verify `URL_SHORTENER_WORKER_URL` is set correctly in your Vercel environment variables.

**Issue:** Matrix Rain or animations not showing
**Fix:** These are canvas-based and require JavaScript. Check that your browser has JS enabled. Some ad blockers may interfere.

**Issue:** Codespace runs out of memory during `npm install`
**Fix:** Upgrade to a 4-core Codespace in the Codespaces settings, or run `npm install --legacy-peer-deps`.

