"use client"

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { ImagePlus, Send, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { focusRing } from "@/components/ui/styles"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { submitReview } from "@/lib/api/reviews"
import type { FieldIssue } from "@/lib/errors/app-error"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/cn"
import { useFilePreview } from "@/components/media/use-file-preview"
import { REVIEW_PHOTO_MAX_BYTES, REVIEW_TEXT_MAX, reviewFieldIssues, reviewInputSchema, reviewMessages } from "@/lib/validation/review"
import type { TravelTypeKey } from "@/types/home"

type Copy = Dictionary["pages"]["reviews"]["form"]
type Slot = "customerName" | "destination" | "rating" | "reviewText" | "photo" | "tripType"

const photoTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"]
const tripTypeOrder: TravelTypeKey[] = ["FAMILY", "GROUP", "PILGRIMAGE", "CORPORATE", "OUTSTATION"]

/** Server/client messages → translated text. */
function translate(issue: FieldIssue, copy: Copy): string {
  const byMessage: Record<string, string> = {
    [reviewMessages.nameRequired]: copy.errors.name,
    [reviewMessages.nameInvalid]: copy.errors.nameInvalid,
    [reviewMessages.destinationRequired]: copy.errors.destination,
    [reviewMessages.destinationInvalid]: copy.errors.destination,
    [reviewMessages.ratingInvalid]: copy.errors.rating,
    [reviewMessages.reviewShort]: copy.errors.review,
    [reviewMessages.reviewLong]: copy.errors.reviewLong,
    [reviewMessages.reviewLinks]: copy.errors.reviewLinks,
  }
  if (byMessage[issue.message]) return byMessage[issue.message]
  if (issue.field === "photo") return /MB/.test(issue.message) ? copy.errors.photoSize : copy.errors.photo
  return issue.message
}

/** Customer review form. Reviews are sent as PENDING and published only after approval. */
export function ReviewForm({
  locale,
  copy,
  tripTypes,
  photoUploadsEnabled,
}: {
  locale: Locale
  copy: Copy
  tripTypes: Record<TravelTypeKey, string>
  photoUploadsEnabled: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const ratingName = useId()
  const [name, setName] = useState("")
  const [destination, setDestination] = useState("")
  const [tripType, setTripType] = useState("")
  const [rating, setRating] = useState(0)
  const [text, setText] = useState("")
  const { file: photo, preview, setFile: setPhoto } = useFilePreview()
  const [website, setWebsite] = useState("")
  const [errors, setErrors] = useState<Partial<Record<Slot, string>>>({})
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)


  useEffect(() => {
    if (!attempt) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"] input')?.focus()
  }, [attempt])

  function show(issues: FieldIssue[]) {
    const next: Partial<Record<Slot, string>> = {}
    for (const issue of issues) {
      const slot = issue.field as Slot
      if (!next[slot]) next[slot] = translate(issue, copy)
    }
    setErrors(next)
    setAttempt((value) => value + 1)
  }

  function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ""
    if (!file) return
    if (!photoTypes.includes(file.type)) return setErrors((current) => ({ ...current, photo: copy.errors.photo }))
    if (file.size > REVIEW_PHOTO_MAX_BYTES) return setErrors((current) => ({ ...current, photo: copy.errors.photoSize }))
    setErrors((current) => ({ ...current, photo: undefined }))
    setPhoto(file)
  }

  function removePhoto() {
    setPhoto(null)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const fields = { customerName: name, destination, tripType, rating: rating || "", reviewText: text, locale, website }
    const checked = reviewInputSchema.safeParse(fields)
    if (!checked.success) return show(reviewFieldIssues(checked.error))

    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) form.set(key, String(value))
    if (photo) form.set("photo", photo)

    setErrors({})
    setFailure(null)
    setPending(true)
    try {
      await submitReview(form)
      setDone(true)
      setName("")
      setDestination("")
      setTripType("")
      setRating(0)
      setText("")
      removePhoto()
    } catch (error) {
      if (error instanceof ApiError && error.errors.length) return show(error.errors)
      setFailure(
        error instanceof ApiError && error.code === "RATE_LIMITED"
          ? copy.errorRateLimit
          : error instanceof ApiError && (error.code === "NETWORK" || error.code === "TIMEOUT")
            ? copy.errorNetwork
            : copy.errorGeneric,
      )
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div role="status" className="rounded-panel bg-success-soft p-6 text-forest sm:p-8">
        <p className="text-lg font-bold">{copy.successTitle}</p>
        <p className="mt-2 leading-relaxed">{copy.successBody}</p>
        <button type="button" onClick={() => setDone(false)} className={cn("mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-2", focusRing)}>
          {copy.another}
        </button>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-5" aria-busy={pending || undefined}>
      {/* Spam trap: invisible to people and screen readers */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={copy.name} error={errors.customerName}>
          {(field) => <Input id={field.id} name="customerName" autoComplete="name" value={name} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setName(event.target.value)} />}
        </Field>
        <Field label={copy.destination} error={errors.destination}>
          {(field) => (
            <Input id={field.id} name="destination" placeholder={copy.destinationHint} value={destination} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setDestination(event.target.value)} />
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset data-invalid={Boolean(errors.rating) || undefined} aria-describedby={errors.rating ? `${ratingName}-error` : undefined}>
          <legend className="text-sm font-semibold text-forest">{copy.rating}</legend>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className={cn("cursor-pointer rounded-md p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal")}>
                <input
                  type="radio"
                  name={ratingName}
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                />
                <span className="sr-only">{copy.ratingOption.replace("{rating}", String(value))}</span>
                <Star aria-hidden="true" strokeWidth={1.6} className={cn("size-8 transition-colors", value <= rating ? "fill-highlight text-highlight" : "fill-transparent text-line hover:text-coral/60")} />
              </label>
            ))}
          </div>
          {errors.rating ? (
            <p id={`${ratingName}-error`} role="alert" className="mt-2 text-sm font-medium text-danger">
              {errors.rating}
            </p>
          ) : null}
        </fieldset>

        <Field label={`${copy.tripType} (${copy.optional})`} error={errors.tripType}>
          {(field) => (
            <Select id={field.id} name="tripType" value={tripType} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setTripType(event.target.value)}>
              <option value="">{copy.tripTypePlaceholder}</option>
              {tripTypeOrder.map((key) => (
                <option key={key} value={key}>
                  {tripTypes[key]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label={copy.review} hint={`${copy.reviewHint} ${text.length}/${REVIEW_TEXT_MAX}`} error={errors.reviewText}>
        {(field) => (
          <Textarea id={field.id} name="reviewText" rows={5} value={text} invalid={field.invalid} describedBy={field.describedBy} onChange={(event) => setText(event.target.value.slice(0, REVIEW_TEXT_MAX + 50))} />
        )}
      </Field>

      {photoUploadsEnabled ? (
        <div>
          <p className="text-sm font-semibold text-forest">
            {copy.photo} <span className="font-normal text-muted">({copy.optional})</span>
          </p>
          {preview ? (
            <div className="mt-2 flex items-center gap-3">
              <span className="relative block size-20 overflow-hidden rounded-xl bg-stone-deep">
                {/* A local preview of the chosen file (blob: URL), so a plain img is correct here */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="size-full object-cover" />
              </span>
              <button type="button" onClick={removePhoto} className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-forest ring-1 ring-line", focusRing)}>
                <X aria-hidden="true" className="size-4" /> {photo?.name}
              </button>
            </div>
          ) : (
            <label className={cn("mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill px-4 text-sm font-semibold text-forest ring-1 ring-line hover:ring-forest/30 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal")}>
              <ImagePlus aria-hidden="true" className="size-4" />
              {copy.photo}
              <input type="file" name="photo" accept={photoTypes.join(",")} onChange={onPhoto} className="sr-only" aria-describedby="review-photo-hint" />
            </label>
          )}
          <p id="review-photo-hint" className="mt-1.5 text-[0.8125rem] text-muted">
            {copy.photoHint}
          </p>
          {errors.photo ? (
            <p role="alert" className="mt-1 text-sm font-medium text-danger">
              {errors.photo}
            </p>
          ) : null}
        </div>
      ) : null}

      <div aria-live="polite">
        {failure ? (
          <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
            {failure}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="submit" size="lg" loading={pending} icon={<Send aria-hidden="true" className="-ml-1 size-[1.125rem]" />} className="w-full sm:w-auto">
          {pending ? copy.submitting : copy.submit}
        </Button>
      </div>
    </form>
  )
}
