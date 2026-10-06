import "server-only"
import type { LocalizedText } from "@/lib/cms/content-types"
import type { Locale } from "@/lib/i18n/locales"
import { getSectionExtras } from "@/server/cms/site-content"

const inLocale = (locale: Locale, text: LocalizedText) => (locale === "mr" ? text.mr || text.en : text.en || text.mr)

/** The hero's admin-chosen photo (text edits arrive through the dictionary). */
export async function getLiveHero(preview: boolean) {
  const content = await getSectionExtras("hero", preview)
  return content?.image ? { image: { src: content.image.url } } : {}
}

export type LiveTravellerPhoto = { id: string; src: string; alt: string; caption: string; width: number; height: number }

/**
 * The Traveller's admin-managed features and photos. Each list is null when
 * the admin has not set it, so the built-in features or photos stay.
 */
export async function getLiveTraveller(locale: Locale, preview: boolean) {
  const content = await getSectionExtras("traveller", preview)
  const features = content?.features.length ? content.features.map((feature) => ({ icon: feature.icon as string, label: inLocale(locale, feature.text) })) : null
  const photos: LiveTravellerPhoto[] | null = content?.photos.length
    ? content.photos.map((photo, index) => ({
        id: `photo-${index}`,
        src: photo.url,
        alt: inLocale(locale, photo.alt),
        caption: inLocale(locale, photo.caption),
        width: photo.width,
        height: photo.height,
      }))
    : null
  return { features, photos }
}

export type LiveTraveller = Awaited<ReturnType<typeof getLiveTraveller>>
