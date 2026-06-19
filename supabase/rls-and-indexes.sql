-- ================================================================
-- TOOLSBAR v2 — SUPABASE SECURITY & PERFORMANCE MIGRATION
-- Project:  ToolsBar v2 (lelmvcbwonrduryxouzz)
-- Run in:   Supabase Dashboard → SQL Editor → New Query
-- ================================================================
--
-- ARCHITECTURE CONTEXT (read before running)
-- -----------------------------------------------
-- This project uses Prisma ORM + custom authentication.
-- ALL database queries run server-side through Prisma.
-- The Prisma DATABASE_URL uses the 'postgres' superuser.
-- PostgreSQL superusers AUTOMATICALLY BYPASS RLS — no matter
-- what RLS policies exist. This means:
--   ✅ Prisma operations: 100% unaffected by RLS
--   ✅ Admin login/sessions: 100% unaffected
--   ✅ Blog system, tools, SEO: 100% unaffected
--   🛡️ PostgREST public API (Supabase anon key): BLOCKED
--
-- The Supabase JS client is used ONLY for Storage uploads,
-- not for any database queries. Storage is a separate system
-- from the PostgreSQL database and is NOT affected by table RLS.
--
-- ================================================================


-- ================================================================
-- PHASE 2 & 3 — ROW LEVEL SECURITY
-- ================================================================
-- WHY: RLS disabled means anyone who knows your Supabase project
-- URL and anon key can query ALL tables directly via the REST API.
-- This exposes admin passwords hashes, session tokens, and all content.
-- IMPACT: Enabling RLS blocks PostgREST anon access. Prisma is unaffected.
-- ================================================================

-- ---------------- admins ----------------------------------------
-- RISK: CRITICAL — email addresses, bcrypt password hashes, admin roles
-- all publicly readable via REST API without authentication
ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_deny_anon_all" ON "public"."admins";
CREATE POLICY "admins_deny_anon_all" ON "public"."admins"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- admin_sessions --------------------------------
-- RISK: CRITICAL — live admin authentication tokens exposed
-- An attacker can steal a valid session token and hijack any admin account
ALTER TABLE "public"."admin_sessions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_sessions_deny_anon_all" ON "public"."admin_sessions";
CREATE POLICY "admin_sessions_deny_anon_all" ON "public"."admin_sessions"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- tools -----------------------------------------
-- RISK: HIGH — tool config, backend URLs, processing modes exposed
ALTER TABLE "public"."tools" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tools_deny_anon_all" ON "public"."tools";
CREATE POLICY "tools_deny_anon_all" ON "public"."tools"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- tool_categories --------------------------------
ALTER TABLE "public"."tool_categories" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_categories_deny_anon_all" ON "public"."tool_categories";
CREATE POLICY "tool_categories_deny_anon_all" ON "public"."tool_categories"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- featured_slides --------------------------------
ALTER TABLE "public"."featured_slides" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "featured_slides_deny_anon_all" ON "public"."featured_slides";
CREATE POLICY "featured_slides_deny_anon_all" ON "public"."featured_slides"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- blog_posts -------------------------------------
-- RISK: HIGH — unpublished/draft posts exposed publicly before intended
ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts_deny_anon_all" ON "public"."blog_posts";
CREATE POLICY "blog_posts_deny_anon_all" ON "public"."blog_posts"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- blog_categories --------------------------------
ALTER TABLE "public"."blog_categories" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_categories_deny_anon_all" ON "public"."blog_categories";
CREATE POLICY "blog_categories_deny_anon_all" ON "public"."blog_categories"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- blog_tags --------------------------------------
ALTER TABLE "public"."blog_tags" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_tags_deny_anon_all" ON "public"."blog_tags";
CREATE POLICY "blog_tags_deny_anon_all" ON "public"."blog_tags"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- blog_post_tags ---------------------------------
ALTER TABLE "public"."blog_post_tags" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_post_tags_deny_anon_all" ON "public"."blog_post_tags";
CREATE POLICY "blog_post_tags_deny_anon_all" ON "public"."blog_post_tags"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- homepage_config --------------------------------
-- RISK: MEDIUM — internal homepage configuration exposed
ALTER TABLE "public"."homepage_config" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_config_deny_anon_all" ON "public"."homepage_config";
CREATE POLICY "homepage_config_deny_anon_all" ON "public"."homepage_config"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- seo_settings -----------------------------------
-- RISK: MEDIUM — internal SEO configuration exposed
ALTER TABLE "public"."seo_settings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seo_settings_deny_anon_all" ON "public"."seo_settings";
CREATE POLICY "seo_settings_deny_anon_all" ON "public"."seo_settings"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- tool_usage_stats -------------------------------
ALTER TABLE "public"."tool_usage_stats" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_usage_stats_deny_anon_all" ON "public"."tool_usage_stats";
CREATE POLICY "tool_usage_stats_deny_anon_all" ON "public"."tool_usage_stats"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- error_reports ----------------------------------
-- RISK: HIGH — user IDs, error stack traces, system details exposed
ALTER TABLE "public"."error_reports" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_reports_deny_anon_all" ON "public"."error_reports";
CREATE POLICY "error_reports_deny_anon_all" ON "public"."error_reports"
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ---------------- error_logs (Part 5 Error System) ---------------
-- Only applies if this table exists (added by our Error Logging system)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'error_logs'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename   = 'error_logs'
        AND policyname  = 'error_logs_deny_anon_all'
    ) THEN
      EXECUTE '
        CREATE POLICY "error_logs_deny_anon_all" ON "public"."error_logs"
          AS RESTRICTIVE FOR ALL TO anon
          USING (false) WITH CHECK (false)';
    END IF;
  END IF;
END $$;


-- ================================================================
-- PHASE 4 — SENSITIVE DATA PROTECTION
-- ================================================================
-- admin_sessions.token is now fully protected by RLS above.
-- For defense-in-depth, we document and add a column comment.
-- The token column is NOT readable by any anon request after RLS.
-- ================================================================

COMMENT ON COLUMN "public"."admin_sessions"."token" IS
  'SENSITIVE: Admin authentication token. Protected by RLS. Never expose via API.';

COMMENT ON COLUMN "public"."admins"."passwordHash" IS
  'SENSITIVE: bcrypt password hash. Protected by RLS. Never expose via API.';


-- ================================================================
-- PHASE 5 — PERFORMANCE: MISSING FOREIGN KEY INDEXES
-- ================================================================

-- 1. admin_sessions.adminId
--    FK: admin_sessions.adminId → admins.id
--    Without index: PostgreSQL full-scans admin_sessions on every
--    admin JOIN and every CASCADE DELETE (when admin is removed).
--    With 1000+ sessions this becomes a serious bottleneck.
CREATE INDEX IF NOT EXISTS "admin_sessions_admin_id_idx"
  ON "public"."admin_sessions" ("adminId");

-- 2. blog_posts.authorId
--    FK: blog_posts.authorId → admins.id
--    Without index: every JOIN to get post author requires a full
--    blog_posts table scan. Also slow for CASCADE operations.
CREATE INDEX IF NOT EXISTS "blog_posts_author_id_idx"
  ON "public"."blog_posts" ("authorId");

-- 3. blog_post_tags.tagId (reverse FK lookup)
--    The composite PK (postId, tagId) creates an index optimized for
--    postId-first queries ("get all tags for this post").
--    For tagId-first queries ("get all posts with this tag") — which
--    is common for tag pages — the composite index is NOT used efficiently.
--    This separate index makes tag page queries fast.
CREATE INDEX IF NOT EXISTS "blog_post_tags_tag_id_idx"
  ON "public"."blog_post_tags" ("tagId");


-- ================================================================
-- PHASE 5 — UNUSED INDEX ANALYSIS (KEEP ALL — documented below)
-- ================================================================
--
-- Supabase flags these as "possibly unused". Analysis:
--
-- tools: idx on (isActive, order)
--   → Used by: tool listing pages, sorted active tool queries
--   → Verdict: KEEP — critical for homepage tool grid
--
-- tools: idx on (isFeatured)
--   → Used by: featured tools homepage section queries
--   → Verdict: KEEP — used on every page load
--
-- tools: idx on (categoryId)
--   → Used by: /tool-category/[category] pages
--   → Verdict: KEEP — essential for category browsing
--
-- blog_posts: idx on (status, publishedAt)
--   → Used by: every public blog listing query (WHERE status='PUBLISHED')
--   → Verdict: KEEP — most critical blog index
--
-- blog_posts: idx on (categoryId)
--   → Used by: blog category pages
--   → Verdict: KEEP
--
-- blog_posts: idx on (slug)
--   → Used by: every single blog post URL lookup
--   → Verdict: KEEP — unique index, fastest possible slug lookup
--
-- tool_usage_stats: idx on (toolSlug)
--   → Used by: analytics aggregation queries
--   → Verdict: KEEP — essential for usage statistics
--
-- admin_sessions: idx on (token)
--   → Used by: EVERY authentication check (auth middleware)
--   → Verdict: ABSOLUTELY KEEP — this is the most critical index
--
-- Reason they show "unused": The database is relatively new.
-- pg_stat_user_indexes shows 0 scans because statistics reset
-- on schema changes or because traffic volume is low.
-- Re-evaluate after 30 days of consistent production traffic.


-- ================================================================
-- VERIFICATION QUERIES
-- Run these AFTER the fixes above to confirm everything is correct
-- ================================================================

-- 1. Verify RLS is enabled on all tables
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verify all policies exist
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Verify new indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'admin_sessions_admin_id_idx',
    'blog_posts_author_id_idx',
    'blog_post_tags_tag_id_idx'
  )
ORDER BY tablename;

-- 4. Check for any remaining tables with RLS disabled
SELECT tablename AS "TABLE WITH RLS DISABLED"
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
-- Expected result: 0 rows (all tables have RLS enabled)