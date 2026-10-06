import "server-only"
import { travellerGallery } from "@/components/home/home-content"
import type { LocalizedText } from "@/lib/cms/content-types"
import type { CmsIconName } from "@/lib/cms/icons"
import { findNamedImage } from "@/lib/config/media-file"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { requireSection, adminGetSection, sectionDefaults } from "@/server/cms/site-content"
import type { VehicleFeatureKey } from "@/types/home"

const featureOrder: VehicleFeatureKey[] = ["seats", "ac", "legroom", "luggage", "audio", "clean", "windows", "driver"]

export type BuiltInFeature = { icon: CmsIconName; text: LocalizedText }
export type BuiltInPhoto = { path: string; alt: LocalizedText; caption: LocalizedText }

/** The Traveller features and photos the website shows by default, so the admin can start from them. */
function builtInTraveller(): { features: BuiltInFeature[]; photos: BuiltInPhoto[] } {
  const en = getDictionary("en").home.traveller
  const mr = getDictionary("mr").home.traveller
  return {
    // Feature keys and icon names are the same words
    features: featureOrder.map((key) => ({ icon: key, text: { en: en.features[key], mr: mr.features[key] } })),
    photos: travellerGallery.flatMap(({ id, image }) => {
      const path = "category" in image ? findNamedImage(image.category, image.name) : null
      return path
        ? [{ path, alt: { en: en.gallery.items[id].alt, mr: mr.gallery.items[id].alt }, caption: { en: en.gallery.items[id].caption, mr: mr.gallery.items[id].caption } }]
        : []
    }),
  }
}

/** Everything the section editor needs: the definition, saved draft, live version and built-in text. */
export async function sectionEditorData(key: string) {
  const section = requireSection(key)
  const state = await adminGetSection(key)
  return {
    section,
    state,
    defaults: sectionDefaults(section),
    builtIn: section.features || section.photos ? builtInTraveller() : { features: [], photos: [] },
  }
}

export type SectionEditorData = Awaited<ReturnType<typeof sectionEditorData>>
