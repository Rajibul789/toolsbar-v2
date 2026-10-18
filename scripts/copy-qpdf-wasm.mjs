#!/usr/bin/env node
/**
 * Copies the qpdf WebAssembly binary from node_modules into /public so the
 * browser can fetch it (PDF Split uses qpdf client-side to decrypt/repair and
 * to write page-pruned files). Runs on postinstall, predev and prebuild.
 *
 * Never fails the install: if the package is missing the PDF Split tool simply
 * falls back to its pdf-lib / image tiers in the browser.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@neslinesli93", "qpdf-wasm", "dist", "qpdf.wasm");
const dest = join(root, "public", "vendor", "qpdf", "qpdf.wasm");

if (!existsSync(src)) {
  console.warn("[copy-qpdf-wasm] @neslinesli93/qpdf-wasm is not installed — skipping.");
  process.exit(0);
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[copy-qpdf-wasm] copied qpdf.wasm to public/vendor/qpdf/");
