"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { WhatsAppIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { business } from "@/data/business"
import { businessRules } from "@/lib/config/business-rules"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { ApiError } from "@/lib/api/client"
import { submitEnquiry } from "@/lib/api/enquiries"
import { cn } from "@/lib/utils/cn"
import { enquiryInputSchema, enquiryMessages, toFieldIssues, travelTypeByService, type EnquiryInput } from "@/lib/validation/enquiry"
import type { FieldIssue } from "@/lib/errors/app-error"
import type { ServiceId } from "@/types/catalog"

type PlanCopy = Dictionary["home"]["plan"]
type ErrorKey = keyof PlanCopy["errors"]
/** Each form field, named as on screen. */
type Slot = "name" | "phone" | "email" | "serviceId" | "destination" | "departureDate" | "returnDate" | "vehicle" | "passengers" | "notes"

/** API field → form field. */
const slotByField: Record<string, Slot> = {
  fullName: "name",
  phone: "phone",
  email: "email",
  travelType: "serviceId",
  destination: "destination",
  travelDate: "departureDate",
  returnDate: "returnDate",
  passengerCount: "passengers",
  message: "notes",
}

/** API message → translated message. Unknown messages fall back to the field's general text. */
const errorKeyByMessage: Record<string, ErrorKey> = {
  [enquiryMessages.fullNameRequired]: "name",
  [enquiryMessages.fullNameInvalid]: "nameInvalid",
  [enquiryMessages.phoneInvalid]: "phone",
  [enquiryMessages.emailInvalid]: "email",
  [enquiryMessages.travelTypeInvalid]: "serviceId",
  [enquiryMessages.destinationRequired]: "destination",
  [enquiryMessages.destinationInvalid]: "destination",
  [enquiryMessages.travelDateInvalid]: "departureDate",
  [enquiryMessages.travelDatePast]: "departurePast",
  [enquiryMessages.travelDateTooFar]: "departureTooFar",
  [enquiryMessages.returnDateInvalid]: "returnMissing",
  [enquiryMessages.returnBeforeTravel]: "returnDate",
  [enquiryMessages.passengerCountInvalid]: "passengers",
  [enquiryMessages.messageTooLong]: "notes",
  [enquiryMessages.messageLinks]: "notesLinks",
}

type Outcome =
  | { kind: "idle" }
  | { kind: "success"; enquiryId: string; whatsappHref: string }
  | { kind: "error"; message: string }
/** A choice in "Choose Your Vehicle": its name in the visitor's language and in English (for the business). */
export type VehicleOption = { id: string; name: string; english: string }

type FormProps = {
  locale: Locale
  copy: PlanCopy
  services: { id: ServiceId; name: string }[]
  /** The vehicles from data/fleet.ts; "Other / Help Me Choose" is added here. */
  vehicles: VehicleOption[]
  oneWay: string
}

/** The "Other / Help Me Choose" choice. */
const otherVehicle = "other"

const noSubscribe = () => () => {}

/** 15 Nov 2026 / १५ नोव्हें, २०२६ */
function formatDay(isoDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  )
}

function localDate() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

/**
 * Reads `?service=` and `?destination=` (set by the journey and destination
 * cards), `?vehicle=` (set by the Our Fleet cards), and `?people=` and
 * `?date=` (set by the quick quote form). Values
 * that aren't a whole number or a YYYY-MM-DD date are ignored; the form's own
 * checks still apply on sending.
 */
export function PlanFormFromUrl(props: FormProps) {
  const params = useSearchParams()
  const key = params.toString()

  // Next.js does not hash-scroll when only the query changes, so bring the form into view
  useEffect(() => {
    if (!key) return
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // After the router has committed the navigation
    const timer = window.setTimeout(() => {
      document.getElementById("plan")?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [key])

  const people = params.get("people") ?? ""
  const date = params.get("date") ?? ""
  const vehicle = params.get("vehicle") ?? ""
  return (
    <PlanForm
      {...props}
      requestedService={params.get("service") ?? ""}
      requestedDestination={(params.get("destination") ?? "").slice(0, 80)}
      requestedPassengers={/^\d{1,3}$/.test(people) ? people : ""}
      requestedDate={/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ""}
      requestedVehicle={vehicle === otherVehicle || props.vehicles.some((option) => option.id === vehicle) ? vehicle : ""}
    />
  )
}

/** Added to the message of a one-way enquiry. In English, because the business reads it. */
const oneWayMarker = "[One-way trip]"

/**
 * The chosen vehicle, added to the start of the message in English (e.g.
 * "[Vehicle: 26-Seater AC Bus]"). The enquiry record has no vehicle column, so
 * this is how it reaches the admin panel, the notification email and the
 * enquiry list without a database change; older enquiries simply have none.
 */
function vehicleMarker(vehicleId: string, vehicles: VehicleOption[]): string {
  if (vehicleId === otherVehicle) return "[Vehicle: Other / help me choose]"
  const option = vehicles.find((item) => item.id === vehicleId)
  return option ? `[Vehicle: ${option.english}]` : ""
}

export function PlanForm({
  locale,
  copy,
  services,
  vehicles,
  oneWay,
  requestedService = "",
  requestedDestination = "",
  requestedPassengers = "",
  requestedDate = "",
  requestedVehicle = "",
}: FormProps & { requestedService?: string; requestedDestination?: string; requestedPassengers?: string; requestedDate?: string; requestedVehicle?: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const serviceFromUrl = services.some((service) => service.id === requestedService) ? requestedService : ""

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [chosenService, setChosenService] = useState<string | null>(null)
  const [typedDestination, setTypedDestination] = useState<string | null>(null)
  const [departureDate, setDepartureDate] = useState(requestedDate)
  const [returnDate, setReturnDate] = useState("")
  const [oneWayTrip, setOneWayTrip] = useState(false)
  const [vehicle, setVehicle] = useState(requestedVehicle)
  const [passengers, setPassengers] = useState(requestedPassengers)
  const [notes, setNotes] = useState("")
  const [website, setWebsite] = useState("")
  const [errors, setErrors] = useState<Partial<Record<Slot, string>>>({})
  const [attempt, setAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" })

  // A newer card click in the page overrides an earlier choice
  const [seen, setSeen] = useState({ service: serviceFromUrl, destination: requestedDestination, passengers: requestedPassengers, date: requestedDate, vehicle: requestedVehicle })
  if (
    seen.service !== serviceFromUrl ||
    seen.destination !== requestedDestination ||
    seen.passengers !== requestedPassengers ||
    seen.date !== requestedDate ||
    seen.vehicle !== requestedVehicle
  ) {
    setSeen({ service: serviceFromUrl, destination: requestedDestination, passengers: requestedPassengers, date: requestedDate, vehicle: requestedVehicle })
    if (seen.vehicle !== requestedVehicle) setVehicle(requestedVehicle)
    if (seen.service !== serviceFromUrl) setChosenService(null)
    if (seen.destination !== requestedDestination) setTypedDestination(null)
    if (seen.passengers !== requestedPassengers) setPassengers(requestedPassengers)
    if (seen.date !== requestedDate) setDepartureDate(requestedDate)
  }

  const serviceId = chosenService ?? serviceFromUrl
  const destination = typedDestination ?? requestedDestination
  // Set after mount: the page is prerendered, so the build date is not "today"
  const today = useSyncExternalStore(noSubscribe, localDate, () => undefined)

  // Move focus to the first field that needs attention
  useEffect(() => {
    if (!attempt) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempt])

  function showFieldErrors(issues: FieldIssue[], extra: Partial<Record<Slot, string>> = {}) {
    const next: Partial<Record<Slot, string>> = { ...extra }
    for (const issue of issues) {
      const slot = slotByField[issue.field]
      if (!slot || next[slot]) continue
      next[slot] = copy.errors[errorKeyByMessage[issue.message] ?? (slot as ErrorKey)]
    }
    setErrors(next)
    setAttempt((value) => value + 1)
  }

  function resetForm() {
    setName("")
    setPhone("")
    setEmail("")
    setChosenService("")
    setTypedDestination("")
    setDepartureDate("")
    setReturnDate("")
    setOneWayTrip(false)
    setVehicle("")
    setPassengers("")
    setNotes("")
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const payload: EnquiryInput = {
      fullName: name,
      phone,
      email,
      travelType: (serviceId ? travelTypeByService[serviceId as ServiceId] : "") as EnquiryInput["travelType"],
      destination,
      travelDate: departureDate,
      // The enquiry record always has a return date. A one-way trip sends the travel
      // date for both and says so in the message, so the business sees it at once.
      returnDate: oneWayTrip ? departureDate : returnDate,
      passengerCount: passengers,
      message: [vehicleMarker(vehicle, vehicles), oneWayTrip ? oneWayMarker : "", notes.trim()].filter(Boolean).join(" "),
      locale,
      website,
    }

    // Same rules the server applies, so most mistakes are caught instantly
    const checked = enquiryInputSchema.safeParse(payload)
    // The vehicle is required by the form; the enquiry API itself stays as it was
    const vehicleError: Partial<Record<Slot, string>> = vehicle ? {} : { vehicle: copy.errors.vehicle }
    if (!checked.success || !vehicle) {
      setOutcome({ kind: "idle" })
      showFieldErrors(checked.success ? [] : toFieldIssues(checked.error), vehicleError)
      return
    }

    setErrors({})
    setSubmitting(true)
    setOutcome({ kind: "idle" })

    try {
      const { enquiryId } = await submitEnquiry(payload)
      const data = checked.data
      const serviceName = services.find((service) => service.id === serviceId)?.name ?? ""
      const whatsappMessage = copy.whatsappMessage
        .replace("{service}", serviceName)
        .replace("{destination}", data.destination)
        .replace("{passengers}", String(data.passengerCount))
        .replace("{from}", formatDay(data.travelDate, locale))
        .replace("{to}", formatDay(data.returnDate, locale))
        .replace("{reference}", enquiryId.slice(0, 8).toUpperCase())
      const url = new URL(business.whatsappUrl)
      url.searchParams.set("text", whatsappMessage)
      setOutcome({ kind: "success", enquiryId, whatsappHref: url.toString() })
      resetForm()
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION" && error.errors.length) {
        showFieldErrors(error.errors)
        return
      }
      const message =
        error instanceof ApiError && error.code === "RATE_LIMITED"
          ? copy.errorRateLimit
          : error instanceof ApiError && (error.code === "NETWORK" || error.code === "TIMEOUT")
            ? copy.errorNetwork
            : copy.errorGeneric
      setOutcome({ kind: "error", message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form ref={formRef} className="grid gap-6" onSubmit={onSubmit} noValidate aria-busy={submitting || undefined}>
      {/* Spam trap: invisible to people and to screen readers; bots tend to fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
      </div>
      <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
        <Field label={copy.name} error={errors.name}>
          {(field) => (
            <Input id={field.id} name="name" autoComplete="name" value={name} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setName(event.target.value)} />
          )}
        </Field>
        <Field label={copy.phone} error={errors.phone}>
          {(field) => (
            <Input
              id={field.id}
              name="phone"
              type="tel"
              autoComplete="tel-national"
              inputMode="numeric"
              value={phone}
              invalid={field.invalid}
              describedBy={field.describedBy}
              onChange={(event) => setPhone(event.target.value)}
            />
          )}
        </Field>
        <Field label={copy.service} error={errors.serviceId}>
          {(field) => (
            <Select id={field.id} name="service" value={serviceId} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setChosenService(event.target.value)}>
              <option value="">{copy.servicePlaceholder}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={copy.destination} error={errors.destination}>
          {(field) => (
            <Input
              id={field.id}
              name="destination"
              placeholder={copy.destinationHint}
              value={destination}
              invalid={field.invalid}
              describedBy={field.describedBy}
              onChange={(event) => setTypedDestination(event.target.value)}
            />
          )}
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold text-forest">{copy.tripKind}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: false, label: copy.tripType },
              { value: true, label: copy.oneWayTrip },
            ].map((option) => (
              <label
                key={option.label}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-button px-4 text-sm font-medium ring-1 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-teal",
                  oneWayTrip === option.value ? "bg-forest text-white ring-forest" : "bg-white text-forest ring-line hover:bg-stone",
                )}
              >
                <input type="radio" name="tripKind" className="sr-only" checked={oneWayTrip === option.value} onChange={() => setOneWayTrip(option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={copy.departure} error={errors.departureDate}>
          {(field) => (
            <Input id={field.id} name="departure" type="date" min={today} value={departureDate} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setDepartureDate(event.target.value)} />
          )}
        </Field>
        {oneWayTrip ? null : (
          <Field label={copy.return} error={errors.returnDate}>
            {(field) => (
              <Input id={field.id} name="return" type="date" min={departureDate || today} value={returnDate} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setReturnDate(event.target.value)} />
            )}
          </Field>
        )}
        <Field label={copy.vehicle} hint={copy.vehicleHint} error={errors.vehicle}>
          {(field) => (
            <Select id={field.id} name="vehicle" required value={vehicle} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setVehicle(event.target.value)}>
              <option value="">{copy.vehiclePlaceholder}</option>
              {vehicles.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
              <option value={otherVehicle}>{copy.vehicleOther}</option>
            </Select>
          )}
        </Field>
        <Field label={copy.passengers} hint={copy.passengersHint} error={errors.passengers}>
          {(field) => (
            <Input
              id={field.id}
              name="passengers"
              type="number"
              inputMode="numeric"
              min={1}
              max={businessRules.maxGroupSize}
              step={1}
              value={passengers}
              invalid={field.invalid}
              describedBy={field.describedBy}
              onChange={(event) => setPassengers(event.target.value)}
            />
          )}
        </Field>
        <Field label={`${copy.email} (${copy.optional})`} error={errors.email}>
          {(field) => (
            <Input id={field.id} name="email" type="email" autoComplete="email" value={email} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setEmail(event.target.value)} />
          )}
        </Field>
      </div>

      <Field label={`${copy.notes} (${copy.optional})`} error={errors.notes}>
        {(field) => (
          <Textarea
            id={field.id}
            name="notes"
            rows={3}
            placeholder={copy.notesPlaceholder}
            value={notes}
            invalid={field.invalid}
            describedBy={field.describedBy}
            onChange={(event) => setNotes(event.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted sm:max-w-xs">{oneWay}</p>
        <Button type="submit" size="lg" className="w-full sm:w-auto" loading={submitting} icon={<Send aria-hidden="true" strokeWidth={2} className="-ml-1 size-[1.125rem]" />}>
          {submitting ? copy.submitting : copy.submit}
        </Button>
      </div>

      <div aria-live="polite">
        {outcome.kind === "success" ? (
          <div role="status" className="rounded-control bg-success-soft px-4 py-4 text-sm leading-6 text-forest sm:px-5">
            <p className="font-bold">{copy.successTitle}</p>
            <p className="mt-1">{copy.successBody}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href={outcome.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 font-bold text-teal-deep underline underline-offset-2"
              >
                <WhatsAppIcon className="size-4 text-whatsapp" />
                {copy.whatsappFollowUp}
              </a>
              <button type="button" onClick={() => setOutcome({ kind: "idle" })} className="inline-flex min-h-11 items-center font-semibold text-muted underline underline-offset-2 hover:text-forest">
                {copy.sendAnother}
              </button>
            </div>
          </div>
        ) : null}
        {outcome.kind === "error" ? (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm leading-6 text-danger">
            {outcome.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
