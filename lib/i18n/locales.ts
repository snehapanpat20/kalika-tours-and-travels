export const locales = ["en", "mr"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export type LocalizedText = Record<Locale, string>

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
