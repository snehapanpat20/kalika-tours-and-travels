import type { VehicleCategory, VehicleId } from "@/data/fleet"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { planPath } from "@/lib/routes"
import type { LiveTraveller } from "@/server/cms/sections-public"
import type { PublicVehicle } from "@/server/cms/vehicles"
import type { VehicleFeatureKey } from "@/types/home"

export type VehiclePhotoView = { id: string; src: string; alt: string; caption: string; position?: string }

/** A vehicle ready to draw: wording in the visitor's language, photos resolved. */
export type VehicleView = {
  id: string
  name: string
  /** The short description, on the card. */
  description: string
  /** The longer description, under "View details" (where the site has one for this vehicle). */
  details: string
  /** Short facts: seats, AC / non-AC, sleeper, the push-back option (only those confirmed). */
  facts: string[]
  categories: VehicleCategory[]
  /** The card's photo (the first of `photos`), if there is one. */
  photo: VehiclePhotoView | null
  photos: VehiclePhotoView[]
  /** What's on board, where confirmed (the Traveller's features). */
  features: string[]
  enquireHref: string
}

// No "ac": the Traveller can be booked AC or non-AC, which its card already says
const travellerFeatures: VehicleFeatureKey[] = ["seats", "legroom", "luggage", "audio", "clean", "windows", "driver"]

/** The site's own wording for a vehicle imported from the starting list (data/fleet.ts), by its key. */
function builtInCopy(dictionary: Dictionary, key: string | null) {
  const vehicles = dictionary.fleet.vehicles as Partial<Record<string, Dictionary["fleet"]["vehicles"][VehicleId]>>
  return key ? vehicles[key] : undefined
}

/** What the trip form and "Enquire Now" links call a vehicle: its stable key, or its id. */
export const vehicleChoiceId = (vehicle: Pick<PublicVehicle, "id" | "key">) => vehicle.key ?? vehicle.id

/**
 * The published vehicles from Admin › Fleet, in order, as the pages draw them
 * (the homepage, the Our Fleet page). Photos and wording come from the admin
 * panel; the 20 seater Traveller (key "traveller") keeps its "On board" list
 * from Admin › Website content › Our Fleet: the Traveller. "Enquire Now" opens
 * the trip planner with the vehicle chosen.
 */
export function fleetViews(locale: Locale, dictionary: Dictionary, vehicles: PublicVehicle[], managedTraveller?: LiveTraveller | null): VehicleView[] {
  const copy = dictionary.fleet
  return vehicles.map((vehicle) => {
    const categories: VehicleCategory[] =
      vehicle.category === "TRAVELLER" ? ["traveller"] : vehicle.category === "CAR" ? ["car"] : vehicle.category === "SLEEPER_BUS" ? ["bus", "sleeper"] : ["bus"]
    if (vehicle.pushBackSeats) categories.push("pushBack")
    const list: string[] = []
    if (vehicle.capacity !== null) list.push(copy.seats.replace("{n}", String(vehicle.capacity)))
    if (vehicle.ac) list.push(vehicle.ac === "BOTH" ? copy.acOrNonAc : vehicle.ac === "AC" ? copy.ac : copy.nonAc)
    if (vehicle.category === "SLEEPER_BUS") list.push(copy.sleeper)
    if (vehicle.pushBackSeats) list.push(copy.pushBackOption)
    if (vehicle.seatingType) list.push(vehicle.seatingType)
    const photos: VehiclePhotoView[] = vehicle.photos.map((photo) => ({ id: photo.id, src: photo.src, alt: photo.alt, caption: "" }))
    const features =
      vehicle.key === "traveller"
        ? (managedTraveller?.features?.map((feature) => feature.label) ?? travellerFeatures.map((key) => dictionary.home.traveller.features[key]))
        : []
    return {
      id: vehicle.id,
      name: vehicle.name,
      description: vehicle.description ?? "",
      details: builtInCopy(dictionary, vehicle.key)?.details ?? "",
      facts: list,
      categories,
      photo: photos[0] ?? null,
      photos,
      features,
      enquireHref: planPath(locale, { vehicle: vehicleChoiceId(vehicle) }),
    }
  })
}

/** The trip form's "Choose Your Vehicle" options: the same published vehicles, in the visitor's language and in English. */
export function vehicleChoices(vehicles: PublicVehicle[]) {
  return vehicles.map((vehicle) => ({ id: vehicleChoiceId(vehicle), name: vehicle.name, english: vehicle.englishName }))
}
