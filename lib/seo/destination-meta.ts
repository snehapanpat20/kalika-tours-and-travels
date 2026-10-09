import type { Locale } from "@/lib/i18n/locales"

/**
 * Default search title and description for a destination page, used when the
 * admin leaves "SEO title" / "Meta description" empty. Shared by the page and
 * the admin editor (which shows them as placeholders).
 */

export const SEO_TITLE_MAX = 70
export const SEO_DESCRIPTION_MAX = 170

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s,.;:–-]+$/, "")}…`
}

export function defaultDestinationTitle(locale: Locale, name: string): string {
  const title = locale === "mr" ? `पुण्याहून ${name} सहल | कालिका टूर्स अँड ट्रॅव्हल्स` : `${name} Trip from Pune | Kalika Tours and Travels`
  return title.length <= SEO_TITLE_MAX ? title : clip(locale === "mr" ? `पुण्याहून ${name} सहल` : `${name} Trip from Pune`, SEO_TITLE_MAX)
}

export function defaultDestinationDescription(locale: Locale, name: string, summary: string): string {
  const tail = locale === "mr" ? ` कालिका टूर्स अँड ट्रॅव्हल्ससोबत पुण्याहून ${name} सहलीची चौकशी करा.` : ` Plan a ${name} trip from Pune with Kalika Tours and Travels.`
  return clip(`${clip(summary, SEO_DESCRIPTION_MAX - tail.length)}${tail}`, SEO_DESCRIPTION_MAX - 10)
}
