/**
 * global.d.ts
 *
 * Global TypeScript declarations for the ToolsBar v2 project.
 *
 * Why this file exists:
 *   TypeScript ts[2882] fires when no type declarations cover a CSS
 *   side-effect import (e.g. `import "./globals.css"` in layout.tsx).
 *   next-env.d.ts normally provides these via `/// <reference types="next" />`
 *   but that file is auto-generated at build time and may be absent in fresh
 *   Codespace / CI environments before the first `next dev` or `next build`.
 *   This file acts as a permanent defensive fallback.
 */

// CSS side-effect imports  (e.g. import "./globals.css")
declare module "*.css";

// CSS Modules  (e.g. import styles from "./Component.module.css")
declare module "*.module.css" {
  const styles: { readonly [className: string]: string };
  export default styles;
}

// SCSS / Sass
declare module "*.scss";
declare module "*.module.scss" {
  const styles: { readonly [className: string]: string };
  export default styles;
}