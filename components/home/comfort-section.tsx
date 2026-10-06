import { comfortImages } from "@/components/home/home-content"
import { Photo } from "@/components/media/photo"
import { Parallax } from "@/components/motion/parallax"
import { Reveal } from "@/components/motion/reveal"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils/cn"
import type { ComfortMomentId } from "@/types/home"

type Copy = Dictionary["home"]["comfort"]

function MomentLabel({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill bg-white/92 px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.14em] text-forest uppercase shadow-soft backdrop-blur",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-coral" />
      {children}
    </span>
  )
}

function Moment({ id, copy, className, sizes }: { id: ComfortMomentId; copy: Copy; className?: string; sizes: string }) {
  const moment = copy.moments[id]
  return (
    <figure className={cn("group relative isolate overflow-hidden rounded-panel bg-stone-deep", className)}>
      <Parallax range={6} className="-z-10">
        <div className="zoom-img absolute inset-0">
          <Photo image={comfortImages[id]} alt={moment.alt} sizes={sizes} />
        </div>
      </Parallax>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-deep/75 via-transparent to-transparent" />
      <MomentLabel className="absolute top-4 left-4 sm:top-5 sm:left-5">{moment.label}</MomentLabel>
      <figcaption className="absolute inset-x-0 bottom-0 max-w-sm p-5 text-[0.9375rem] leading-snug font-semibold text-white sm:p-6">
        {moment.body}
      </figcaption>
    </figure>
  )
}

/** 20 passenger seats and one driver seat, drawn as a simple floor plan. */
function SeatPlan() {
  return (
    <div aria-hidden="true" className="flex items-start gap-3">
      <span className="mt-0.5 size-3.5 rounded-[4px] bg-coral" />
      <span className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 20 }, (_, seat) => (
          <span key={seat} className="size-3.5 rounded-[4px] bg-white/30" />
        ))}
      </span>
    </div>
  )
}

export function ComfortSection({ copy }: { copy: Copy }) {
  return (
    <section aria-labelledby="comfort-title" className="bg-ivory py-(--spacing-section)">
      <div className={cn(shell, "grid gap-4 md:grid-cols-12 md:gap-5")}>
        <Reveal className="pb-6 md:col-span-5 md:self-end md:pr-6 md:pb-10">
          <p className="eyebrow text-teal-deep">{copy.eyebrow}</p>
          <h2 id="comfort-title" className="type-h2 mt-4 text-forest">
            {copy.title}
          </h2>
          <p className="type-lead mt-5 max-w-md text-muted">{copy.description}</p>
        </Reveal>

        <Reveal className="md:col-span-7" delay={0.1}>
          <Moment id="togetherness" copy={copy} sizes="(min-width: 768px) 58vw, 100vw" className="aspect-[16/11]" />
        </Reveal>

        <Reveal className="md:col-span-7 md:row-span-2">
          <Moment id="comfort" copy={copy} sizes="(min-width: 768px) 58vw, 100vw" className="aspect-[4/3] md:aspect-auto md:h-full md:min-h-[28rem]" />
        </Reveal>

        <Reveal className="md:col-span-5" delay={0.1}>
          <div className="flex h-full flex-col justify-between gap-8 rounded-panel bg-teal-deep p-6 text-white sm:p-8">
            <MomentLabel className="self-start">{copy.space.label}</MomentLabel>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{copy.space.title}</p>
                <p className="mt-2 text-white/80">{copy.space.body}</p>
              </div>
              <SeatPlan />
            </div>
          </div>
        </Reveal>

        <Reveal className="md:col-span-5" delay={0.2}>
          <Moment id="peace" copy={copy} sizes="(min-width: 768px) 42vw, 100vw" className="aspect-[16/10]" />
        </Reveal>
      </div>
    </section>
  )
}
