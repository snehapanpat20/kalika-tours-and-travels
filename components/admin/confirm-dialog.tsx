"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { Spinner } from "@/components/ui/spinner"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/** A small modal asking to confirm a destructive action. Escape or Cancel closes it. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busyLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  busyLabel: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus() // the safe choice gets focus
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      onClose={() => {
        if (open) onCancel()
      }}
      className="w-[min(28rem,calc(100vw-2rem))] rounded-panel bg-ivory p-0 text-ink shadow-overlay backdrop:bg-forest-deep/50"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-lg font-extrabold tracking-tight text-forest">
          {title}
        </h2>
        <div id={bodyId} className="mt-2 text-sm leading-6 text-muted">
          {body}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn("inline-flex min-h-11 items-center rounded-pill px-5 text-sm font-bold text-forest ring-1 ring-line hover:bg-white disabled:opacity-60", focusRing)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-danger px-5 text-sm font-bold text-white hover:bg-danger/90 disabled:opacity-70", focusRing)}
          >
            {busy ? <Spinner /> : null}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
