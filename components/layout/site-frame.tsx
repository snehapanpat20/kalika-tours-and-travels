import type { CSSProperties, ReactNode } from "react"
import { AnnouncementBar, type AnnouncementView } from "@/components/layout/announcement-bar"
import { PreviewBanner } from "@/components/layout/preview-banner"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { WhatsAppButton } from "@/components/layout/whatsapp-button"
import { MotionProvider } from "@/components/motion/motion-provider"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"

export function SiteFrame({
  locale,
  dictionary,
  services,
  announcement,
  preview,
  children,
}: {
  locale: Locale
  dictionary: Dictionary
  /** Footer service links: anchor on the Services page and name. */
  services: { anchor: string; name: string }[]
  announcement: AnnouncementView | null
  preview: boolean
  children: ReactNode
}) {
  // First estimate of the bar's height for the server render; the bar measures itself after loading
  const frameStyle = { "--announcement-h": announcement ? "2.5rem" : "0px" } as CSSProperties

  return (
    <MotionProvider>
      <div id="top" className="flex min-h-dvh flex-col" style={frameStyle}>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-forest focus:px-5 focus:py-3 focus:font-semibold focus:text-white"
        >
          {dictionary.skipToContent}
        </a>
        <SiteHeader
          locale={locale}
          dictionary={dictionary}
          topSlot={
            announcement ? <AnnouncementBar key={announcement.version} announcement={announcement} closeLabel={dictionary.cms.announcementClose} notLiveLabel={dictionary.cms.notLiveYet} /> : null
          }
        />
        {/* Offsets the fixed header (and the announcement bar); the homepage hero slides back under the header */}
        <main
          id="content"
          tabIndex={-1}
          className="flex-1 pt-[calc(4rem+var(--announcement-h,0px))] outline-none lg:pt-[calc(5rem+var(--announcement-h,0px))]"
        >
          {children}
        </main>
        <SiteFooter locale={locale} dictionary={dictionary} services={services} />
        <WhatsAppButton label={dictionary.nav.whatsapp} />
        {preview ? <PreviewBanner label={dictionary.cms.previewLabel} exitLabel={dictionary.cms.previewExit} exitHref={`/api/admin/preview/exit?path=/${locale}`} /> : null}
      </div>
    </MotionProvider>
  )
}
