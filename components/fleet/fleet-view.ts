import { activeFleet, type Vehicle, type VehicleCategory } from "@/data/fleet"
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
  description: string
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

function facts(vehicle: Vehicle, copy: Dictionary["fleet"]): string[] {
  const list: string[] = []
  if (vehicle.capacity !== null) list.push(copy.seats.replace("{n}", String(vehicle.capacity)))
  // One chip for the air conditioning: "AC / Non-AC" when it can be booked either way
  if (vehicle.acOptions.length === 2) list.push(copy.acOrNonAc)
  else if (vehicle.acOptions.length === 1) list.push(vehicle.acOptions[0] === "ac" ? copy.ac : copy.nonAc)
  if (vehicle.sleeper) list.push(copy.sleeper)
  if (vehicle.pushBackOption) list.push(copy.pushBackOption)
  return list
}

/**
 * The active vehicles, in order, as the pages draw them. The Traveller's
 * photos and features come from the admin panel when it has published some
 * (Admin › Website content › Our Fleet: the Traveller), and from data/fleet.ts
 * otherwise. "Enquire Now" opens the trip planner with the vehicle chosen.
 */
export function fleetViews(locale: Locale, dictionary: Dictionary, managedTraveller?: LiveTraveller | null, vehicles: Vehicle[] = activeFleet): VehicleView[] {
  const copy = dictionary.fleet
  return vehicles.map((vehicle) => {
    const builtInPhotos: VehiclePhotoView[] = [vehicle.exterior, ...vehicle.interior].flatMap((photo) =>
      photo ? [{ id: photo.id, src: photo.src, position: photo.position, alt: copy.photos[photo.id].alt, caption: copy.photos[photo.id].caption }] : [],
    )
    const isTraveller = vehicle.id === "traveller"
    const photos = isTraveller && managedTraveller?.photos?.length ? managedTraveller.photos.map(({ id, src, alt, caption }) => ({ id, src, alt, caption })) : builtInPhotos
    const features = isTraveller
      ? (managedTraveller?.features?.map((feature) => feature.label) ?? travellerFeatures.map((key) => dictionary.home.traveller.features[key]))
      : []

    return {
      id: vehicle.id,
      name: copy.vehicles[vehicle.id].name,
      description: copy.vehicles[vehicle.id].description,
      facts: facts(vehicle, copy),
      categories: vehicle.categories,
      photo: photos[0] ?? null,
      photos,
      features,
      enquireHref: planPath(locale, { vehicle: vehicle.id }),
    }
  })
}

/** Vehicles the trip planner can pre-select (the rest open it without a vehicle). */
const plannerVehicles = new Set<string>(activeFleet.map((vehicle) => vehicle.id))

/**
 * Vehicles managed in Admin › Fleet, drawn the same way. Photos and wording
 * come from the admin panel; the 20 seater Traveller (key "traveller") keeps
 * its "On board" list from Admin › Website content › Our Fleet: the Traveller.
 */
export function managedFleetViews(locale: Locale, dictionary: Dictionary, vehicles: PublicVehicle[], managedTraveller?: LiveTraveller | null): VehicleView[] {
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
      facts: list,
      categories,
      photo: photos[0] ?? null,
      photos,
      features,
      enquireHref: planPath(locale, vehicle.key && plannerVehicles.has(vehicle.key) ? { vehicle: vehicle.key } : {}),
    }
  })
}
