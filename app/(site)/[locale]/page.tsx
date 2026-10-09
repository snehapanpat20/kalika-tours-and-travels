import type { Metadata } from "next"
import { HomePage } from "@/components/home/home-page"
import { PageStructuredData } from "@/components/seo/page-structured-data"
import { isLocale } from "@/lib/i18n/locales"
import { resolvePageLocale, type LocaleParams } from "@/lib/i18n/page-locale"
import { createPageMetadata } from "@/lib/seo/metadata"

// Featured photos and reviews refresh at least every 10 minutes, and right away after an admin change
export const revalidate = 600

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? createPageMetadata(locale, "home") : {}
}

export default async function Page(props: LocaleParams) {
  const { locale, dictionary, preview } = await resolvePageLocale(props)
  return (
    <>
      <PageStructuredData locale={locale} page="home" />
      <HomePage locale={locale} dictionary={dictionary} preview={preview} />
    </>
  )
}
