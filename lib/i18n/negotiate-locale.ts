import { defaultLocale, type Locale } from "@/lib/i18n/locales"

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale

  const ranges = acceptLanguage.split(",")

  for (const range of ranges) {
    const tag = range.split(";")[0]?.trim().toLowerCase() ?? ""
    if (tag.startsWith("mr")) return "mr"
    if (tag.startsWith("en")) return "en"
  }

  return defaultLocale
}
