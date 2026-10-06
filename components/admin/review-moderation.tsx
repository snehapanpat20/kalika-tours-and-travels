"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { Check, Pencil, RotateCcw, Star, Trash2, X } from "lucide-react"
import type { ReviewStatus, TravelType } from "@/generated/prisma/enums"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { formatMoment, reviewStatusLabels, travelTypeLabels, travelTypeOrder } from "@/components/admin/format"
import { useAdminErrors } from "@/components/admin/use-admin-action"
import { Spinner } from "@/components/ui/spinner"
import { controlClass, focusRing } from "@/components/ui/styles"
import { useToast } from "@/components/ui/toast"
import { deleteReview, updateReview, type AdminReview, type ReviewChanges } from "@/lib/api/admin"
import { cn } from "@/lib/utils/cn"

const statusTone: Record<ReviewStatus, string> = {
  PENDING: "bg-coral-soft text-forest-deep",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-stone-deep text-muted",
}

/** Review cards with approve / reject / edit / delete. Only approved reviews reach the website. */
export function ReviewModeration({ reviews, empty }: { reviews: AdminReview[]; empty: ReactNode }) {
  const router = useRouter()
  const toast = useToast()
  const reportError = useAdminErrors()
  const [refreshing, startRefresh] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<AdminReview | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const refresh = () => startRefresh(() => router.refresh())

  async function save(review: AdminReview, changes: ReviewChanges, action: string, successTitle: string) {
    if (busy) return false
    setBusy(`${review.id}:${action}`)
    try {
      await updateReview(review.id, changes)
      toast.push({ tone: "success", title: successTitle, description: review.customerName })
      refresh()
      return true
    } catch (error) {
      reportError(error, "Review not updated")
      return false
    } finally {
      setBusy(null)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteReview(deleting.id)
      toast.push({ tone: "success", title: "Review deleted", description: deleting.customerName })
      setDeleting(null)
      refresh()
    } catch (error) {
      setDeleting(null)
      reportError(error, "Review not deleted")
    } finally {
      setDeleteBusy(false)
    }
  }

  if (!reviews.length) return <>{empty}</>

  return (
    <>
      <ul className={cn("grid gap-4 lg:grid-cols-2", refreshing && "opacity-70 transition-opacity")} aria-busy={refreshing || undefined}>
        {reviews.map((review) => (
          <li key={review.id} className="flex flex-col rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-forest">{review.customerName}</p>
                <p className="text-xs text-muted">
                  {[review.destination, review.tripType ? travelTypeLabels[review.tripType] : null, review.locale === "mr" ? "Marathi site" : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className={cn("rounded-pill px-2.5 py-1 text-[0.6875rem] font-bold", statusTone[review.status])}>{reviewStatusLabels[review.status]}</span>
            </div>

            <p className="mt-3 inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${review.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star key={value} aria-hidden="true" strokeWidth={1.6} className={cn("size-4", value <= review.rating ? "fill-coral text-coral" : "text-line")} />
              ))}
            </p>

            <div className="mt-3 flex gap-4">
              <p className="flex-1 text-sm leading-6 whitespace-pre-line text-ink">{review.reviewText}</p>
              {review.photoUrl ? (
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-stone-deep">
                  <Image src={review.photoUrl} alt={`Photo from ${review.customerName}`} fill sizes="6rem" className="object-cover" />
                </div>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-muted">
              Received {formatMoment(review.createdAt)}
              {review.moderatedAt ? ` · ${reviewStatusLabels[review.status].toLowerCase()} ${formatMoment(review.moderatedAt)}` : ""}
            </p>

            {editing === review.id ? (
              <ReviewEditForm
                review={review}
                busy={busy === `${review.id}:edit`}
                onCancel={() => setEditing(null)}
                onSave={async (changes) => {
                  if (await save(review, changes, "edit", "Review details updated")) setEditing(null)
                }}
              />
            ) : (
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {review.status !== "APPROVED" ? (
                  <Action
                    label="Approve"
                    icon={<Check className="size-4" />}
                    tone="success"
                    busy={busy === `${review.id}:approve`}
                    disabled={Boolean(busy)}
                    onClick={() => save(review, { status: "APPROVED" }, "approve", "Review approved and published")}
                  />
                ) : null}
                {review.status !== "REJECTED" ? (
                  <Action
                    label={review.status === "APPROVED" ? "Unpublish (reject)" : "Reject"}
                    icon={<X className="size-4" />}
                    busy={busy === `${review.id}:reject`}
                    disabled={Boolean(busy)}
                    onClick={() => save(review, { status: "REJECTED" }, "reject", "Review rejected")}
                  />
                ) : null}
                {review.status !== "PENDING" ? (
                  <Action
                    label="Back to pending"
                    icon={<RotateCcw className="size-4" />}
                    busy={busy === `${review.id}:pending`}
                    disabled={Boolean(busy)}
                    onClick={() => save(review, { status: "PENDING" }, "pending", "Moved back to pending")}
                  />
                ) : null}
                <Action label="Edit details" icon={<Pencil className="size-4" />} disabled={Boolean(busy)} onClick={() => setEditing(review.id)} />
                <Action label="Delete" icon={<Trash2 className="size-4" />} tone="danger" disabled={Boolean(busy)} onClick={() => setDeleting(review)} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this review?"
        body={
          <>
            The review from <strong className="text-ink">{deleting?.customerName}</strong>
            {deleting?.photoUrl ? " and its photo" : ""} will be permanently deleted. To hide it but keep a record, reject it instead.
          </>
        }
        confirmLabel="Delete review"
        busyLabel="Deleting…"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

/** Corrections to the reviewer's details. Their own words are deliberately not editable. */
function ReviewEditForm({
  review,
  busy,
  onCancel,
  onSave,
}: {
  review: AdminReview
  busy: boolean
  onCancel: () => void
  onSave: (changes: ReviewChanges) => void
}) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const fieldClass = cn(controlClass, "min-h-11 py-2 text-sm")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const customerName = String(data.get("customerName") ?? "").trim()
    const destination = String(data.get("destination") ?? "").trim()
    if (customerName.length < 2 || destination.length < 2) {
      setError("Name and destination need at least 2 characters.")
      return
    }
    setError(null)
    const tripType = String(data.get("tripType") ?? "")
    const changes: ReviewChanges = {}
    if (customerName !== review.customerName) changes.customerName = customerName
    if (destination !== review.destination) changes.destination = destination
    if ((tripType || null) !== review.tripType) changes.tripType = (tripType || null) as TravelType | null
    if (data.get("removePhoto")) changes.removePhoto = true
    if (!Object.keys(changes).length) {
      onCancel()
      return
    }
    onSave(changes)
  }

  return (
    <form onSubmit={submit} noValidate aria-label={`Edit review from ${review.customerName}`} className="mt-4 grid gap-3 rounded-xl bg-white p-4 ring-1 ring-line">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted">Name</span>
          <input name="customerName" defaultValue={review.customerName} maxLength={60} className={fieldClass} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted">Trip / destination</span>
          <input name="destination" defaultValue={review.destination} maxLength={120} className={fieldClass} />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-muted">Trip type</span>
          <select name="tripType" defaultValue={review.tripType ?? ""} className={fieldClass}>
            <option value="">Not set</option>
            {travelTypeOrder.map((type) => (
              <option key={type} value={type}>
                {travelTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {review.photoUrl ? (
        <label className="flex items-center gap-2 text-sm font-semibold text-forest">
          <input type="checkbox" name="removePhoto" className="size-4 accent-danger" /> Remove the photo
        </label>
      ) : null}
      <p id={`${id}-note`} className="text-xs text-muted">
        The review text is the customer&apos;s own words and can&apos;t be edited. Reject the review if it isn&apos;t suitable.
      </p>
      {error ? (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className={cn("inline-flex min-h-10 items-center rounded-pill px-4 text-xs font-bold text-forest ring-1 ring-line hover:bg-ivory", focusRing)}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          aria-describedby={`${id}-note`}
          className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-forest px-4 text-xs font-bold text-white hover:bg-forest-soft disabled:opacity-70", focusRing)}
        >
          {busy ? <Spinner /> : null}
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}

function Action({
  label,
  icon,
  onClick,
  busy = false,
  disabled = false,
  tone = "default",
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  tone?: "default" | "success" | "danger"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-xs font-bold ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        tone === "success" && "bg-success text-white ring-success hover:bg-success/90",
        tone === "danger" && "text-danger ring-danger/25 hover:bg-danger-soft",
        tone === "default" && "text-forest ring-line hover:bg-white",
        focusRing,
      )}
    >
      <span aria-hidden="true">{busy ? <Spinner /> : icon}</span>
      {label}
    </button>
  )
}
