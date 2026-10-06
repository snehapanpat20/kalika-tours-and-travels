import "server-only"
import type { Enquiry } from "@/generated/prisma/client"
import { business } from "@/data/business"
import { getServerEnv } from "@/lib/config/env"
import { describeError, logger } from "@/server/api/logger"
import { sendMail } from "@/server/email/mailer"
import { buildNewEnquiryEmail } from "@/server/email/new-enquiry-email"
import { markNotification, serializeEnquiry } from "@/server/enquiries/service"

/**
 * Emails the business about a new enquiry and records the outcome.
 * Runs after the customer has their response; it never throws, because the
 * enquiry is already safely stored.
 */
export async function notifyBusinessOfEnquiry(enquiry: Enquiry): Promise<void> {
  const to = getServerEnv().NOTIFY_EMAIL ?? business.email
  try {
    const email = buildNewEnquiryEmail(serializeEnquiry(enquiry))
    const result = await sendMail({ to, ...email, replyTo: enquiry.email ?? undefined })
    await markNotification(enquiry.id, result === "sent" ? "SENT" : "SKIPPED")
    logger.info("enquiry_notification", { enquiryId: enquiry.id, result })
  } catch (error) {
    logger.error("enquiry_notification_failed", { enquiryId: enquiry.id, ...describeError(error) })
    await markNotification(enquiry.id, "FAILED").catch(() => undefined)
  }
}
