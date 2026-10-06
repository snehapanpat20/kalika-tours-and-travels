import { z } from "zod"

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")

export const indianMobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number.")

export const optionalEmailSchema = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.email()]))
  .optional()
  .transform((value) => value || null)

export const optionalNotesSchema = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((value) => value || null)
