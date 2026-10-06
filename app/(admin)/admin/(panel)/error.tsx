"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/** A friendly message when an admin page fails to load. No technical details are shown. */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto grid max-w-lg justify-items-center gap-4 rounded-panel bg-ivory px-6 py-14 text-center shadow-soft ring-1 ring-line">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle aria-hidden="true" className="size-7" />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight text-forest">This page couldn&apos;t load</h1>
      <p className="text-muted">Something went wrong while loading it. Please check your connection and try again.</p>
      <button
        type="button"
        onClick={reset}
        className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-forest px-5 text-sm font-bold text-white hover:bg-forest-soft", focusRing)}
      >
        <RotateCcw aria-hidden="true" className="size-4" /> Try again
      </button>
    </div>
  )
}
