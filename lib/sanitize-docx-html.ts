/**
 * lib/sanitize-docx-html.ts
 *
 * Sanitises the HTML mammoth produces from a .docx before it is injected with
 * dangerouslySetInnerHTML (the on-page preview) or rendered for PDF export.
 *
 * mammoth escapes text correctly, but it copies hyperlink targets verbatim:
 * a .docx whose link points at `javascript:...` yields
 * `<a href="javascript:...">`, which runs script in this site's origin when
 * clicked in the preview (verified). Word files routinely come from third
 * parties, so the output is treated as untrusted.
 *
 * Parsing uses DOMParser, which builds an inert document (no script runs, no
 * resources load) — the sanitised result is serialised back to a string.
 */

const REMOVE_TAGS = [
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet",
  "link", "meta", "base", "form", "input", "button", "textarea", "select",
  "svg", "math", "audio", "video", "source", "track", "template", "noscript",
];

const URL_ATTRS = ["href", "src", "xlink:href", "action", "formaction", "poster", "background"];
const ALLOWED_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i;

type ParserCtor = new () => { parseFromString(source: string, type: "text/html"): Document };

function isSafeUrl(raw: string, attr: string): boolean {
  // Browsers ignore control characters / whitespace inside the scheme, so
  // "java\nscript:" must not slip through: strip them before inspecting.
  const v = raw.replace(/[\u0000-\u0020\u007F]+/g, "");
  if (v === "" || v.startsWith("#")) return true;
  if (DATA_IMAGE.test(v)) return attr === "src";
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(v);
  if (!m) return attr === "href" || attr === "src"; // relative URL — no scheme to abuse
  return attr === "href" && ALLOWED_LINK_PROTOCOLS.has(`${m[1].toLowerCase()}:`);
}

export function sanitizeDocxHtml(
  html: string,
  Parser: ParserCtor = DOMParser as unknown as ParserCtor
): string {
  const doc = new Parser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");

  for (const tag of REMOVE_TAGS) {
    doc.body.querySelectorAll(tag).forEach((el) => el.remove());
  }

  doc.body.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name === "srcset") {
        el.removeAttribute(attr.name);
      } else if (URL_ATTRS.includes(name) && !isSafeUrl(attr.value, name)) {
        el.removeAttribute(attr.name);
      }
    }
    // Links in the preview must not navigate away from the tool page.
    if (el.tagName === "A" && el.hasAttribute("href") && !el.getAttribute("href")!.startsWith("#")) {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });

  return doc.body.innerHTML;
}