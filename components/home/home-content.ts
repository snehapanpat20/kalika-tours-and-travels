import {
  Armchair,
  BriefcaseBusiness,
  HeartHandshake,
  Landmark,
  Luggage,
  Music,
  Route,
  ShieldCheck,
  Snowflake,
  Sofa,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { SteeringIcon, WindowIcon } from "@/components/ui/icons"
import type { ReactNode } from "react"
import type { ContentImageCategory } from "@/lib/config/media-file"
import type { ServiceId } from "@/types/catalog"
import type {
  ComfortMomentId,
  DestinationId,
  TravellerPhotoId,
  VehicleFeatureKey,
  WhyPointId,
} from "@/types/home"

/**
 * Presentation mapping for the homepage: which photograph and icon belong to
 * which item. All wording lives in the i18n dictionaries under the same ids.
 * Replacing a file in `public/images/<category>/` updates the site without code changes.
 */

export type ImageRef = {
  category: ContentImageCategory
  name: string
  /** CSS object-position, to keep the subject in frame when cropped. */
  position?: string
}

export type Icon = LucideIcon | ((props: { className?: string }) => ReactNode)

/** Homepage hero: a collage of real places across India (built by scripts/build-hero-collage.mjs). */
export const heroImage: ImageRef = { category: "hero", name: "hero-india-brand" }

export const journeyVisuals: Record<ServiceId, ImageRef> = {
  family: { category: "services", name: "family", position: "30% center" },
  group: { category: "services", name: "group", position: "45% center" },
  pilgrimage: { category: "services", name: "pilgrimage", position: "35% center" },
  corporate: { category: "services", name: "corporate", position: "50% center" },
  outstation: { category: "hero", name: "cta", position: "30% center" },
}

/** Order used by the quick-journey strip (brief order). */
export const journeyOrder: ServiceId[] = ["family", "group", "pilgrimage", "corporate", "outstation"]

/** Order used by the services grid. */
export const serviceOrder: ServiceId[] = ["outstation", "family", "group", "pilgrimage", "corporate"]

export const serviceIcons: Record<ServiceId, Icon> = {
  outstation: Route,
  family: HeartHandshake,
  group: UsersRound,
  pilgrimage: Landmark,
  corporate: BriefcaseBusiness,
}

export const vehicleFeatureIcons: Record<VehicleFeatureKey, Icon> = {
  seats: Armchair,
  ac: Snowflake,
  legroom: Sofa,
  luggage: Luggage,
  audio: Music,
  clean: Sparkles,
  windows: WindowIcon,
  driver: SteeringIcon,
}

/** Kalika's own Traveller (front right three-quarter view). */
export const travellerImage: ImageRef = { category: "traveller", name: "kalika-traveller", position: "50% 62%" }

/** Photographs of Kalika's own Traveller, shown in the "View our Traveller" viewer, in order. */
export const travellerGallery: { id: TravellerPhotoId; image: ImageRef }[] = [
  { id: "exterior", image: travellerImage },
  { id: "monsoonFront", image: { category: "traveller", name: "monsoon-front" } },
  { id: "interior", image: { category: "traveller", name: "interior-kalika" } },
  { id: "front", image: { category: "traveller", name: "front" } },
  { id: "rearQuarter", image: { category: "traveller", name: "rear-quarter" } },
  { id: "monsoonSide", image: { category: "traveller", name: "monsoon-side" } },
  { id: "monsoonRear", image: { category: "traveller", name: "monsoon-rear" } },
]

export const comfortImages: Record<ComfortMomentId, ImageRef> = {
  comfort: { category: "traveller", name: "interior-kalika", position: "50% 58%" },
  togetherness: { category: "hero", name: "hero", position: "45% center" },
  peace: { category: "gallery", name: "road", position: "65% center" },
}

export const destinationImages: Record<DestinationId, ImageRef> = {
  maharashtra: { category: "destinations", name: "maharashtra-waterfall" },
  goa: { category: "destinations", name: "goa-baga", position: "50% 100%" },
  karnataka: { category: "destinations", name: "karnataka-mysore-palace" },
  gujarat: { category: "destinations", name: "gujarat-statue-of-unity" },
  rajasthan: { category: "destinations", name: "rajasthan-hawa-mahal" },
  "madhya-pradesh": { category: "destinations", name: "madhya-pradesh-khajuraho" },
  "north-india": { category: "destinations", name: "north-india-rishikesh" },
  pilgrimage: { category: "destinations", name: "pilgrimage-ujjain" },
}

export const whyIcons: Record<WhyPointId, Icon> = {
  comfort: Armchair,
  together: Users,
  service: ShieldCheck,
  flexible: Route,
}

export const storyImage: ImageRef = { category: "gallery", name: "departure", position: "50% 55%" }

export const ctaImage: ImageRef = { category: "destinations", name: "other", position: "50% 60%" }
