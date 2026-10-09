/** Used only in development, when NEXT_PUBLIC_SITE_URL is not set. */
const developmentSiteUrl = "http://localhost:3000"

let warned = false

/**
 * The website's public address (origin, no trailing slash): the single source
 * for canonical URLs, the sitemap, robots.txt, Open Graph and structured data.
 * Set NEXT_PUBLIC_SITE_URL to the production domain (e.g. https://www.example.com)
 * on the host; a production server without it would publish localhost links,
 * so it is reported loudly.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const origin = new URL(configured || developmentSiteUrl).origin
  if (process.env.NODE_ENV === "production" && !warned && /\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(origin)) {
    warned = true
    console.warn(
      `[seo] NEXT_PUBLIC_SITE_URL is ${configured ? `"${configured}"` : "not set"}: canonical URLs, the sitemap and sharing links will point at ${origin}. Set it to the real domain before going live.`,
    )
  }
  return origin
}
