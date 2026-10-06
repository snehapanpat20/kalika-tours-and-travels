"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { Search, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { controlClass, focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type FilterSelect = {
  key: string
  label: string
  options: { value: string; label: string }[]
  /** Option meaning "no filter"; selecting it removes the key from the URL. */
  emptyLabel?: string
  /** Value used when the key is absent (for sorts with a default). */
  defaultValue?: string
}

/**
 * Search box plus selects that live in the URL, so the server renders exactly
 * the matching page and filtered views can be bookmarked.
 */
export function UrlFilters({ searchPlaceholder, selects, keep = [] }: { searchPlaceholder: string; selects: FilterSelect[]; keep?: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(params.get("search") ?? "")
  const debounce = useRef<number | undefined>(undefined)

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
    next.delete("page")
    const query = next.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  function onSearchChange(value: string) {
    setSearch(value)
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => update({ search: value.trim() }), 350)
  }

  useEffect(() => () => window.clearTimeout(debounce.current), [])

  const filterKeys = ["search", ...selects.map((select) => select.key)]
  const hasFilters = filterKeys.some((key) => params.get(key))
  const selectClass = cn(controlClass, "min-h-11 py-2 text-sm")

  function clear() {
    setSearch("")
    const next = new URLSearchParams()
    for (const key of keep) {
      const value = params.get(key)
      if (value) next.set(key, value)
    }
    const query = next.toString()
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }

  return (
    <div className="rounded-card border border-line bg-ivory p-3 shadow-soft sm:p-4" aria-busy={pending || undefined}>
      <div className={cn("grid gap-3 md:items-end", selects.length > 0 && "md:grid-cols-[minmax(0,2fr)_repeat(var(--selects),minmax(0,1fr))]")} style={{ ["--selects" as string]: selects.length }}>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted">Search</span>
          <span className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={cn(controlClass, "min-h-11 py-2 pl-9 text-sm")}
            />
          </span>
        </label>
        {selects.map((select) => (
          <label key={select.key} className="grid gap-1.5">
            <span className="text-xs font-semibold text-muted">{select.label}</span>
            <select
              value={params.get(select.key) ?? select.defaultValue ?? ""}
              onChange={(event) => update({ [select.key]: event.target.value === select.defaultValue ? "" : event.target.value })}
              className={selectClass}
            >
              {select.emptyLabel ? <option value="">{select.emptyLabel}</option> : null}
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
          <button type="button" onClick={clear} className={cn("inline-flex min-h-9 items-center gap-1 rounded-pill px-2 font-semibold text-forest hover:underline", focusRing)}>
            <X aria-hidden="true" className="size-3.5" /> Clear filters
          </button>
        ) : null}
      </div>
    </div>
  )
}
