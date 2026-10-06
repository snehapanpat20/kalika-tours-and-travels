export { parseInput } from "@/lib/validation/parse"
export { bookingRequestSchema, type BookingRequestInput } from "@/lib/validation/booking"
export {
  enquiryInputSchema,
  enquiryMessages,
  normalizeIndianPhone,
  todayInIndia,
  travelTypeByService,
  travelTypes,
  type EnquiryData,
  type EnquiryInput,
  type TravelType,
} from "@/lib/validation/enquiry"
export { loginSchema, registerCustomerSchema, type LoginInput, type RegisterCustomerInput } from "@/lib/validation/auth"
export { quoteDraftSchema, type QuoteDraftInput } from "@/lib/validation/quote"
export { indianMobileSchema, isoDateSchema } from "@/lib/validation/common"
