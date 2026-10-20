import type { ImageRef } from "@/components/home/home-content"
import type { PageKey } from "@/lib/routes"

/**
 * The closing call-to-action band shown above the footer, one per page
 * (components/sections/page-cta.tsx). This file says how each band looks and
 * where its buttons go; its wording is in the i18n dictionaries under
 * `pageCtas.items.<page>`, in English and Marathi, like the rest of the site.
 *
 * Contact and Plan a Trip have no band: they are where the bands lead.
 */

export type PageCtaKey = "home" | "about" | "services" | "destinations" | "traveller" | "gallery" | "reviews"

export type PageCtaVariant = "gradient" | "dark" | "cream"

/** Where a button goes: one of the site's pages (in the visitor's language), or the business's own WhatsApp / Instagram. */
export type PageCtaTarget = { page: PageKey } | { external: "whatsapp" | "instagram" }

/** Decoration beside the text. Photos are the business's own (its Traveller), never stock pictures of people. */
export type PageCtaVisual =
  | { kind: "mandala" }
  | { kind: "arches" }
  /** The small quote form (destination, people, date) that opens the trip planner pre-filled. */
  | { kind: "quote" }
  | { kind: "route" }
  /** A row of small round photos. */
  | { kind: "circles"; photos: ImageRef[] }
  /** Two or three photos set at a slight tilt. */
  | { kind: "prints"; photos: ImageRef[] }
  /** Five gold stars, as decoration only (not a rating). */
  | { kind: "stars" }

export type PageCtaConfig = {
  variant: PageCtaVariant
  primary: PageCtaTarget
  secondary?: PageCtaTarget
  visual?: PageCtaVisual
}

/** Photos of Kalika's own Traveller, used as decoration. */
const travellerPhotos: ImageRef[] = [
  { category: "traveller", name: "kalika-traveller", position: "50% 60%" },
  { category: "traveller", name: "monsoon-front", position: "50% 55%" },
  { category: "traveller", name: "interior-kalika", position: "50% 58%" },
  { category: "traveller", name: "monsoon-side", position: "40% 60%" },
  { category: "traveller", name: "front", position: "50% 50%" },
]

export const pageCtas: Record<PageCtaKey, PageCtaConfig> = {
  home: { variant: "gradient", primary: { page: "plan" }, secondary: { external: "whatsapp" }, visual: { kind: "mandala" } },
  // The brief asked for a team or founder photo here; the site has none, so an abstract arch motif stands in
  about: { variant: "cream", primary: { page: "traveller" }, secondary: { page: "plan" }, visual: { kind: "arches" } },
  services: { variant: "dark", primary: { page: "plan" }, secondary: { external: "whatsapp" }, visual: { kind: "quote" } },
  // No India map asset exists, so a light dotted-route pattern stands in for one
  destinations: { variant: "gradient", primary: { page: "plan" }, visual: { kind: "route" } },
  // The upcoming tours are on the Destinations page
  // No vehicle photos here: the page above already shows the fleet's own photos
  traveller: { variant: "cream", primary: { page: "destinations" }, visual: { kind: "arches" } },
  gallery: { variant: "dark", primary: { page: "destinations" }, secondary: { external: "instagram" }, visual: { kind: "prints", photos: travellerPhotos.slice(0, 3) } },
  reviews: { variant: "gradient", primary: { page: "plan" }, visual: { kind: "stars" } },
}
