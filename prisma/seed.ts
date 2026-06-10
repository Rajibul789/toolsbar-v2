import { PrismaClient } from "@prisma/client";
import { TOOLS_CONFIG, TOOL_CATEGORIES } from "../config/tools.config";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Seed admin ─────────────────────────────────────────────────
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "ToolsBar@Admin2025";
  const hash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email: "movieburststeam@gmail.com" },
    update: {},
    create: {
      email: "movieburststeam@gmail.com",
      name: "Admin",
      passwordHash: hash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✓ Admin: ${admin.email}`);

  // ── Seed tool categories ───────────────────────────────────────
  for (const cat of TOOL_CATEGORIES) {
    await prisma.toolCategory.upsert({
      where: { slug: cat.id },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        order: cat.order,
      },
      create: {
        slug: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        order: cat.order,
      },
    });
    console.log(`  ✓ Category: ${cat.name}`);
  }

  // ── Seed tools ─────────────────────────────────────────────────
  for (const tool of TOOLS_CONFIG) {
    const category = await prisma.toolCategory.findUnique({
      where: { slug: tool.category },
    });
    if (!category) {
      console.warn(`  ⚠ Category not found for tool: ${tool.slug}`);
      continue;
    }

    await prisma.tool.upsert({
      where: { slug: tool.slug },
      update: {
        name: tool.name,
        shortDesc: tool.shortDesc,
        longDesc: tool.longDesc,
        icon: tool.icon,
        accentColor: tool.accentColor,
        processingMode: tool.processingMode.toUpperCase() as "BROWSER" | "HYBRID" | "SERVER",
        maxFileSizeMb: tool.maxFileSizeMb,
        acceptedTypes: tool.acceptedTypes,
        isNew: tool.isNew ?? false,
        isFeatured: tool.isFeatured ?? false,
        order: tool.order,
      },
      create: {
        slug: tool.slug,
        name: tool.name,
        shortDesc: tool.shortDesc,
        longDesc: tool.longDesc,
        icon: tool.icon,
        accentColor: tool.accentColor,
        processingMode: tool.processingMode.toUpperCase() as "BROWSER" | "HYBRID" | "SERVER",
        maxFileSizeMb: tool.maxFileSizeMb,
        acceptedTypes: tool.acceptedTypes,
        isNew: tool.isNew ?? false,
        isFeatured: tool.isFeatured ?? false,
        order: tool.order,
        categoryId: category.id,
      },
    });
    console.log(`  ✓ Tool: ${tool.name}`);
  }

  // ── Seed homepage config defaults ─────────────────────────────
  const homepageDefaults = [
    { key: "hero_headline",    value: "FREE ONLINE TOOLS",  type: "TEXT", group: "hero", label: "Hero Headline" },
    { key: "hero_subheadline", value: "Split. Merge. Convert. All in your browser.", type: "TEXT", group: "hero", label: "Hero Subheadline" },
  ];

  for (const cfg of homepageDefaults) {
    await prisma.homepageConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg as Parameters<typeof prisma.homepageConfig.create>[0]["data"],
    });
  }

  console.log("\n✅ Seed complete!");
  console.log(`\n📋 Admin credentials:\n   Email:    movieburststeam@gmail.com\n   Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
