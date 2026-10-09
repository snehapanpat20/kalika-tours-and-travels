/** Web-address rules for content with its own page (shared by the admin editor and the server). */

/** Lowercase letters, numbers and single hyphens (e.g. "mahabaleshwar", "12-jyotirlinga"). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const SLUG_MAX = 80

/**
 * A destination gets its own page (/destinations/[slug]) only once it has a
 * full write-up, so the site never publishes thin, near-identical "doorway"
 * pages. Shorter entries stay as cards that link to Plan Your Trip.
 */
export const DESTINATION_PAGE_MIN_DESCRIPTION = 200

/** "Madhya Pradesh" → "madhya-pradesh"; the same rule the database migration used. */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "")
  return slug || "destination"
}
