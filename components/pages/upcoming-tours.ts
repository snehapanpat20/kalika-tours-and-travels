import { destinationImages, type ImageRef } from "@/components/home/home-content"
import type { UpcomingTourId } from "@/types/home"

/**
 * The tour packages shown under "Upcoming tours" on the Destinations page, in
 * this order. All wording lives in the i18n dictionaries under the same ids.
 * A tour without a photograph is shown as a plain card in the brand colour.
 */
export const upcomingTours: { id: UpcomingTourId; image?: ImageRef }[] = [
  { id: "goa", image: destinationImages.goa },
  { id: "kerala", image: { category: "destinations", name: "kerala-boat" } },
  { id: "rajasthan", image: destinationImages.rajasthan },
  { id: "ujjainOmkareshwar", image: destinationImages.pilgrimage },
  { id: "tirupati", image: { category: "destinations", name: "place-tirupati" } },
  { id: "ayodhyaVaranasi", image: { category: "destinations", name: "place-varanasi" } },
  { id: "haridwarRishikesh", image: destinationImages["north-india"] },
]
