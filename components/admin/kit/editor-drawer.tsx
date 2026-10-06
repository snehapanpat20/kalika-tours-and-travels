"use client"

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react"
import { X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/**
 * Side panel for adding or editing something, on the native <dialog>:
 * Escape closes it (unless saving), focus stays inside while open.
 * The parent gives each opening its own `key` so the form starts fresh.
 */
export function EditorDrawer({
  open,
  title,
  description,
  busy,
  error,
  submitLabel,
  busyLabel = "Saving…",
  secondaryAction,
  onSubmit,
  onClose,
  children,
  wide = false,
}: {
  open: boolean
  title: string
  description?: string
  busy: boolean
  /** Shown above the buttons when saving failed. */
  error?: string | null
  submitLabel: string
  busyLabel?: string
  /** e.g. a "Save as draft" button beside the main one. */
  secondaryAction?: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      onClose={() => {
        if (open) onClose()
      }}
      style={{ margin: "0 0 0 auto", maxWidth: "100vw", maxHeight: "100dvh", height: "100dvh" }}
      className={cn("w-full p-0", wide ? "sm:w-[44rem]" : "sm:w-[36rem]")}
    >
      <form onSubmit={onSubmit} noValidate className="flex h-full flex-col bg-ivory text-ink shadow-overlay">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-extrabold tracking-tight text-forest">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            disabled={busy}
            aria-label="Close"
            className={cn("-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-forest hover:bg-forest/5 disabled:opacity-50", focusRing)}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="grid flex-1 content-start gap-5 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        <footer className="border-t border-line px-5 py-4 sm:px-6">
          {error ? (
            <p role="alert" className="mb-3 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              disabled={busy}
              className={cn("inline-flex min-h-11 items-center rounded-pill px-5 text-sm font-bold text-forest ring-1 ring-line hover:bg-white disabled:opacity-60", focusRing)}
            >
              Cancel
            </button>
            {secondaryAction}
            <button
              type="submit"
              disabled={busy}
              className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-6 text-sm font-bold text-forest-deep hover:bg-coral/90 disabled:opacity-70", focusRing)}
            >
              {busy ? <Spinner /> : null}
              {busy ? busyLabel : submitLabel}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  )
}
