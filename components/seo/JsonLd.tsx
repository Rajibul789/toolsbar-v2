interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Renders a JSON-LD <script>. JSON.stringify alone does not escape "<", so a
 * value containing "</script>" (e.g. a blog title or FAQ answer entered in
 * the admin panel) would close the tag early and let the remainder run as
 * HTML. Escaping "<" as \u003c keeps the JSON semantically identical while
 * making that impossible.
 */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}