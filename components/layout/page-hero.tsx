import type { CSSProperties, ReactNode } from "react"
import { Photo, type PhotoSource } from "@/components/media/photo"
import { Breadcrumbs } from "@/components/seo/breadcrumbs"
import { shell } from "@/components/ui/styles"
import type { Crumb } from "@/lib/seo/structured-data"

const step = (i: number) => ({ "--i": i }) as CSSProperties

/**
 * Opening of an inner page: the page's own photograph behind a dark shade,
 * with a small gold label, a large serif heading and a sentence. Kept to a
 * moderate height so the page's content starts near the top. Each page passes
 * its photograph (`components/pages/page-images.ts`, or the admin's choice).
 */
export function PageHero({
  id,
  eyebrow,
  titleLead,
  titleFollow,
  description,
  image,
  imageAlt,
  imageClassName,
  actions,
  breadcrumbs,
}: {
  id: string
  eyebrow: string
  titleLead: string
  titleFollow?: string
  description?: string
  image: PhotoSource
  imageAlt: string
  /** Responsive object-position classes to keep the subject in frame. */
  imageClassName?: string
  /** No longer used: it chose a lighter shade for collage photos. Kept so pages need not change. */
  vivid?: boolean
  actions?: ReactNode
  /** Home › … › this page, shown above the eyebrow. */
  breadcrumbs?: { crumbs: Crumb[]; label: string }
}) {
  return (
    <section aria-labelledby={id} className="relative isolate overflow-hidden bg-forest-deep text-white">
      <div className="hero-bg absolute inset-0 -z-20">
        <Photo image={image} alt={imageAlt} sizes="100vw" preload className={imageClassName} />
      </div>
      <div aria-hidden="true" className="hero-ink absolute inset-0 -z-10" />

      <div className={shell}>
        <div className="flex max-w-3xl flex-col py-16 sm:py-20 lg:py-24">
          {breadcrumbs ? (
            <div className="hero-in mb-6 text-white/75" style={step(0)}>
              <Breadcrumbs crumbs={breadcrumbs.crumbs} label={breadcrumbs.label} />
            </div>
          ) : null}
          <p className="eyebrow hero-in text-teal-light" style={step(0)}>
            {eyebrow}
          </p>
          <h1 id={id} className="type-h2 hero-in mt-4 text-white sm:text-[clamp(2.75rem,1.6rem+3.4vw,4.25rem)]" style={step(1)}>
            {titleLead}
            {titleFollow ? <span className="block">{titleFollow}</span> : null}
          </h1>
          {description ? (
            <p className="type-lead hero-in mt-5 max-w-2xl text-white/85" style={step(2)}>
              {description}
            </p>
          ) : null}
          {actions ? (
            <div className="hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={step(3)}>
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
