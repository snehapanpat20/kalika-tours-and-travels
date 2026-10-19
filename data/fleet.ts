/**
 * The vehicles Kalika offers: one list, used by the Our Fleet page and the
 * homepage's "Explore Our Fleet" section, so the two can never disagree.
 * Names, descriptions and photo descriptions are in the i18n dictionaries
 * (`fleet.vehicles.<id>`, `fleet.photos.<id>`), in English and Marathi.
 *
 * Only facts the business has confirmed are recorded: seat counts, AC / non-AC
 * (each vehicle is offered both ways), sleeper, and the push-back seat option.
 * No brands, prices, amenities or availability. `null` means "not confirmed
 * yet" and is simply not shown.
 *
 * Photos are the business's own. A photo is attached to a vehicle only when
 * it is known to show that vehicle; the others appear only in the About
 * page's carousel of "our vehicles" (fleetGallery below) until the business
 * says which vehicle each one shows.
 * A vehicle without a photo shows a neutral "photo coming soon" panel.
 */

export type VehicleId = "traveller" | "traveller17Ac" | "traveller17NonAc" | "bus32" | "bus45" | "bus26" | "sleeper34" | "innova" | "ertiga"

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
  /** Shown in the homepage's "Explore Our Fleet" section (four at most). */
  featured?: boolean
  /** Hidden from the site when false (e.g. a vehicle not available for hire). */
  active: boolean
  /**
   * Listed on the Our Fleet page only, not yet in the trip form's vehicle list,
   * the FAQ answer or the homepage section.
   */
  fleetPageOnly?: boolean
}

/** Filter order on the Our Fleet page; only groups that contain an active vehicle are shown. */
export const categoryOrder: VehicleCategory[] = ["traveller", "bus", "sleeper", "pushBack", "car"]

/** The fleet, in display order. */
export const fleet: Vehicle[] = [
  {
    id: "traveller",
    capacity: 20,
    acOptions: ["ac", "nonAc"],
    categories: ["traveller"],
    // Supplied by the business: a Force Traveller from behind, and a Traveller-style cabin with push-back
    // seats. To confirm: both show Kalika's own Traveller.
    exterior: { id: "travellerExterior", src: "/images/fleet/traveller-exterior-blurred.jpg", position: "50% 60%" },
    interior: [{ id: "travellerInterior", src: "/images/fleet/traveller-interior.jpg", position: "50% 55%" }],
    featured: true,
    active: true,
  },
  { id: "traveller17Ac", capacity: 17, acOptions: ["ac"], categories: ["traveller"], interior: [], active: true, fleetPageOnly: true },
  { id: "traveller17NonAc", capacity: 17, acOptions: ["nonAc"], categories: ["traveller"], interior: [], active: true, fleetPageOnly: true },
  { id: "bus32", capacity: 32, acOptions: ["ac", "nonAc"], categories: ["bus"], interior: [], active: true },
  { id: "bus45", capacity: 45, acOptions: ["ac", "nonAc"], categories: ["bus"], interior: [], featured: true, active: true },
  { id: "bus26", capacity: 26, acOptions: ["ac", "nonAc"], pushBackOption: true, categories: ["bus", "pushBack"], interior: [], featured: true, active: true },
  { id: "sleeper34", capacity: 34, acOptions: ["ac", "nonAc"], sleeper: true, categories: ["bus", "sleeper"], interior: [], featured: true, active: true },
  // AC / non-AC not confirmed for the cars yet, so it is not shown
  { id: "innova", capacity: 7, acOptions: [], categories: ["car"], interior: [], active: true, fleetPageOnly: true },
  { id: "ertiga", capacity: 6, acOptions: [], categories: ["car"], interior: [], active: true, fleetPageOnly: true },
  // A second 45-seater bus is not listed until the business confirms how it differs from the 45-seater bus.
]

/** The vehicles on the Our Fleet page (when none are managed in Admin › Fleet). */
export const fleetPageVehicles = fleet.filter((vehicle) => vehicle.active)

/** The vehicles in the trip form, the FAQ answer and the homepage section. */
export const activeFleet = fleetPageVehicles.filter((vehicle) => !vehicle.fleetPageOnly)

/**
 * Photos of the business's vehicles for the About page's carousel. A
 * carousel of "our vehicles" needs no vehicle named, so it can show photos
 * not yet matched to a listing. Number plates, operator names and painted
 * phone numbers are blurred in every vehicle photo (the *-blurred files). Not
 * in the carousel yet: the Traveller from behind and the two coach photos in
 * assets/fleet-unassigned/ (not published).
 */
export const fleetGallery: FleetPhoto[] = [
  { id: "eicherSide", src: "/images/fleet/eicher-skyline-side-blurred.jpg", position: "50% 60%" },
  { id: "interiorBlueSeats", src: "/images/fleet/interior-blue-patterned-seats.jpg" },
  { id: "tealCoachSide", src: "/images/fleet/teal-coach-side-blurred.jpg", position: "50% 60%" },
  { id: "travellerInterior", src: "/images/fleet/traveller-interior.jpg" },
  { id: "eicherFront", src: "/images/fleet/eicher-skyline-front-blurred.jpg", position: "50% 45%" },
  { id: "interiorWhiteCovers1", src: "/images/fleet/interior-white-seat-covers-1.jpg" },
  { id: "tealCoachFront", src: "/images/fleet/teal-coach-front-blurred.jpg", position: "50% 55%" },
  { id: "interiorRedSeats", src: "/images/fleet/interior-red-patterned-seats.jpg" },
  { id: "interiorWhiteCovers2", src: "/images/fleet/interior-white-seat-covers-2.jpg" },
]
