import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merge ───────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── File size formatter ────────────────────────────────────────
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ── Slugify ────────────────────────────────────────────────────
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Truncate ───────────────────────────────────────────────────
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + "…";
}

// ── Delay (for animations) ─────────────────────────────────────
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Download blob ──────────────────────────────────────────────
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Read file as ArrayBuffer ───────────────────────────────────
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ── Read file as text ──────────────────────────────────────────
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// ── Read file as data URL ──────────────────────────────────────
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ── Get file extension ─────────────────────────────────────────
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
}

// ── Strip extension from filename ─────────────────────────────
export function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

// ── Format date ───────────────────────────────────────────────
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

// ── Format date relative ──────────────────────────────────────
export function formatDateRelative(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
}

// ── Clamp ─────────────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ── Generate terminal-style random hex string ─────────────────
export function randomHex(length = 8): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

// ── Neon color to CSS variable ─────────────────────────────────
export function neonVar(color: string): string {
  return `var(--neon-${color})`;
}
