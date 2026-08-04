/**
 * app/api/admin/categories/route.ts
 *
 * GET    — list all blog categories
 * POST   — create a new category
 * PATCH  — rename a category (query param ?id=...)
 * DELETE — remove a category (query param ?id=...)
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logApiError } from "@/lib/errors/logger";
import { CACHE_TAGS } from "@/lib/data/tools";

async function requireAdmin() {
  const store = await cookies();
  const token = store.get("admin_token")?.value;
  return getAdminFromToken(token ?? "");
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const cats = await prisma.blogCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json(cats);
  } catch (err) {
    await logApiError(err, { route: "/api/admin/categories" });
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

    const cat = await prisma.blogCategory.create({ data: parsed.data });

    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");

    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    await logApiError(err, { route: "/api/admin/categories" });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    if (Object.keys(parsed.data).length === 0)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const cat = await prisma.blogCategory.update({ where: { id }, data: parsed.data });

    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");

    return NextResponse.json(cat);
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "A category with that slug already exists." }, { status: 409 });
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
    await logApiError(err, { route: "/api/admin/categories" });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await prisma.blogCategory.delete({ where: { id } });

    revalidateTag(CACHE_TAGS.blogPosts);
    revalidatePath("/blog");

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Prisma throws P2003 (foreign key constraint violation) when posts still
    // reference this category — categoryId is a required field with no
    // onDelete behavior set, so the delete is correctly blocked at the DB
    // level rather than silently orphaning or nulling those posts. Detect
    // this specific case and return a clear, actionable message instead of
    // a generic 500 that gives the admin no idea what went wrong or how to
    // fix it. Checking err.code directly (rather than
    // `instanceof Prisma.PrismaClientKnownRequestError`) is more portable —
    // Prisma always attaches .code to these errors regardless of exact
    // generated-client/class-identity state.
    const code = (err as { code?: string } | null)?.code;
    if (code === "P2003") {
      const postCount = await prisma.blogPost.count({ where: { categoryId: id } }).catch(() => null);
      return NextResponse.json(
        {
          error: postCount
            ? `Cannot delete — ${postCount} post${postCount === 1 ? "" : "s"} still use this category. Reassign or delete ${postCount === 1 ? "it" : "them"} first.`
            : "Cannot delete — this category is still in use.",
        },
        { status: 409 }
      );
    }

    await logApiError(err, { route: "/api/admin/categories" });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}