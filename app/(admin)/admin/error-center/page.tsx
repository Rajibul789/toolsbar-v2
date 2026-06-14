"use client";

/**
 * app/(admin)/admin/error-center/page.tsx
 *
 * Admin Panel → Developer Tools → Error Center
 *
 * Features:
 *   ✔ All error reports with stack traces
 *   ✔ Error frequency stats
 *   ✔ Most affected routes
 *   ✔ Most affected tools
 *   ✔ Error trends (recent)
 *   ✔ Status management: New → Investigating → Fixed → Closed
 *   ✔ Search (errorType, errorMessage, route)
 *   ✔ Filter by status, route, tool
 *   ✔ Sorting by timestamp, type, route, status
 *   ✔ Grouping: All | By Error Type | By Route | By Tool
 *   ✔ Stack trace viewer (expandable per row)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bug, Search, Filter, RefreshCw, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, XCircle,
  Globe, Wrench, TrendingUp, Trash2, BarChart3, Activity,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ErrorStatus = "NEW" | "INVESTIGATING" | "FIXED" | "CLOSED";

interface ErrorReport {
  id:           string;
  errorType:    string;
  errorMessage: string;
  stackTrace:   string | null;
  route:        string | null;
  toolSlug:     string | null;
  blogSlug:     string | null;
  browser:      string | null;
  device:       string | null;
  userId:       string | null;
  role:         string | null;
  status:       ErrorStatus;
  timestamp:    string;
}

interface GroupedItem {
  key:      string;
  count:    number;
  lastSeen: string | null;
}

interface TrendPoint {
  date:  string;
  count: number;
}

interface Stats {
  byStatus:  Record<string, number>;
  topRoutes: { route: string | null; count: number }[];
  topTools:  { toolSlug: string | null; count: number }[];
  topTypes:  { errorType: string; count: number }[];
  trends:    TrendPoint[];
}

interface ApiResponse {
  view:     string;
  total?:   number;
  page?:    number;
  pages?:   number;
  reports?: ErrorReport[];
  items?:   GroupedItem[];
  stats?:   Stats;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ErrorStatus, { label: string; color: string; icon: React.ElementType }> = {
  NEW:           { label: "New",           color: "#ef4444", icon: AlertTriangle },
  INVESTIGATING: { label: "Investigating", color: "#f59e0b", icon: Clock },
  FIXED:         { label: "Fixed",         color: "#22c55e", icon: CheckCircle2 },
  CLOSED:        { label: "Closed",        color: "#64748b", icon: XCircle },
};

const NEXT_STATUS: Record<ErrorStatus, ErrorStatus> = {
  NEW:           "INVESTIGATING",
  INVESTIGATING: "FIXED",
  FIXED:         "CLOSED",
  CLOSED:        "NEW",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status, onClick }: { status: ErrorStatus; onClick?: () => void }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      title={onClick ? `Click to advance → ${NEXT_STATUS[status]}` : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: "3px 8px", borderRadius: "4px",
        background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`,
        color: cfg.color, fontSize: "10px", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={10} />
      {cfg.label}
    </button>
  );
}

// ─── Stack Trace Row ─────────────────────────────────────────────────────────

function ErrorRow({
  report,
  onStatusChange,
  onDelete,
}: {
  report: ErrorReport;
  onStatusChange: (id: string, status: ErrorStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [updating, setUpdating]   = useState(false);

  async function advanceStatus() {
    setUpdating(true);
    await onStatusChange(report.id, NEXT_STATUS[report.status]);
    setUpdating(false);
  }

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: expanded ? "rgba(255,255,255,0.02)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "24px 160px 1fr 160px 120px 80px",
          gap: "12px", alignItems: "center",
          padding: "10px 16px", fontSize: "12px",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 0 }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Error type */}
        <div style={{ color: "#ef4444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
             title={report.errorType}>
          {report.errorType}
        </div>

        {/* Message */}
        <div style={{ color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
             title={report.errorMessage}>
          {report.errorMessage}
        </div>

        {/* Route */}
        <div style={{ color: "#f472b6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
             title={report.route ?? "—"}>
          {report.route ?? "—"}
        </div>

        {/* Status */}
        <div>
          {updating
            ? <span style={{ color: "#64748b", fontSize: "11px" }}>Saving…</span>
            : <StatusBadge status={report.status} onClick={advanceStatus} />
          }
        </div>

        {/* Timestamp */}
        <div style={{ color: "#64748b", fontSize: "11px" }}>
          {fmtDate(report.timestamp)}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 16px 16px 52px" }}>
          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "12px" }}>
            {[
              { label: "Tool",    value: report.toolSlug },
              { label: "Blog",    value: report.blogSlug },
              { label: "Browser", value: report.browser },
              { label: "Device",  value: report.device },
              { label: "User ID", value: report.userId },
              { label: "Role",    value: report.role },
            ].map(({ label, value }) => value && (
              <div key={label} style={{ fontSize: "11px", fontFamily: "monospace" }}>
                <span style={{ color: "rgba(255,255,255,0.3)", marginRight: "6px" }}>{label}:</span>
                <span style={{ color: "rgba(255,255,255,0.65)" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Full message */}
          <div style={{
            background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)",
            borderRadius: "6px", padding: "10px 12px", marginBottom: "10px",
            fontSize: "12px", color: "rgba(255,255,255,0.7)", fontFamily: "monospace",
            wordBreak: "break-word",
          }}>
            {report.errorMessage}
          </div>

          {/* Stack trace */}
          {report.stackTrace && (
            <pre style={{
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "6px", padding: "12px",
              fontSize: "11px", color: "rgba(255,255,255,0.45)",
              overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
              maxHeight: "240px", overflowY: "auto",
              fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6,
              margin: 0,
            }}>
              {report.stackTrace}
            </pre>
          )}

          {/* Actions row */}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <select
              value={report.status}
              onChange={(e) => onStatusChange(report.id, e.target.value as ErrorStatus)}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", borderRadius: "4px",
                padding: "4px 8px", fontSize: "11px", fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <option value="NEW">New</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="FIXED">Fixed</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button
              onClick={() => onDelete(report.id)}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#ef4444", borderRadius: "4px",
                padding: "4px 10px", fontSize: "11px", fontFamily: "inherit", cursor: "pointer",
              }}
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ErrorCenterPage() {
  const [data,    setData]    = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [route,    setRoute]    = useState("");
  const [toolSlug, setToolSlug] = useState("");
  const [group,    setGroup]    = useState<"" | "type" | "route" | "tool">("");
  const [sort,     setSort]     = useState("timestamp");
  const [order,    setOrder]    = useState<"asc" | "desc">("desc");
  const [page,     setPage]     = useState(1);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(search   && { search }),
      ...(status   && { status }),
      ...(route    && { route }),
      ...(toolSlug && { toolSlug }),
      ...(group    && { group }),
      sort, order, page: String(page), limit: "50",
    });

    try {
      const res = await fetch(`/api/admin/errors?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      toast.error("Failed to load error reports");
    } finally {
      setLoading(false);
    }
  }, [search, status, route, toolSlug, group, sort, order, page]);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); fetchData(); }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, status, route, toolSlug, group, sort, order, page, fetchData]);

  // ── Status update ───────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (id: string, newStatus: ErrorStatus) => {
    try {
      const res = await fetch(`/api/admin/errors/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Status updated → ${STATUS_CONFIG[newStatus].label}`);
      // Update locally without full refetch
      setData((prev) => {
        if (!prev?.reports) return prev;
        return { ...prev, reports: prev.reports.map((r) => r.id === id ? { ...r, status: newStatus } : r) };
      });
    } catch {
      toast.error("Failed to update status");
    }
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this error report?")) return;
    try {
      const res = await fetch(`/api/admin/errors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Report deleted");
      setData((prev) => {
        if (!prev?.reports) return prev;
        return {
          ...prev,
          total:   (prev.total ?? 1) - 1,
          reports: prev.reports.filter((r) => r.id !== id),
        };
      });
    } catch {
      toast.error("Failed to delete report");
    }
  }, []);

  const stats     = data?.stats;
  const reports   = data?.reports ?? [];
  const groupItems = data?.items ?? [];
  const isGrouped  = !!group;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <Bug className="w-4 h-4" style={{ color: "#ef4444" }} />
            </div>
            <h1 className="font-display text-xl font-black text-white tracking-widest">
              ERROR CENTER
            </h1>
          </div>
          <p className="text-xs font-mono text-text-muted ml-10.5">
            Developer Tools · Error monitoring &amp; reporting
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 text-xs font-mono"
          style={{
            background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)",
            color: "#00f5ff", padding: "7px 14px", borderRadius: "6px", cursor: "pointer",
          }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats cards ────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {(["NEW", "INVESTIGATING", "FIXED", "CLOSED"] as ErrorStatus[]).map((s) => {
            const cfg   = STATUS_CONFIG[s];
            const Icon  = cfg.icon;
            const count = stats.byStatus[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => { setStatus(status === s ? "" : s); setPage(1); }}
                style={{
                  background: status === s ? `${cfg.color}12` : "rgba(10,15,30,0.8)",
                  border: `1px solid ${status === s ? cfg.color + "40" : cfg.color + "18"}`,
                  borderRadius: "12px", padding: "16px",
                  cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon size={16} style={{ color: cfg.color }} />
                  <span style={{ fontSize: "22px", fontWeight: 800, color: cfg.color,
                    fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
                </div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace" }}>
                  {cfg.label}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Insight panels ─────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Top error types */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={13} style={{ color: "#ef4444" }} />
              <span className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-widest">
                Top Error Types
              </span>
            </div>
            <div className="space-y-2">
              {stats.topTypes.map((t) => (
                <button key={t.errorType} onClick={() => setSearch(t.errorType)}
                  className="w-full flex items-center justify-between text-xs font-mono hover:opacity-80"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
                  <span style={{ color: "#ef4444", overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap", maxWidth: "170px" }} title={t.errorType}>
                    {t.errorType}
                  </span>
                  <span className="badge-neon ml-2 flex-shrink-0">{t.count}</span>
                </button>
              ))}
              {stats.topTypes.length === 0 && (
                <p className="text-[11px] text-text-muted">No data yet</p>
              )}
            </div>
          </div>

          {/* Most affected routes */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={13} style={{ color: "#f472b6" }} />
              <span className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-widest">
                Most Affected Routes
              </span>
            </div>
            <div className="space-y-2">
              {stats.topRoutes.map((r) => (
                <button key={r.route} onClick={() => setRoute(r.route ?? "")}
                  className="w-full flex items-center justify-between text-xs font-mono hover:opacity-80"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
                  <span style={{ color: "#f472b6", overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap", maxWidth: "170px" }} title={r.route ?? ""}>
                    {r.route ?? "/"}
                  </span>
                  <span className="badge-neon ml-2 flex-shrink-0">{r.count}</span>
                </button>
              ))}
              {stats.topRoutes.length === 0 && (
                <p className="text-[11px] text-text-muted">No data yet</p>
              )}
            </div>
          </div>

          {/* Most affected tools */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={13} style={{ color: "#00f5ff" }} />
              <span className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-widest">
                Most Affected Tools
              </span>
            </div>
            <div className="space-y-2">
              {stats.topTools.map((t) => (
                <button key={t.toolSlug} onClick={() => setToolSlug(t.toolSlug ?? "")}
                  className="w-full flex items-center justify-between text-xs font-mono hover:opacity-80"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
                  <span style={{ color: "#00f5ff", overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap", maxWidth: "170px" }} title={t.toolSlug ?? ""}>
                    {t.toolSlug ?? "—"}
                  </span>
                  <span className="badge-neon ml-2 flex-shrink-0">{t.count}</span>
                </button>
              ))}
              {stats.topTools.length === 0 && (
                <p className="text-[11px] text-text-muted">No data yet</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── Error Trends — Last 14 Days ──────────────────────────────── */}
      {stats && stats.trends && (
        <div className="glass-panel p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={13} style={{ color: "#a78bfa" }} />
            <span className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-widest">
              Error Trends — Last 14 Days
            </span>
            <span className="ml-auto text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
              {stats.trends.reduce((s, p) => s + p.count, 0)} total
            </span>
          </div>

          {/* Bar chart */}
          {(() => {
            const max = Math.max(...stats.trends.map((p) => p.count), 1);
            return (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "80px" }}>
                {stats.trends.map((point) => {
                  const pct   = Math.max((point.count / max) * 100, point.count > 0 ? 8 : 2);
                  const isHot = point.count === max && max > 0;
                  const color = isHot
                    ? "#ef4444"
                    : point.count > 0
                    ? "#a78bfa"
                    : "rgba(255,255,255,0.05)";
                  return (
                    <div
                      key={point.date}
                      title={`${point.date}: ${point.count} error${point.count !== 1 ? "s" : ""}`}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
                    >
                      <div style={{
                        width: "100%",
                        height: `${pct}%`,
                        minHeight: "2px",
                        background: color,
                        borderRadius: "3px 3px 0 0",
                        boxShadow: isHot ? `0 0 10px ${color}50` : "none",
                        transition: "height 0.3s ease",
                      }} />
                      <span style={{
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.2)",
                        fontFamily: "monospace",
                      }}>
                        {point.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div className="glass-panel mb-4">

        {/* Search */}
        <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search error type, message, or route…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-cyber w-full pl-8 text-xs"
            />
          </div>
        </div>

        {/* Filters & grouping row */}
        <div className="p-4 flex flex-wrap gap-3 items-center">
          <Filter size={13} className="text-text-muted flex-shrink-0" />

          {/* Status filter */}
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input-cyber text-xs px-3 py-1.5 rounded-lg">
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="FIXED">Fixed</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Sort */}
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="input-cyber text-xs px-3 py-1.5 rounded-lg">
            <option value="timestamp">Sort: Date</option>
            <option value="errorType">Sort: Type</option>
            <option value="route">Sort: Route</option>
            <option value="status">Sort: Status</option>
          </select>

          {/* Order */}
          <select value={order} onChange={(e) => { setOrder(e.target.value as "asc" | "desc"); setPage(1); }}
            className="input-cyber text-xs px-3 py-1.5 rounded-lg">
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

          {/* Active filters */}
          {route && (
            <button onClick={() => { setRoute(""); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)",
                color: "#f472b6", borderRadius: "4px", padding: "3px 8px",
                fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
              }}>
              Route: {route} ✕
            </button>
          )}
          {toolSlug && (
            <button onClick={() => { setToolSlug(""); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.3)",
                color: "#00f5ff", borderRadius: "4px", padding: "3px 8px",
                fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
              }}>
              Tool: {toolSlug} ✕
            </button>
          )}

          {/* Grouping tabs */}
          <div className="ml-auto flex gap-1">
            {([["", "All"], ["type", "By Type"], ["route", "By Route"], ["tool", "By Tool"]] as const).map(([g, label]) => (
              <button key={g} onClick={() => { setGroup(g); setPage(1); }}
                style={{
                  padding: "4px 10px", borderRadius: "4px", fontSize: "11px",
                  fontFamily: "inherit", cursor: "pointer",
                  background: group === g ? "rgba(0,245,255,0.12)" : "rgba(255,255,255,0.04)",
                  border: group === g ? "1px solid rgba(0,245,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  color: group === g ? "#00f5ff" : "rgba(255,255,255,0.5)",
                  fontWeight: group === g ? 700 : 400,
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="glass-panel overflow-hidden">

        {/* Table header — only for list view */}
        {!isGrouped && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "24px 160px 1fr 160px 120px 80px",
            gap: "12px", padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <div />
            <div>Error Type</div>
            <div>Message</div>
            <div>Route</div>
            <div>Status</div>
            <div>Time</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" style={{ color: "#00f5ff" }} />
            <p className="text-xs font-mono text-text-muted">Loading error reports…</p>
          </div>
        )}

        {/* Grouped view */}
        {!loading && isGrouped && (
          <div>
            {/* Grouped header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 80px 180px",
              gap: "12px", padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <div>{group === "type" ? "Error Type" : group === "route" ? "Route" : "Tool"}</div>
              <div>Count</div>
              <div>Last Seen</div>
            </div>
            {groupItems.map((item) => (
              <div key={item.key} style={{
                display: "grid", gridTemplateColumns: "1fr 80px 180px",
                gap: "12px", padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
              }}>
                <button
                  onClick={() => {
                    if (group === "type")  { setSearch(item.key); setGroup(""); }
                    if (group === "route") { setRoute(item.key);  setGroup(""); }
                    if (group === "tool")  { setToolSlug(item.key); setGroup(""); }
                  }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: group === "type" ? "#ef4444" : group === "route" ? "#f472b6" : "#00f5ff",
                    textAlign: "left", fontFamily: "inherit", fontSize: "inherit",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                  title={item.key}
                >
                  {item.key}
                </button>
                <div style={{ color: "#fbbf24", fontWeight: 700 }}>{item.count}</div>
                <div style={{ color: "#64748b", fontSize: "11px" }}>
                  {item.lastSeen ? fmtDate(item.lastSeen) : "—"}
                </div>
              </div>
            ))}
            {groupItems.length === 0 && !loading && (
              <div style={{ padding: "48px", textAlign: "center" }}>
                <TrendingUp size={24} className="mx-auto mb-3" style={{ color: "#64748b" }} />
                <p className="text-xs font-mono text-text-muted">No data to group</p>
              </div>
            )}
          </div>
        )}

        {/* List view */}
        {!loading && !isGrouped && reports.map((r) => (
          <ErrorRow
            key={r.id}
            report={r}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        ))}

        {/* Empty state */}
        {!loading && !isGrouped && reports.length === 0 && (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <CheckCircle2 size={32} className="mx-auto mb-4" style={{ color: "#22c55e" }} />
            <p className="text-sm font-mono text-white mb-1">No error reports found</p>
            <p className="text-xs font-mono text-text-muted">
              {search || status || route || toolSlug
                ? "Try adjusting your filters"
                : "No errors have been reported yet — great news!"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {!loading && !isGrouped && (data?.pages ?? 0) > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>
              Page {data?.page ?? 1} of {data?.pages ?? 1} · {data?.total ?? 0} total
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: "4px 12px", borderRadius: "4px", cursor: page > 1 ? "pointer" : "not-allowed",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: page > 1 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", fontSize: "11px",
                  fontFamily: "inherit",
                }}
              >← Prev</button>
              <button
                disabled={page >= (data?.pages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: "4px 12px", borderRadius: "4px",
                  cursor: page < (data?.pages ?? 1) ? "pointer" : "not-allowed",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: page < (data?.pages ?? 1) ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
                  fontSize: "11px", fontFamily: "inherit",
                }}
              >Next →</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}