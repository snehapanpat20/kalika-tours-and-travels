import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Bus, Car, Images } from "lucide-react"
import type { VehicleView } from "@/components/fleet/fleet-view"
import { focusRing } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils/cn"

/**
 * One vehicle: its photo (or a neutral "photo coming soon" panel), name,
 * confirmed facts, a short description and the way to enquire. On the Our
 * Fleet page it also offers the vehicle's photos and, where confirmed, what's
 * on board; the homepage uses the `compact` form.
 */
export function VehicleCard({
  vehicle,
  copy,
  compact = false,
  onViewPhotos,
}: {
  vehicle: VehicleView
  copy: Dictionary["fleet"]
  compact?: boolean
  /** Opens the vehicle's photos at the given index. */
  onViewPhotos?: (index: number) => void
}) {
  const headingId = `vehicle-${vehicle.id}`

  return (
    <article aria-labelledby={headingId} className="lift-card flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-soft ring-1 ring-forest/8">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone">
        {vehicle.photo ? (
          <Image
            src={vehicle.photo.src}
            alt={vehicle.photo.alt}
            fill
            sizes={compact ? "(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"}
            className="object-cover"
            style={vehicle.photo.position ? { objectPosition: vehicle.photo.position } : undefined}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgb(42_26_18/0.035)_14px_28px)] text-muted">
            {vehicle.categories.includes("car") ? (
              <Car aria-hidden="true" strokeWidth={1.4} className="size-10 text-highlight" />
            ) : (
              <Bus aria-hidden="true" strokeWidth={1.4} className="size-10 text-highlight" />
            )}
            <span className="text-sm font-medium">{copy.photoComingSoon}</span>
          </div>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "p-5" : "p-6")}>
        <h3 id={headingId} className={cn("font-display leading-tight font-semibold text-forest", compact ? "text-[1.375rem]" : "text-[1.625rem]")}>
          {vehicle.name}
        </h3>
        {vehicle.facts.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {vehicle.facts.map((fact) => (
              <li key={fact} className="rounded-full bg-stone px-3 py-1 text-xs font-semibold text-forest ring-1 ring-highlight/40">
                {fact}
              </li>
            ))}
          </ul>
        ) : null}
        {compact ? null : <p className="mt-4 leading-relaxed text-muted">{vehicle.description}</p>}

        {!compact && (vehicle.details || vehicle.features.length || vehicle.photos.length > 1) ? (
          <details className="group/details mt-4 text-sm">
            <summary className={cn("inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold text-teal-deep", focusRing)}>{copy.viewDetails}</summary>
            {vehicle.details ? <p className="mt-2 leading-relaxed text-ink/85">{vehicle.details}</p> : null}
            {vehicle.features.length ? (
              <>
                <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-muted uppercase">{copy.onBoard}</p>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {vehicle.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-ink/85">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-highlight" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {vehicle.photos.length > 1 ? (
              <ul className="mt-4 grid grid-cols-3 gap-2">
                {vehicle.photos.map((photo, index) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => onViewPhotos?.(index)}
                      className={cn("group block w-full text-left", focusRing)}
                      aria-label={`${copy.viewPhotos}: ${photo.caption || photo.alt}`}
                    >
                      <span className="relative block aspect-square overflow-hidden rounded-lg bg-stone-deep">
                        <Image src={photo.src} alt="" fill sizes="120px" className="object-cover transition-transform duration-500 group-hover:scale-105" style={photo.position ? { objectPosition: photo.position } : undefined} />
                      </span>
                      {photo.caption ? <span className="mt-1 block truncate text-xs text-muted">{photo.caption}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        ) : null}

        <div className={cn("mt-auto flex flex-wrap items-center gap-x-5 gap-y-2", compact ? "pt-4" : "pt-6")}>
          <Link
            href={vehicle.enquireHref}
            className={cn(
              "group inline-flex min-h-11 items-center gap-2 rounded-button bg-coral px-5 text-sm font-bold text-on-coral transition duration-300 hover:bg-coral-deep motion-safe:hover:-translate-y-0.5",
              focusRing,
            )}
          >
            {copy.enquire}
            <span className="sr-only">: {vehicle.name}</span>
            <ArrowRight aria-hidden="true" strokeWidth={2.2} className="nudge size-4" />
          </Link>
          {!compact && onViewPhotos && vehicle.photos.length ? (
            <button type="button" onClick={() => onViewPhotos(0)} className={cn("inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-deep hover:underline", focusRing)}>
              <Images aria-hidden="true" className="size-4" />
              {copy.viewPhotos} ({vehicle.photos.length})
              <span className="sr-only">: {vehicle.name}</span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
