import { isLocale, type Locale } from "@/lib/i18n/locales"

export function swapLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return `/${locale}`
  }

  if (segments[0] && isLocale(segments[0])) {
    segments[0] = locale
    return `/${segments.join("/")}`
  }

  return `/${locale}/${segments.join("/")}`
}
