import type { ImageRef } from "@/components/home/home-content"

/**
 * Photographs for the inner pages. Swap a file in public/images to change one.
 * The services/destinations/gallery/reviews heroes are colourful collages
 * built by scripts/build-hero-collage.mjs.
 */
export const pageImages = {
  aboutHero: { category: "destinations", name: "maharashtra-waterfall", position: "50% 60%" },
  aboutStory: { category: "about", name: "story-monsoon-road", position: "50% 70%" },
  servicesHero: { category: "hero", name: "page-services", position: "50% 70%" },
  destinationsHero: { category: "hero", name: "page-destinations", position: "50% 72%" },
  travellerHero: { category: "traveller", name: "monsoon-front", position: "55% 55%" },
  galleryHero: { category: "hero", name: "page-gallery", position: "50% 72%" },
  reviewsHero: { category: "hero", name: "page-reviews", position: "50% 70%" },
  contactHero: { category: "about", name: "yard", position: "65% 60%" },
  planHero: { category: "destinations", name: "other", position: "50% 70%" },
} satisfies Record<string, ImageRef>
