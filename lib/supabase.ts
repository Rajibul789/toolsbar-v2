/**
 * lib/supabase.ts
 *
 * Supabase client utilities.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 *   This project uses Prisma ORM for ALL database operations.
 *   The Supabase JS client here is used ONLY for Storage (file uploads).
 *   No table queries are made through this client.
 *
 * EXPORTS:
 *   supabase          → Public client (anon key, browser-safe)
 *   getSupabaseAdmin  → Server-only admin client (service role key)
 *   uploadBlogImage   → Server-only storage upload helper
 *
 * SECURITY NOTE:
 *   RLS is enabled on all database tables via supabase/rls-and-indexes.sql.
 *   Storage bucket "blog-images" should have its own storage policies
 *   configured in the Supabase dashboard (see SUPABASE_MANUAL_ACTIONS.md).
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Public client (browser-safe, uses anon key) ──────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Server-only admin client ─────────────────────────────────────────────────
// Uses service_role key — DO NOT import in "use client" components
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Add it to your .env.local file. " +
      "Find it in: Supabase Dashboard → Project Settings → API → service_role key"
    );
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Blog image upload ────────────────────────────────────────────────────────
// Server-only — uses service role to bypass Storage bucket policies
export async function uploadBlogImage(
  file: File,
  path: string
): Promise<string> {
  const admin = getSupabaseAdmin();

  const { error } = await admin.storage
    .from("blog-images")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    // Create a typed error so callers can identify and log it correctly
    const storageError = new Error(
      `Supabase Storage upload failed: ${error.message}`
    );
    storageError.name = "SupabaseStorageError";
    // Stack trace is preserved automatically
    console.error("[supabase] uploadBlogImage error:", {
      path,
      message: error.message,
      storageError: error,
    });
    throw storageError;
  }

  const { data } = admin.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Delete blog image ────────────────────────────────────────────────────────
// Server-only — removes an image from Storage when a blog post is deleted
export async function deleteBlogImage(path: string): Promise<void> {
  const admin = getSupabaseAdmin();

  const { error } = await admin.storage
    .from("blog-images")
    .remove([path]);

  if (error) {
    const storageError = new Error(
      `Supabase Storage delete failed: ${error.message}`
    );
    storageError.name = "SupabaseStorageError";
    console.error("[supabase] deleteBlogImage error:", {
      path,
      message: error.message,
    });
    throw storageError;
  }
}