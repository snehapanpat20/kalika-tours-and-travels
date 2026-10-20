/**
 * Operating rules supplied by the business.
 * Later modules must read these values instead of inventing policy.
 * passengerCapacity and driverSeats describe the 20 seater Traveller (used in the
 * site's text). maxGroupSize is the largest group one enquiry can be for, across
 * the whole fleet (the trip form and the enquiry API check it).
 * The fleet itself lives in the vehicles table and can grow beyond that vehicle.
 */
export const businessRules = {
  passengerCapacity: 20,
  driverSeats: 1,
  maxGroupSize: 60,
  nightTravelAllowed: true,
  oneWayTripsOffered: true,
  cancellationAllowedAfterConfirmation: false,
  refundAfterConfirmedBooking: false,
  tollsParkingAndDriverAllowance: "separate-where-applicable",
  pricing: "custom-quote",
  quoteFlow: "enquiry",
  bookingFlow: "request-until-admin-confirms",
} as const

export type BusinessRules = typeof businessRules
