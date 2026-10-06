import { z } from "zod"
import { businessRules } from "@/lib/config/business-rules"
import { isoDateSchema } from "@/lib/validation/common"

export const bookingRequestSchema = z
  .object({
    quoteId: z.string().trim().min(1).nullable(),
    enquiryId: z.string().trim().min(1).nullable(),
    passengerCount: z.number().int().min(1).max(businessRules.passengerCapacity),
    departureDate: isoDateSchema,
    returnDate: isoDateSchema,
    tripType: z.literal("round-trip"),
  })
  .refine((value) => value.quoteId !== null || value.enquiryId !== null, {
    message: "A booking request needs an enquiry or a quote.",
    path: ["enquiryId"],
  })
  .refine((value) => value.returnDate >= value.departureDate, {
    path: ["returnDate"],
    message: "Return date must be on or after the departure date.",
  })

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>
