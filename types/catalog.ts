import type { LocalizedText } from "@/lib/i18n/locales"

export const serviceIds = ["outstation", "family", "group", "pilgrimage", "corporate"] as const

export type ServiceId = (typeof serviceIds)[number]

export const vehicleFeatureIds = [
  "air-conditioning",
  "spacious-seating",
  "ample-legroom",
  "large-luggage-space",
  "audio-system",
  "clean-interior",
  "large-windows",
  "experienced-driver",
  "long-distance",
] as const

export type VehicleFeatureId = (typeof vehicleFeatureIds)[number]

export const vehicleStatuses = ["active", "maintenance", "retired"] as const
export type VehicleStatus = (typeof vehicleStatuses)[number]

export type ServiceRecord = {
  id: ServiceId
  sortOrder: number
  active: boolean
  name: LocalizedText
  summary: LocalizedText
  createdAt: string
  updatedAt: string
}

export type VehicleRecord = {
  id: string
  name: string
  passengerSeats: number
  driverSeats: number
  airConditioned: boolean
  featureIds: VehicleFeatureId[]
  status: VehicleStatus
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export type Destination = {
  id: string
  slug: string
  name: LocalizedText
  region: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type Tour = {
  id: string
  destinationId: string
  serviceId: ServiceId
  slug: string
  name: LocalizedText
  summary: LocalizedText | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type TourItineraryDay = {
  id: string
  tourId: string
  dayNumber: number
  title: LocalizedText
  body: LocalizedText
  createdAt: string
  updatedAt: string
}

export type Faq = {
  id: string
  question: LocalizedText
  answer: LocalizedText
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}
