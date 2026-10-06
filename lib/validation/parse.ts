import type { ZodType } from "zod"
import { AppError } from "@/lib/errors/app-error"
import { toFieldIssues } from "@/lib/validation/enquiry"

/** Parses `value` or throws a 422 listing each field problem. */
export function parseInput<T>(schema: ZodType<T>, value: unknown, message = "Please check the highlighted fields."): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new AppError("VALIDATION", message, 422, toFieldIssues(result.error))
  }
  return result.data
}
