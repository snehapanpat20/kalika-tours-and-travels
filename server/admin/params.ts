import "server-only"
import { AppError } from "@/lib/errors/app-error"
import { enquiryIdSchema } from "@/server/admin/schemas"

export type EnquiryRouteContext = { params: Promise<{ id: string }> }

/** A malformed id can never exist, so it is reported as not found. */
export async function readEnquiryId(context: EnquiryRouteContext): Promise<string> {
  const parsed = enquiryIdSchema.safeParse((await context.params).id)
  if (!parsed.success) throw new AppError("NOT_FOUND", "Enquiry not found.", 404)
  return parsed.data
}

export type IdRouteContext = EnquiryRouteContext

/** Same as readEnquiryId, for other content (gallery items, reviews). */
export async function readContentId(context: IdRouteContext, label: string): Promise<string> {
  const parsed = enquiryIdSchema.safeParse((await context.params).id)
  if (!parsed.success) throw new AppError("NOT_FOUND", `${label} not found.`, 404)
  return parsed.data
}
