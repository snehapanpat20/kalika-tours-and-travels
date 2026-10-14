"use client"

import { useRouter } from "next/navigation"
import { useId, useState, useSyncExternalStore, type FormEvent } from "react"
import { ArrowRight } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { planPath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"
import { MAX_PASSENGERS } from "@/lib/validation/enquiry"

const noSubscribe = () => () => {}
/** Today in the visitor's time zone, as YYYY-MM-DD. */
function localDate() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

const field =
  "min-h-11 w-full rounded-control border border-white/20 bg-white/10 px-3.5 text-[0.9375rem] text-white placeholder:text-white/50 focus:border-highlight focus:ring-2 focus:ring-highlight/40 focus:outline-none [color-scheme:dark]"

/**
 * A compact quote form for the Services page's closing band: destination,
 * number of people and travel date. It makes no booking and calls no API: it
 * opens the trip planner with those three values filled in
 * (`?destination=&people=&date=`), where the visitor completes the enquiry.
 */
export function QuoteForm({ locale, copy, submit }: { locale: Locale; copy: Dictionary["pageCtas"]["quote"]; submit: string }) {
  const router = useRouter()
  const id = useId()
  const [destination, setDestination] = useState("")
  const [people, setPeople] = useState("")
  const [date, setDate] = useState("")

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The browser has already checked the required fields, the number range and the date
    if (!event.currentTarget.reportValidity()) return
    router.push(planPath(locale, { destination: destination.trim().slice(0, 80), people, date }))
  }

  // Read after mount: the page is prerendered, so the build date is not "today"
  const today = useSyncExternalStore(noSubscribe, localDate, () => undefined)

  return (
    <form onSubmit={onSubmit} aria-label={copy.label} className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/5 p-4 sm:grid-cols-2 sm:p-5">
      <div className="grid gap-1.5 sm:col-span-2">
        <label htmlFor={`${id}-destination`} className="text-xs font-semibold text-white/80">
          {copy.destination}
        </label>
        <input
          id={`${id}-destination`}
          type="text"
          name="destination"
          required
          maxLength={80}
          autoComplete="off"
          placeholder={copy.destinationPlaceholder}
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          className={field}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-people`} className="text-xs font-semibold text-white/80">
          {copy.people}
        </label>
        <input
          id={`${id}-people`}
          type="number"
          name="people"
          required
          inputMode="numeric"
          min={1}
          max={MAX_PASSENGERS}
          step={1}
          value={people}
          onChange={(event) => setPeople(event.target.value)}
          className={field}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-date`} className="text-xs font-semibold text-white/80">
          {copy.date}
        </label>
        <input
          id={`${id}-date`}
          type="date"
          name="date"
          required
          min={today}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className={field}
        />
      </div>
      <button
        type="submit"
        className={cn(
          "group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-button bg-coral px-6 text-[0.9375rem] font-bold text-on-coral transition duration-300 hover:bg-coral-deep motion-safe:hover:-translate-y-0.5 sm:col-span-2",
          focusRing,
        )}
      >
        {submit}
        <ArrowRight aria-hidden="true" strokeWidth={2.2} className="nudge size-4" />
      </button>
    </form>
  )
}
