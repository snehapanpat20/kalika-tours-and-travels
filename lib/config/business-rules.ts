/**
 * Operating rules supplied by the business.
 * Later modules must read these values instead of inventing policy.
 * passengerCapacity and driverSeats describe the current primary vehicle.
 * The fleet itself lives in the vehicles table and can grow beyond that vehicle.
 */
export const businessRules = {
  passengerCapacity: 20,
  driverSeats: 1,
  nightTravelAllowed: true,
  oneWayTripsOffered: false,
  cancellationAllowedAfterConfirmation: false,
  refundAfterConfirmedBooking: false,
  tollsParkingAndDriverAllowance: "separate-where-applicable",
  pricing: "custom-quote",
  quoteFlow: "enquiry",
  bookingFlow: "request-until-admin-confirms",
} as const

export type BusinessRules = typeof businessRules
