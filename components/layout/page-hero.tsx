import type { CSSProperties, ReactNode } from "react"
import { Photo, type PhotoSource } from "@/components/media/photo"
import { Breadcrumbs } from "@/components/seo/breadcrumbs"
import { shell } from "@/components/ui/styles"
import type { Crumb } from "@/lib/seo/structured-data"
import { cn } from "@/lib/utils/cn"

const step = (i: number) => ({ "--i": i }) as CSSProperties

/**
 * Opening banner for inner pages: the homepage's cinematic treatment at a
 * shorter height. Slides under the transparent header like the homepage hero.
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
  vivid = false,
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
  actions?: ReactNode
  /** Colourful collage backgrounds: lighter shading, just enough behind the words. */
  vivid?: boolean
  /** Home › … › this page, shown above the eyebrow. */
  breadcrumbs?: { crumbs: Crumb[]; label: string }
}) {
  return (
    <section
      aria-labelledby={id}
      className="relative isolate -mt-16 flex min-h-[max(30rem,64svh)] items-end overflow-hidden bg-forest-deep text-white lg:-mt-20 lg:min-h-[max(34rem,68svh)]"
    >
      <div className="hero-bg absolute inset-0 -z-20">
        <div className="hero-kenburns absolute inset-0 origin-center">
          <Photo image={image} alt={imageAlt} sizes="100vw" preload className={imageClassName} />
        </div>
      </div>
      {vivid ? (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {/* Shade only behind the words (bottom left), so the collage stays bright */}
          <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/85 via-forest-deep/25 to-transparent md:from-forest-deep/75 md:via-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-forest-deep/75 via-forest-deep/35 to-transparent md:via-forest-deep/25" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-forest-deep/45 to-transparent" />
        </div>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/45 to-forest-deep/20 md:via-forest-deep/25 md:to-transparent" />
          <div className="hero-scrim-left absolute inset-0 hidden md:block" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-forest-deep/50 to-transparent" />
          <div className="hero-vignette absolute inset-0" />
        </div>
      )}

      <div className={cn(shell, "pt-32 pb-12 sm:pb-14 lg:pb-16")}>
        <div className="max-w-[44rem]">
          {breadcrumbs ? (
            <div className="hero-in mb-5 text-white/90" style={step(0)}>
              <Breadcrumbs crumbs={breadcrumbs.crumbs} label={breadcrumbs.label} />
            </div>
          ) : null}
          <p className="eyebrow hero-in text-white/85" style={step(0)}>
            {eyebrow}
          </p>
          <h1 id={id} className="type-h2 mt-4 text-balance text-white sm:text-[clamp(2.25rem,1.4rem+3vw,4rem)]">
            <span className="hero-in block" style={step(1)}>
              {titleLead}
            </span>
            {titleFollow ? (
              <span className="hero-in block text-teal-light" style={step(2)}>
                {titleFollow}
              </span>
            ) : null}
          </h1>
          {description ? (
            <p className="type-lead hero-in mt-5 max-w-xl text-white/85" style={step(3)}>
              {description}
            </p>
          ) : null}
          {actions ? (
            <div className="hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={step(4)}>
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
