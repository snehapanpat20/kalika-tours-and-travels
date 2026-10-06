import type { ReactNode } from "react"
import { SiteNav } from "@/components/layout/site-nav"
import { BrandLogo } from "@/components/ui/logo"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"

export function SiteHeader({ locale, dictionary, topSlot }: { locale: Locale; dictionary: Dictionary; topSlot?: ReactNode }) {
  return <SiteNav locale={locale} dictionary={dictionary} topSlot={topSlot} logo={<BrandLogo size="nav" plate priority alt="" />} />
}
