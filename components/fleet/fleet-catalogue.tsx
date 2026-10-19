"use client"

import { useState } from "react"
import type { VehicleView } from "@/components/fleet/fleet-view"
import { VehicleCard } from "@/components/fleet/vehicle-card"
import { Lightbox } from "@/components/media/lightbox"
import { focusRing } from "@/components/ui/styles"
import { categoryOrder, type VehicleCategory } from "@/data/fleet"
import type { Dictionary } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils/cn"

/**
 * The Our Fleet catalogue: filter buttons (only for groups that have a
 * vehicle), the vehicle cards, and a lightbox for each vehicle's photos.
 * Without JavaScript every vehicle is listed.
 */
export function FleetCatalogue({
  vehicles,
  copy,
  galleryLabels,
}: {
  vehicles: VehicleView[]
  copy: Dictionary["fleet"]
  galleryLabels: { close: string; previous: string; next: string; counter: string }
}) {
  const [filter, setFilter] = useState<VehicleCategory | "all">("all")
  const [viewing, setViewing] = useState<{ id: string; index: number } | null>(null)

  const groups = categoryOrder.filter((category) => vehicles.some((vehicle) => vehicle.categories.includes(category)))
  const shown = filter === "all" ? vehicles : vehicles.filter((vehicle) => vehicle.categories.includes(filter))
  const open = viewing ? vehicles.find((vehicle) => vehicle.id === viewing.id) : null

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-300",
      active ? "bg-forest text-white" : "bg-white text-forest ring-1 ring-forest/15 hover:ring-forest/40",
      focusRing,
    )

  return (
    <>
      {groups.length > 1 ? (
        <div role="group" aria-label={copy.filtersLabel} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={chip(filter === "all")}>
            {copy.all}
          </button>
          {groups.map((category) => (
            <button key={category} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)} className={chip(filter === category)}>
              {copy.categories[category]}
            </button>
          ))}
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {copy.shown.replace("{n}", String(shown.length))}
      </p>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((vehicle) => (
          <li key={vehicle.id}>
            <VehicleCard vehicle={vehicle} copy={copy} onViewPhotos={(index) => setViewing({ id: vehicle.id, index })} />
          </li>
        ))}
      </ul>

      <Lightbox
        items={open ? open.photos.map(({ id, src, alt, caption }) => ({ id, src, alt, caption })) : []}
        index={open && viewing ? viewing.index : null}
        onIndexChange={(index) => setViewing((current) => (current ? { ...current, index } : current))}
        onClose={() => setViewing(null)}
        labels={galleryLabels}
      />
    </>
  )
}
