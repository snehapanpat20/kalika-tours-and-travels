import "server-only"
import { business } from "@/data/business"
import type { SerializedEnquiry } from "@/server/enquiries/service"

const travelTypeLabels: Record<SerializedEnquiry["travelType"], string> = {
  OUTSTATION: "Outstation Trip",
  FAMILY: "Family Tour",
  GROUP: "Group Tour",
  PILGRIMAGE: "Pilgrimage Tour",
  CORPORATE: "Corporate Trip",
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char)

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`))

const formatInstant = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso)) + " IST"

/** The "new enquiry" email sent to the business. */
export function buildNewEnquiryEmail(enquiry: SerializedEnquiry) {
  const rows: [string, string][] = [
    ["Customer name", enquiry.fullName],
    ["Phone", enquiry.phone],
    ["Email", enquiry.email ?? "Not given"],
    ["Travel type", travelTypeLabels[enquiry.travelType]],
    ["Destination", enquiry.destination],
    ["Travel date", formatDay(enquiry.travelDate)],
    ["Return date", formatDay(enquiry.returnDate)],
    ["Passengers", String(enquiry.passengerCount)],
    ["Message", enquiry.message ?? "None"],
    ["Language", enquiry.locale === "mr" ? "Marathi" : "English"],
    ["Enquiry ID", enquiry.id],
    ["Received", formatInstant(enquiry.createdAt)],
  ]

  const subject = `New enquiry: ${enquiry.destination} · ${enquiry.passengerCount} passenger${enquiry.passengerCount === 1 ? "" : "s"} · ${formatDay(enquiry.travelDate)}`
  const phoneDigits = enquiry.phone.replace(/\D/g, "")

  const text = [
    "A new travel enquiry was submitted on the website.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Call: tel:${enquiry.phone}`,
    `WhatsApp: https://wa.me/${phoneDigits}`,
    "",
    "This is an enquiry, not a confirmed booking.",
  ].join("\n")

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f8f4;font-family:Arial,Helvetica,sans-serif;color:#17201e">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #dbe0d5" cellpadding="0" cellspacing="0">
    <tr><td style="padding:24px 24px 8px">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#0e7469;font-weight:bold">${escapeHtml(business.name)}</p>
      <h1 style="margin:8px 0 0;font-size:22px;color:#0b3d35">New travel enquiry</h1>
    </td></tr>
    <tr><td style="padding:16px 24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#55615d;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;font-weight:bold;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
          )
          .join("\n        ")}
      </table>
    </td></tr>
    <tr><td style="padding:8px 24px 24px">
      <a href="tel:${escapeHtml(enquiry.phone)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 18px;border-radius:999px;background:#0b3d35;color:#ffffff;text-decoration:none;font-weight:bold">Call customer</a>
      <a href="https://wa.me/${phoneDigits}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 18px;border-radius:999px;background:#1f9d55;color:#ffffff;text-decoration:none;font-weight:bold">WhatsApp customer</a>
      <p style="margin:12px 0 0;font-size:12px;color:#55615d">This is an enquiry, not a confirmed booking.</p>
    </td></tr>
  </table>
</body></html>`

  return { subject, text, html }
}
