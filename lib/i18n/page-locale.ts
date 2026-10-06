import "server-only"
import { notFound } from "next/navigation"
import { isLocale, type Locale } from "@/lib/i18n/locales"
import { isPreviewing } from "@/server/cms/preview"
import { getSiteDictionary } from "@/server/cms/site-content"

export type LocaleParams = { params: Promise<{ locale: string }> }

/**
 * The page's locale and dictionary (built-in text with any published admin
 * edits applied, or drafts while an admin previews), or a 404 for an unknown locale.
 */
export async function resolvePageLocale({ params }: LocaleParams) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const preview = await isPreviewing()
  return { locale: locale as Locale, dictionary: await getSiteDictionary(locale, preview), preview }
}
