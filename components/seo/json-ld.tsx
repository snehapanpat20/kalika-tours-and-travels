/**
 * Renders structured data for search engines. `<` is escaped so text from the
 * admin panel can never close the script tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />
}
