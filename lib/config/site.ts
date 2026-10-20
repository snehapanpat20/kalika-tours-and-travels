/** Used only in development, when NEXT_PUBLIC_SITE_URL is not set. */
const developmentSiteUrl = "http://localhost:3000"

/**
 * The live website's canonical address. Production builds use it whenever
 * NEXT_PUBLIC_SITE_URL is missing, points at localhost, or is a Vercel
 * deployment address (*.vercel.app), so those never end up in canonical
 * links, the sitemap or robots.txt.
 */
export const productionSiteUrl = "https://kalikayatra.com"

/** Addresses that are never the public website: localhost and Vercel deployment URLs. */
const nonCanonicalHost = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.vercel\.app)$/i

let warned = false

/**
 * The website's public address (origin, no trailing slash): the single source
 * for canonical URLs, the sitemap, robots.txt, Open Graph and structured data.
 * In development: NEXT_PUBLIC_SITE_URL, or localhost. In a production build:
 * NEXT_PUBLIC_SITE_URL when it is a real domain, otherwise productionSiteUrl.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const origin = new URL(configured || developmentSiteUrl).origin
  if (process.env.NODE_ENV !== "production" || !nonCanonicalHost.test(new URL(origin).hostname)) return origin

  if (!warned) {
    warned = true
    console.warn(
      `[seo] NEXT_PUBLIC_SITE_URL is ${configured ? `"${configured}"` : "not set"}, which is not the public website: canonical URLs, the sitemap and sharing links use ${productionSiteUrl} instead.`,
    )
  }
  return productionSiteUrl
}
