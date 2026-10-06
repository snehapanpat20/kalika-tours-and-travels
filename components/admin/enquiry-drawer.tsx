"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { m } from "motion/react"
import { Mail, Phone, Trash2, X } from "lucide-react"
import type { EnquiryStatus } from "@/generated/prisma/enums"
import {
  formatDay,
  formatMoment,
  formatPhone,
  notificationLabels,
  sourceLabels,
  statusLabels,
  statusOrder,
  travelTypeLabels,
  tripLength,
} from "@/components/admin/format"
import { StatusBadge, statusDotClass } from "@/components/admin/status-badge"
import { easeOut } from "@/components/motion/reveal"
import { WhatsAppIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { focusRing } from "@/components/ui/styles"
import type { AdminEnquiry } from "@/lib/api/admin"
import { cn } from "@/lib/utils/cn"

type DrawerProps = {
  enquiry: AdminEnquiry | null
  onClose: () => void
  onStatusChange: (enquiry: AdminEnquiry, status: EnquiryStatus) => void
  savingStatus: EnquiryStatus | null
  onDelete: (enquiry: AdminEnquiry) => void
  deleting: boolean
}

/** Side panel with every detail of one enquiry, built on the native <dialog>. */
export function EnquiryDrawer({ enquiry, onClose, onStatusChange, savingStatus, onDelete, deleting }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [confirming, setConfirming] = useState(false)

  // Keep showing the last enquiry while the dialog closes
  const [shown, setShown] = useState(enquiry)
  if (enquiry && enquiry !== shown) {
    if (enquiry.id !== shown?.id) setConfirming(false)
    setShown(enquiry)
  }

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (enquiry && !dialog.open) dialog.showModal()
    if (!enquiry && dialog.open) dialog.close()
  }, [enquiry])

  const data = enquiry ?? shown

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        setConfirming(false)
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close()
      }}
      // Global dialog styles centre it; a drawer sits on the right at full height
      style={{ margin: "0 0 0 auto", maxWidth: "100vw", maxHeight: "100dvh", height: "100dvh" }}
      className="w-full p-0 sm:w-[32rem]"
    >
      {data ? (
        <m.div
          key={data.id}
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="flex h-full flex-col bg-ivory text-ink shadow-overlay"
        >
          <header className="border-b border-line px-5 pt-5 pb-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-[0.14em] text-teal-deep uppercase">Enquiry</p>
                <h2 id={titleId} className="mt-1 truncate text-xl font-extrabold tracking-tight text-forest">
                  {data.fullName}
                </h2>
                <p className="mt-1 text-xs text-muted">Received {formatMoment(data.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                aria-label="Close details"
                className={cn("-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-forest hover:bg-forest/5", focusRing)}
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ContactLink href={`tel:${data.phone}`} icon={<Phone aria-hidden="true" className="size-4" />} label="Call" />
              <ContactLink
                href={`https://wa.me/${data.phone.replace(/\D/g, "")}`}
                icon={<WhatsAppIcon className="size-4 text-whatsapp" />}
                label="WhatsApp"
                external
              />
              {data.email ? <ContactLink href={`mailto:${data.email}`} icon={<Mail aria-hidden="true" className="size-4" />} label="Email" /> : null}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-bold text-forest">
                Status <StatusBadge status={data.status} />
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Change status">
                {statusOrder.map((status) => {
                  const current = data.status === status
                  const saving = savingStatus === status
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={current}
                      disabled={savingStatus !== null}
                      onClick={() => onStatusChange(data, status)}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors disabled:cursor-wait",
                        current ? "border-forest bg-forest text-white" : "border-line bg-white text-forest hover:border-forest/40",
                        focusRing,
                      )}
                    >
                      {saving ? <Spinner /> : <span aria-hidden="true" className={cn("size-2 rounded-full", current ? "bg-white" : statusDotClass(status))} />}
                      {statusLabels[status]}
                    </button>
                  )
                })}
              </div>
              <p aria-live="polite" className="mt-2 min-h-5 text-xs text-muted">
                {savingStatus ? `Saving ${statusLabels[savingStatus]}…` : ""}
              </p>
            </fieldset>

            <DetailSection title="Customer">
              <Detail label="Full name" value={data.fullName} />
              <Detail label="Phone" value={<a className="underline-offset-2 hover:underline" href={`tel:${data.phone}`}>{formatPhone(data.phone)}</a>} />
              <Detail label="Email" value={data.email ? <a className="break-all underline-offset-2 hover:underline" href={`mailto:${data.email}`}>{data.email}</a> : "Not given"} />
            </DetailSection>

            <DetailSection title="Trip">
              <Detail label="Travel type" value={travelTypeLabels[data.travelType]} />
              <Detail label="Destination" value={data.destination} />
              <Detail label="Travel date" value={formatDay(data.travelDate)} />
              <Detail label="Return date" value={`${formatDay(data.returnDate)} · ${tripLength(data.travelDate, data.returnDate)}`} />
              <Detail label="Passengers" value={`${data.passengerCount} of 20 seats`} />
            </DetailSection>

            <DetailSection title="Additional information">
              <Detail label="Message" value={data.message ? <span className="whitespace-pre-wrap">{data.message}</span> : "No message"} />
              <Detail label="Source" value={sourceLabels[data.source] ?? data.source} />
              <Detail label="Language" value={data.locale === "mr" ? "Marathi" : "English"} />
              <Detail label="Received" value={formatMoment(data.createdAt)} />
              <Detail
                label="Notification"
                value={
                  <span className={cn(data.notificationStatus === "FAILED" && "font-semibold text-danger")}>
                    {notificationLabels[data.notificationStatus] ?? data.notificationStatus}
                  </span>
                }
              />
              <Detail label="Enquiry ID" value={<span className="font-mono text-xs break-all">{data.id}</span>} />
            </DetailSection>
          </div>

          <footer className="border-t border-line px-5 py-4 sm:px-6">
            {confirming ? (
              <div role="alertdialog" aria-labelledby={`${titleId}-confirm`} aria-describedby={`${titleId}-confirm-body`} className="rounded-xl bg-danger-soft p-4">
                <p id={`${titleId}-confirm`} className="text-sm font-bold text-danger">Delete this enquiry?</p>
                <p id={`${titleId}-confirm-body`} className="mt-1 text-sm leading-6 text-ink">
                  It will be removed from the dashboard and enquiry lists, and this cannot be undone from here. A copy is kept in the
                  database for your records.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(data)}
                    disabled={deleting}
                    className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-danger px-4 text-sm font-bold text-white disabled:opacity-70", focusRing)}
                  >
                    {deleting ? <Spinner /> : <Trash2 aria-hidden="true" className="size-4" />}
                    {deleting ? "Deleting…" : "Delete enquiry"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className={cn("inline-flex min-h-11 items-center rounded-pill px-4 text-sm font-semibold text-forest ring-1 ring-forest/20", focusRing)}
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill px-2 text-sm font-semibold text-muted hover:text-danger", focusRing)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Delete enquiry
              </button>
            )}
          </footer>
        </m.div>
      ) : null}
    </dialog>
  )
}

function ContactLink({ href, icon, label, external = false }: { href: string; icon: ReactNode; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn("inline-flex min-h-10 items-center gap-2 rounded-pill bg-white px-4 text-sm font-semibold text-forest ring-1 ring-line hover:ring-forest/30", focusRing)}
    >
      {icon}
      {label}
    </a>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{title}</h3>
      <dl className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">{children}</dl>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold text-muted sm:pt-0.5">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}
