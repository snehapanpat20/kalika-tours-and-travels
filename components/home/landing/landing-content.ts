import type { ImageRef } from "@/components/home/home-content"
import type { HeroSlideId } from "@/types/home"

/**
 * What the homepage shows, kept apart from how it is drawn. Wording lives in
 * the i18n dictionaries (`home.landing`) under the same ids; this file only
 * says which photographs go where. Replacing a file in `public/images` updates
 * the page without code changes.
 *
 * Every photograph here is a real file in the project: Kalika's own Traveller,
 * or a place photo already used on the site (credited in data/photo-credits.ts
 * where it is someone else's).
 */

/**
 * Hero background, in order. The first is Kalika's own Traveller; an admin-chosen
 * hero photo takes its place. The brief asked for the Taj Mahal, the Kerala
 * backwaters and Ladakh: the project has no photos of those yet, so the
 * nearest real ones stand in (a Rajasthan fort, the Himalaya at Kedarnath and
 * the Konkan coast). Swap them here when those photos are added.
 */
export const heroSlides: { id: HeroSlideId; image: ImageRef }[] = [
  { id: "traveller", image: { category: "traveller", name: "monsoon-front", position: "50% 55%" } },
  { id: "rajasthan", image: { category: "destinations", name: "rajasthan", position: "50% 60%" } },
  { id: "kedarnath", image: { category: "destinations", name: "place-jyotirlinga", position: "50% 40%" } },
  { id: "konkan", image: { category: "destinations", name: "place-konkan", position: "50% 60%" } },
]

/** Seconds each hero photo stays before the next fades in. */
export const HERO_SLIDE_SECONDS = 6

/** "Who we are": a tall photo and a smaller one overlapping it. */
export const aboutPhotos = {
  main: { category: "about", name: "story-monsoon-road", position: "50% 70%" },
  inset: { category: "traveller", name: "interior-kalika", position: "50% 58%" },
} satisfies Record<string, ImageRef>

/** How many approved reviews the carousel shows. */
export const REVIEW_COUNT = 9

/** The hero shows an average rating only from this many approved reviews, the same rule as the Reviews page. */
export const MIN_REVIEWS_FOR_AVERAGE = 5
