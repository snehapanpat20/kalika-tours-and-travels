import type { Metadata } from "next"
import { notFound } from "next/navigation"
import "../../globals.css"
import { Document } from "@/components/layout/document"
import { SiteFrame } from "@/components/layout/site-frame"
import { services } from "@/data/services"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { isLocale, locales } from "@/lib/i18n/locales"
import { createLocaleMetadata } from "@/lib/seo/metadata"
import { getLiveAnnouncement } from "@/server/cms/announcements"
import { isPreviewing } from "@/server/cms/preview"
import { listLiveServices } from "@/server/cms/services"

export const dynamicParams = false

/**
 * Every page re-checks admin-managed content at least every 5 minutes, so
 * scheduled offers and announcements start and end on time without a deploy.
 * Admin changes refresh the pages straight away.
 */
export const revalidate = 300

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return createLocaleMetadata(locale)
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const dictionary = getDictionary(locale)
  const preview = await isPreviewing()
  const [announcement, managedServices] = await Promise.all([
    getLiveAnnouncement(locale, preview, dictionary.cms.learnMore),
    listLiveServices(locale, preview),
  ])
  const footerServices = managedServices
    ? managedServices.map((service) => ({ anchor: service.anchor, name: service.title }))
    : services.map((service) => ({ anchor: service.id, name: service.name[locale] }))

  return (
    <Document locale={locale}>
      <SiteFrame locale={locale} dictionary={dictionary} services={footerServices} announcement={announcement} preview={preview}>
        {children}
      </SiteFrame>
    </Document>
  )
}
