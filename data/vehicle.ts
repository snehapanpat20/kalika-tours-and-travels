import { seedTimestamp } from "@/data/seed"
import type { VehicleRecord } from "@/types/catalog"

/**
 * Current fleet seed. The 20+1 Traveller is the primary vehicle today.
 * Add another vehicle as another row. Do not treat this id as the only vehicle.
 */
export const vehicles: VehicleRecord[] = [
  {
    id: "traveller-20",
    name: "20+1 Traveller",
    passengerSeats: 20,
    driverSeats: 1,
    airConditioned: true,
    featureIds: [
      "air-conditioning",
      "spacious-seating",
      "ample-legroom",
      "large-luggage-space",
      "audio-system",
      "clean-interior",
      "large-windows",
      "experienced-driver",
      "long-distance",
    ],
    status: "active",
    isPrimary: true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
]
