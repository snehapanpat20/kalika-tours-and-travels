import { z } from "zod"

export const quoteDraftSchema = z.object({
  enquiryId: z.string().trim().min(1),
  amountInr: z.number().finite().positive().nullable(),
  inclusions: z.string().trim().max(2000).nullable(),
  exclusions: z.string().trim().max(2000).nullable(),
})

export type QuoteDraftInput = z.infer<typeof quoteDraftSchema>
