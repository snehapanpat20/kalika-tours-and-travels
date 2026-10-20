/**
 * The vehicles Kalika advertises, as a starting list: Admin › Fleet's "Import
 * current vehicles" copies them into the database. The website itself only
 * shows the database's published vehicles (server/cms/vehicles.ts), so a
 * vehicle deleted or unpublished in Admin › Fleet never comes back from here.
 * Names and descriptions are in the i18n dictionaries (`fleet.vehicles.<id>`),
 * in English and Marathi.
 *
 * Only facts the business has confirmed are recorded: seat counts and AC /
 * non-AC. `null` or an empty list means "not confirmed yet" and is not shown.
 *
 * Photos are the business's own, attached only where they are known to show
 * that vehicle; a vehicle without one shows a neutral "photo coming soon" panel.
 */

export type VehicleId = "traveller" | "ertiga" | "innova"

/** Filter groups on the Our Fleet page. A vehicle can sit in more than one (the sleeper is also a bus). */
export type VehicleCategory = "traveller" | "bus" | "sleeper" | "pushBack" | "car"

/** Air conditioning a vehicle can be booked with. */
export type AcOption = "ac" | "nonAc"

export type FleetPhotoId =
  | "travellerExterior"
  | "travellerInterior"
  | "eicherSide"
  | "eicherFront"
  | "tealCoachFront"
  | "tealCoachSide"
  | "interiorBlueSeats"
  | "interiorRedSeats"
  | "interiorWhiteCovers1"
  | "interiorWhiteCovers2"

export type FleetPhoto = { id: FleetPhotoId; src: string; position?: string }

export type Vehicle = {
  id: VehicleId
  /** Passenger seats (berths for the sleeper); null until confirmed. */
  capacity: number | null
  /** How it can be booked: AC, non-AC or either. Empty = not confirmed. */
  acOptions: AcOption[]
  sleeper?: boolean
  /** Push-back (reclining) seats can be asked for. */
  pushBackOption?: boolean
  categories: VehicleCategory[]
  /** Main photo: an exterior where there is one. */
  exterior?: FleetPhoto
  /** Further photos (interiors), shown in the vehicle's gallery. */
  interior: FleetPhoto[]
}

/** Filter order on the Our Fleet page; only groups that contain an active vehicle are shown. */
export const categoryOrder: VehicleCategory[] = ["traveller", "bus", "sleeper", "pushBack", "car"]

/** The starting list, in display order: the 20 seater Traveller, the Ertiga and the Innova Crysta. */
export const builtInFleet: Vehicle[] = [
  {
    id: "traveller",
    capacity: 20,
    acOptions: ["ac", "nonAc"],
    categories: ["traveller"],
    // Supplied by the business: a Force Traveller from behind, and a Traveller-style cabin with push-back
    // seats. To confirm: both show Kalika's own Traveller.
    exterior: { id: "travellerExterior", src: "/images/fleet/traveller-exterior-blurred.jpg", position: "50% 60%" },
    interior: [{ id: "travellerInterior", src: "/images/fleet/traveller-interior.jpg", position: "50% 55%" }],
  },
  // AC / non-AC not confirmed for the cars yet, so it is not shown
  { id: "ertiga", capacity: 6, acOptions: [], categories: ["car"], interior: [] },
  { id: "innova", capacity: 7, acOptions: [], categories: ["car"], interior: [] },
]

/**
 * The only vehicles the website lists, by their stable key: Admin › Fleet can
 * hold others (drafts, or vehicles added for later), but the public pages show
 * a vehicle only when it is published and one of these.
 */
export const websiteVehicleKeys: readonly VehicleId[] = builtInFleet.map((vehicle) => vehicle.id)

export const isWebsiteVehicle = (key: string | null | undefined): boolean => Boolean(key && (websiteVehicleKeys as readonly string[]).includes(key))

/**
 * Photos for the About page's "our vehicles" carousel: only photos of the
 * vehicles the website advertises (the Traveller). Number plates and painted
 * names are blurred (the *-blurred files). The bus and coach photos stay in
 * public/images/fleet/ but are not shown anywhere.
 */
export const fleetGallery: FleetPhoto[] = [
  { id: "travellerExterior", src: "/images/fleet/traveller-exterior-blurred.jpg", position: "50% 60%" },
  { id: "travellerInterior", src: "/images/fleet/traveller-interior.jpg" },
]
