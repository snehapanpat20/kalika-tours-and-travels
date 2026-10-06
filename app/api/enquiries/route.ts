import { after } from "next/server"
import { enquiryInputSchema } from "@/lib/validation/enquiry"
import { parseInput } from "@/lib/validation/parse"
import { apiRoute, ok, preflight, readJsonBody } from "@/server/api/http"
import { logger } from "@/server/api/logger"
import { enforceRateLimit, getClientIp, rateLimits } from "@/server/api/rate-limit"
import { notifyBusinessOfEnquiry } from "@/server/enquiries/notify"
import { createEnquiry } from "@/server/enquiries/service"

const successMessage = "Your enquiry has been submitted successfully."

/**
 * POST /api/enquiries: a visitor asks about a trip.
 * Validate → store → respond → email the business (after the response).
 */
export const POST = apiRoute(
  async (request) => {
    const ip = getClientIp(request)
    await enforceRateLimit(rateLimits.enquiryBurst, ip)
    await enforceRateLimit(rateLimits.enquiryDaily, ip)

    const body = await readJsonBody(request, 8 * 1024)
    const data = parseInput(enquiryInputSchema, body)

    // Honeypot filled in: answer like a success so the bot learns nothing, but store nothing.
    if (data.website) {
      logger.warn("enquiry_spam_dropped", { reason: "honeypot" })
      return ok({ enquiryId: crypto.randomUUID() }, { status: 201, message: successMessage })
    }

    await enforceRateLimit(rateLimits.enquiryPerPhone, data.phone)
    await enforceRateLimit(rateLimits.enquiryGlobal, "all")

    const { enquiry, duplicate } = await createEnquiry(data)

    if (!duplicate) {
      // The customer is not kept waiting for email delivery, and a failed email never loses the enquiry.
      after(() => notifyBusinessOfEnquiry(enquiry))
    }

    return ok({ enquiryId: enquiry.id }, { status: duplicate ? 200 : 201, message: successMessage })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST"])
