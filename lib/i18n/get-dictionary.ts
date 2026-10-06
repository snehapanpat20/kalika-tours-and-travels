import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { en } from "@/lib/i18n/messages/en"
import { mr } from "@/lib/i18n/messages/mr"

const dictionaries: Record<Locale, Dictionary> = { en, mr }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
