import type { Locale } from "@/lib/i18n/locales"
import type { ServiceId } from "@/types/catalog"

/** Decimal rupees with two fraction digits, such as "15000.00". */
export type MoneyInr = string

export const enquiryStatuses = ["new", "in-review", "quoted", "closed"] as const
export type EnquiryStatus = (typeof enquiryStatuses)[number]

export const quoteStatuses = ["draft", "sent", "accepted", "declined", "expired"] as const
export type QuoteStatus = (typeof quoteStatuses)[number]

export const quoteAdjustmentKinds = ["charge", "discount"] as const
export type QuoteAdjustmentKind = (typeof quoteAdjustmentKinds)[number]

/**
 * Confirmed bookings cannot be cancelled. A request may be declined by the
 * business, or withdrawn by the customer, only before confirmation.
 */
export const bookingStatuses = ["requested", "confirmed", "declined", "withdrawn", "completed"] as const
export type BookingStatus = (typeof bookingStatuses)[number]

export const bookingPaymentStatuses = ["unpaid", "partial", "paid"] as const
export type BookingPaymentStatus = (typeof bookingPaymentStatuses)[number]

export const paymentStatuses = ["pending", "verification-required", "verified", "failed"] as const
export type PaymentStatus = (typeof paymentStatuses)[number]

export const tripTypes = ["round-trip"] as const
export type TripType = (typeof tripTypes)[number]

export const contactStatuses = ["new", "read", "archived"] as const
export type ContactStatus = (typeof contactStatuses)[number]

export const notificationChannels = ["email", "whatsapp", "in-app"] as const
export type NotificationChannel = (typeof notificationChannels)[number]

export const notificationStatuses = ["pending", "sent", "failed"] as const
export type NotificationStatus = (typeof notificationStatuses)[number]

export const availabilityStatuses = ["available", "blocked", "booked"] as const
export type AvailabilityStatus = (typeof availabilityStatuses)[number]

export type Customer = {
  id: string
  userId: string | null
  name: string
  phone: string
  email: string | null
  locale: Locale
  createdAt: string
  updatedAt: string
}

export type AdminProfile = {
  id: string
  userId: string
  name: string
  createdAt: string
  updatedAt: string
}

export type Enquiry = {
  id: string
  customerId: string | null
  locale: Locale
  name: string
  phone: string
  email: string | null
  serviceId: ServiceId
  destinationId: string | null
  destinationLabel: string
  travelDate: string
  returnDate: string | null
  passengerCount: number
  tripType: TripType
  pickupLocation: string | null
  requirements: string | null
  notes: string | null
  status: EnquiryStatus
  createdAt: string
  updatedAt: string
}

export type Quote = {
  id: string
  enquiryId: string
  customerId: string | null
  vehicleId: string | null
  destinationId: string | null
  tourId: string | null
  destinationLabel: string
  travelDate: string
  returnDate: string | null
  passengerCount: number
  tripType: TripType
  pickupLocation: string | null
  requirements: string | null
  baseAmountInr: MoneyInr
  additionalChargesInr: MoneyInr
  discountInr: MoneyInr
  finalAmountInr: MoneyInr
  validUntil: string | null
  status: QuoteStatus
  notes: string | null
  inclusions: string | null
  exclusions: string | null
  createdAt: string
  updatedAt: string
}

export type QuoteAdjustment = {
  id: string
  quoteId: string
  kind: QuoteAdjustmentKind
  label: string
  amountInr: MoneyInr
  createdAt: string
}

export type Booking = {
  id: string
  customerId: string | null
  vehicleId: string | null
  destinationId: string | null
  tourId: string | null
  enquiryId: string | null
  quoteId: string | null
  destinationLabel: string
  travelDate: string
  returnDate: string | null
  passengerCount: number
  tripType: TripType
  pickupLocation: string | null
  requirements: string | null
  status: BookingStatus
  paymentStatus: BookingPaymentStatus
  totalAmountInr: MoneyInr
  amountPaidInr: MoneyInr
  remainingAmountInr: MoneyInr
  createdAt: string
  updatedAt: string
  confirmedAt: string | null
}

export type BookingPassenger = {
  id: string
  bookingId: string
  fullName: string
  age: number | null
  phone: string | null
  isLead: boolean
  createdAt: string
  updatedAt: string
}

export type Payment = {
  id: string
  bookingId: string
  amountInr: MoneyInr
  provider: string
  providerPaymentId: string | null
  orderId: string | null
  providerSignature: string | null
  providerReference: string | null
  status: PaymentStatus
  createdAt: string
  updatedAt: string
}

export type ContactMessage = {
  id: string
  name: string
  phone: string
  email: string | null
  message: string
  locale: Locale
  status: ContactStatus
  createdAt: string
  updatedAt: string
  readAt: string | null
}

export type NotificationRecord = {
  id: string
  userId: string | null
  channel: NotificationChannel
  recipient: string
  subject: string | null
  body: string
  locale: Locale
  status: NotificationStatus
  error: string | null
  createdAt: string
  updatedAt: string
  sentAt: string | null
}

export type AvailabilityBlock = {
  id: string
  vehicleId: string
  startsOn: string
  endsOn: string
  status: AvailabilityStatus
  bookingId: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export type SiteSetting = {
  id: string
  value: Record<string, unknown>
  updatedAt: string
}
