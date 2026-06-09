import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public client (browser-safe, uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only admin client (uses service role key — never import in client components)
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Upload a file to Supabase Storage
export async function uploadBlogImage(
  file: File,
  path: string
): Promise<string> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage
    .from("blog-images")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = admin.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}
