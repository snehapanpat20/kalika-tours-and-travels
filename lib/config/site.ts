const fallbackSiteUrl = "http://localhost:3000"

export function getSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim() || fallbackSiteUrl
  return new URL(value).origin
}
