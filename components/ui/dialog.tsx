"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { focusRing } from "@/components/ui/styles"

export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  closeLabel = "Close",
}: {
  open: boolean
  title: string
  description?: string
  children?: ReactNode
  onClose: () => void
  closeLabel?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="w-full max-w-lg rounded-card"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="rounded-card border border-line bg-ivory p-6 text-ink shadow-overlay">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-2xl font-semibold text-forest">
            {title}
          </h2>
          <button
            type="button"
            className={`rounded-pill px-3 py-1 text-sm font-semibold text-forest hover:bg-stone ${focusRing}`}
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
        {description ? (
          <p id={descriptionId} className="mt-3 text-sm leading-6 text-muted">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </dialog>
  )
}
