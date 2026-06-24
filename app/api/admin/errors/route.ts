/**
 * app/api/admin/errors/route.ts
 *
 * GET  /api/admin/errors  — List all error reports (admin only)
 *
 * Query params:
 *   search   string       — search errorType, errorMessage, route
 *   status   string       — filter by status (NEW | INVESTIGATING | FIXED | CLOSED)
 *   route    string       — filter by route
 *   toolSlug string       — filter by toolSlug
 *   group    string       — groupBy (type | route | tool)
 *   sort     string       — field to sort by (timestamp | errorType | route)
 *   order    asc|desc     — sort direction (default: desc)
 *   page     number       — page number (default: 1)
 *   limit    number       — page size (default: 50, max: 200)
 */

import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { getAdminFromToken } from "@/lib/auth";
import { logApiError } from "@/lib/errors/logger";

export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token       = cookieStore.get("admin_token")?.value;
  const admin       = await getAdminFromToken(token ?? "");
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const search   = searchParams.get("search")   ?? "";
  const status   = searchParams.get("status")   ?? "";
  const route    = searchParams.get("route")    ?? "";
  const toolSlug = searchParams.get("toolSlug") ?? "";
  const group    = searchParams.get("group")    ?? "";
  const sort     = searchParams.get("sort")     ?? "timestamp";
  const order    = searchParams.get("order")    === "asc" ? "asc" : "desc";
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit    = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  // ── Where clause ─────────────────────────────────────────────────
  const where: Prisma.ErrorReportWhereInput = {
    ...(search && {
      OR: [
        { errorType:    { contains: search, mode: "insensitive" } },
        { errorMessage: { contains: search, mode: "insensitive" } },
        { route:        { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(status && {
      status: status as "NEW" | "INVESTIGATING" | "FIXED" | "CLOSED",
    }),
    ...(route    && { route:    { contains: route,    mode: "insensitive" } }),
    ...(toolSlug && { toolSlug: { contains: toolSlug, mode: "insensitive" } }),
  };

  // ── Order ─────────────────────────────────────────────────────────
  const validSorts = ["timestamp", "errorType", "route", "status"];
  const orderBy: Prisma.ErrorReportOrderByWithRelationInput = validSorts.includes(sort)
    ? { [sort]: order }
    : { timestamp: "desc" };

  try {
    // ── Grouped views ─────────────────────────────────────────────
    if (group === "type") {
      const grouped = await prisma.errorReport.groupBy({
        by:       ["errorType"],
        where,
        _count:   { id: true },
        _max:     { timestamp: true },
        orderBy:  { _count: { id: "desc" } },
        take:     100,
      });
      return NextResponse.json({
        view:  "grouped-by-type",
        items: grouped.map((g) => ({
          key:       g.errorType,
          count:     g._count.id,
          lastSeen:  g._max.timestamp,
        })),
      });
    }

    if (group === "route") {
      const grouped = await prisma.errorReport.groupBy({
        by:       ["route"],
        where:    { ...where, route: { not: null } },
        _count:   { id: true },
        _max:     { timestamp: true },
        orderBy:  { _count: { id: "desc" } },
        take:     100,
      });
      return NextResponse.json({
        view:  "grouped-by-route",
        items: grouped.map((g) => ({
          key:       g.route ?? "/",
          count:     g._count.id,
          lastSeen:  g._max.timestamp,
        })),
      });
    }

    if (group === "tool") {
      const grouped = await prisma.errorReport.groupBy({
        by:       ["toolSlug"],
        where:    { ...where, toolSlug: { not: null } },
        _count:   { id: true },
        _max:     { timestamp: true },
        orderBy:  { _count: { id: "desc" } },
        take:     100,
      });
      return NextResponse.json({
        view:  "grouped-by-tool",
        items: grouped.map((g) => ({
          key:       g.toolSlug ?? "—",
          count:     g._count.id,
          lastSeen:  g._max.timestamp,
        })),
      });
    }

    // ── Full list (default) ───────────────────────────────────────
    const [total, reports] = await prisma.$transaction([
      prisma.errorReport.count({ where }),
      prisma.errorReport.findMany({
        where,
        orderBy,
        skip:  (page - 1) * limit,
        take:  limit,
        select: {
          id:           true,
          errorType:    true,
          errorMessage: true,
          stackTrace:   true,
          route:        true,
          toolSlug:     true,
          blogSlug:     true,
          browser:      true,
          device:       true,
          userId:       true,
          role:         true,
          status:       true,
          timestamp:    true,
        },
      }),
    ]);

    // ── Stats sidebar ─────────────────────────────────────────────
    const [byStatus, topRoutes, topTools, topTypes, recentRaw] = await Promise.all([
      prisma.errorReport.groupBy({
        by:      ["status"],
        where,
        _count:  { id: true },
      }),
      prisma.errorReport.groupBy({
        by:      ["route"],
        where:   { route: { not: null } },
        _count:  { id: true },
        orderBy: { _count: { id: "desc" } },
        take:    5,
      }),
      prisma.errorReport.groupBy({
        by:      ["toolSlug"],
        where:   { toolSlug: { not: null } },
        _count:  { id: true },
        orderBy: { _count: { id: "desc" } },
        take:    5,
      }),
      prisma.errorReport.groupBy({
        by:      ["errorType"],
        _count:  { id: true },
        orderBy: { _count: { id: "desc" } },
        take:    5,
      }),
      // Last 14 days — raw timestamps for trend bucketing
      prisma.errorReport.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          },
        },
        select: { timestamp: true },
        orderBy: { timestamp: "asc" },
      }),
    ]);

    // Build 14-day trend buckets (YYYY-MM-DD)
    const trendMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = 0;
    }
    for (const { timestamp } of recentRaw) {
      const key = new Date(timestamp).toISOString().slice(0, 10);
      if (key in trendMap) trendMap[key]++;
    }
    const trends = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      view:     "list",
      total,
      page,
      limit,
      pages:    Math.ceil(total / limit),
      reports,
      stats: {
        byStatus:  Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
        topRoutes: topRoutes.map((r) => ({ route: r.route, count: r._count.id })),
        topTools:  topTools.map((t)  => ({ toolSlug: t.toolSlug, count: t._count.id })),
        topTypes:  topTypes.map((t)  => ({ errorType: t.errorType, count: t._count.id })),
        trends,
      },
    });

  } catch (err) {
    console.error("[api/admin/errors GET]", err);
    await logApiError(err, { route: "/api/admin/errors" });
    return NextResponse.json({ error: "Failed to fetch error reports" }, { status: 500 });
  }
}