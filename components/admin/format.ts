import type { EnquiryStatus, ReviewStatus, TravelType } from "@/generated/prisma/enums"

/** Labels and display helpers shared by the admin screens. */

export const statusOrder: EnquiryStatus[] = ["NEW", "CONTACTED", "CONFIRMED", "COMPLETED", "CANCELLED"]

export const statusLabels: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export const reviewStatusOrder: ReviewStatus[] = ["PENDING", "APPROVED", "REJECTED"]

export const reviewStatusLabels: Record<ReviewStatus, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" }

export const travelTypeOrder: TravelType[] = ["OUTSTATION", "FAMILY", "GROUP", "PILGRIMAGE", "CORPORATE"]

export const travelTypeLabels: Record<TravelType, string> = {
  OUTSTATION: "Outstation",
  FAMILY: "Family Tour",
  GROUP: "Group Tour",
  PILGRIMAGE: "Pilgrimage",
  CORPORATE: "Corporate",
}

export const sourceLabels: Record<string, string> = {
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  OTHER: "Other",
}

export const notificationLabels: Record<string, string> = {
  PENDING: "Sending…",
  SENT: "Email sent",
  FAILED: "Email failed",
  SKIPPED: "Email not configured",
}

/** "15 Nov 2026" for a YYYY-MM-DD calendar date. */
export function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  )
}

/** "1 Oct 2026, 2:01 pm" in India time, for timestamps. */
export function formatMoment(isoInstant: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(isoInstant))
}

/** "3 days" between two calendar dates, counting both ends as trip days. */
export function tripLength(from: string, to: string): string {
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
  return `${days} day${days === 1 ? "" : "s"}`
}

/** +919876543210 → +91 98765 43210 */
export function formatPhone(e164: string): string {
  const match = e164.match(/^\+91(\d{5})(\d{5})$/)
  return match ? `+91 ${match[1]} ${match[2]}` : e164
}
