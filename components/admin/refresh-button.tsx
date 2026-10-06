"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/** Re-fetches the page's server data in place, without reloading the browser. */
/** `onDark` for use on the dashboard's dark welcome banner. */
export function RefreshButton({ onDark = false }: { onDark?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-3">
      <span aria-live="polite" className={cn("hidden text-xs sm:inline", onDark ? "text-white/75" : "text-muted")}>
        {pending ? "Refreshing…" : refreshedAt ? `Updated ${refreshedAt}` : ""}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            router.refresh()
            setRefreshedAt(new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date()))
          })
        }
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-pill bg-ivory px-4 text-sm font-semibold text-forest ring-1 ring-line transition hover:ring-forest/30 disabled:opacity-70",
          focusRing,
        )}
      >
        <RefreshCw aria-hidden="true" className={cn("size-4", pending && "motion-safe:animate-spin")} />
        {pending ? "Refreshing" : "Refresh"}
      </button>
    </div>
  )
}
