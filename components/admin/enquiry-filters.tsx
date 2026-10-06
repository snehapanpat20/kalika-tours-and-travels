"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { Search, X } from "lucide-react"
import { statusLabels, statusOrder, travelTypeLabels, travelTypeOrder } from "@/components/admin/format"
import { Spinner } from "@/components/ui/spinner"
import { controlClass, focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

const sortLabels = { newest: "Newest first", oldest: "Oldest first", travelDate: "Travel date (soonest)" } as const

/**
 * Search, filter and sort controls. They live in the URL, so the server
 * fetches exactly the matching page, and filtered views can be bookmarked.
 */
export function EnquiryFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(params.get("search") ?? "")
  const debounce = useRef<number | undefined>(undefined)

  // Back/forward navigation changes the URL; keep the search box in step
  const urlSearch = params.get("search") ?? ""
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch)
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch)
    setSearch(urlSearch)
  }

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    next.delete("page") // any change starts again from page 1
    const query = next.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  function onSearchChange(value: string) {
    setSearch(value)
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => update({ search: value.trim() }), 350)
  }

  useEffect(() => () => window.clearTimeout(debounce.current), [])

  const hasFilters = ["search", "status", "travelType", "sort", "travelFrom", "travelTo", "from", "to"].some((key) => params.get(key))
  const dateClass = cn(controlClass, "min-h-11 py-2 text-sm")
  const dateFilters = [
    { key: "travelFrom", label: "Travelling from" },
    { key: "travelTo", label: "Travelling until" },
    { key: "from", label: "Received from" },
    { key: "to", label: "Received until" },
  ] as const
  const selectClass = cn(controlClass, "min-h-11 py-2 text-sm")

  return (
    <div className="rounded-card border border-line bg-ivory p-3 shadow-soft sm:p-4" aria-busy={pending || undefined}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] md:items-end">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted">Search</span>
          <span className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Name, phone or destination"
              className={cn(controlClass, "min-h-11 py-2 pl-9 text-sm")}
            />
          </span>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted">Status</span>
          <select value={params.get("status") ?? ""} onChange={(event) => update({ status: event.target.value })} className={selectClass}>
            <option value="">All statuses</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted">Travel type</span>
          <select value={params.get("travelType") ?? ""} onChange={(event) => update({ travelType: event.target.value })} className={selectClass}>
            <option value="">All types</option>
            {travelTypeOrder.map((type) => (
              <option key={type} value={type}>
                {travelTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted">Sort</span>
          <select value={params.get("sort") ?? "newest"} onChange={(event) => update({ sort: event.target.value === "newest" ? "" : event.target.value })} className={selectClass}>
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {dateFilters.map((filter) => (
          <label key={filter.key} className="grid gap-1.5">
            <span className="text-xs font-semibold text-muted">{filter.label}</span>
            <input type="date" value={params.get(filter.key) ?? ""} onChange={(event) => update({ [filter.key]: event.target.value })} className={dateClass} />
          </label>
        ))}
      </div>
      <div className="mt-2 flex min-h-6 items-center justify-between gap-3 text-xs text-muted">
        <span aria-live="polite" className="inline-flex items-center gap-2">
          {pending ? (
            <>
              <Spinner /> Updating…
            </>
          ) : null}
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearch("")
              startTransition(() => router.replace(pathname, { scroll: false }))
            }}
            className={cn("inline-flex min-h-9 items-center gap-1 rounded-pill px-2 font-semibold text-forest hover:underline", focusRing)}
          >
            <X aria-hidden="true" className="size-3.5" /> Clear filters
          </button>
        ) : null}
      </div>
    </div>
  )
}
