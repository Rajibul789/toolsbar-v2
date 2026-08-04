/**
 * app/api/admin/blog/upload-image/route.ts
 *
 * POST — upload a featured image for a blog post to Supabase Storage.
 * Accepts multipart/form-data with a single "file" field.
 *
 * This wires up lib/supabase.ts's uploadBlogImage(), which previously had
 * no caller anywhere in the app — the post editor's "Featured Image"
 * section was a static, non-interactive placeholder despite the UI text
 * "Upload image or paste URL".
 */
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminFromToken } from "@/lib/auth";
import { uploadBlogImage } from "@/lib/supabase";
import { logApiError } from "@/lib/errors/logger";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const admin = await getAdminFromToken(token ?? "");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type — use JPEG, PNG, WebP, or GIF." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large — max 5MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const url = await uploadBlogImage(file, path);
    return NextResponse.json({ url });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/blog/upload-image" });
    return NextResponse.json({ error: "Upload failed. Please try again or paste an image URL instead." }, { status: 500 });
  }
}
