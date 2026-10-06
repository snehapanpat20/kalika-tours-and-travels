import { z } from "zod"
import { indianMobileSchema } from "@/lib/validation/common"

const emailSchema = z.string().trim().pipe(z.email())

export const registerCustomerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: indianMobileSchema,
  password: z.string().min(8).max(128),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>
export type LoginInput = z.infer<typeof loginSchema>
