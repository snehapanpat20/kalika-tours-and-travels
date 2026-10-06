/**
 * Scheduling for offers and announcements. The status is always worked out
 * from the dates at the moment of asking, so an offer turns itself on at its
 * start time and off at its end time without anyone touching it.
 * Times are entered and shown in India time (IST, UTC+05:30).
 */
export type ScheduleStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED"

export const scheduleStatuses: ScheduleStatus[] = ["DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED"]

export const scheduleLabels: Record<ScheduleStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  EXPIRED: "Expired",
}

type Schedulable = { published: boolean; startsAt: string | Date | null; endsAt: string | Date | null }

const time = (value: string | Date | null) => (value === null ? null : new Date(value).getTime())

export function scheduleStatus(item: Schedulable, now: Date = new Date()): ScheduleStatus {
  const start = time(item.startsAt)
  const end = time(item.endsAt)
  const at = now.getTime()
  // An ended item reads as expired even if it is still marked published
  if (end !== null && end <= at) return "EXPIRED"
  if (!item.published) return "DRAFT"
  if (start !== null && start > at) return "SCHEDULED"
  return "ACTIVE"
}

const IST_OFFSET_MINUTES = 330

/** "2026-10-10T09:30" entered in an IST form field → the exact moment. */
export function fromIstInput(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, y, mo, d, h, mi] = match.map(Number)
  const utc = Date.UTC(y, mo - 1, d, h, mi) - IST_OFFSET_MINUTES * 60_000
  const date = new Date(utc)
  // Rejects impossible dates such as 2026-02-31
  const check = new Date(utc + IST_OFFSET_MINUTES * 60_000)
  return check.getUTCFullYear() === y && check.getUTCMonth() === mo - 1 && check.getUTCDate() === d ? date : null
}

/** The moment → "2026-10-10T09:30" for an IST datetime-local form field. */
export function toIstInput(value: string | Date | null): string {
  if (!value) return ""
  const ist = new Date(new Date(value).getTime() + IST_OFFSET_MINUTES * 60_000)
  return ist.toISOString().slice(0, 16)
}

/** "10 Oct 2026, 9:30 am" in India time. */
export function formatIst(value: string | Date | null): string {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value))
}
