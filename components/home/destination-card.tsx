import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Photo, type PhotoSource } from "@/components/media/photo"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export function DestinationCard({
  href,
  name,
  places,
  image,
  alt,
  actionLabel,
  index,
}: {
  href: string
  name: string
  places: string
  image: PhotoSource
  alt: string
  actionLabel: string
  index: number
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={actionLabel}
      className={cn("group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-panel bg-forest p-6 text-white sm:p-7", focusRing)}
    >
      <div className="zoom-img absolute inset-0 -z-10">
        <Photo image={image} alt={alt} sizes="(min-width: 1024px) 30rem, (min-width: 640px) 50vw, 82vw" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-deep/90 via-forest-deep/20 to-transparent" />
      <span aria-hidden="true" className="absolute top-6 left-6 text-xs font-bold tracking-[0.16em] text-white/80 sm:top-7 sm:left-7">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-[1.75rem] leading-tight font-extrabold tracking-tight sm:text-[2rem]">{name}</h3>
          <p className="mt-2 text-sm leading-relaxed font-medium text-white/80">{places}</p>
        </div>
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm transition-colors duration-300 group-hover:bg-coral group-hover:text-on-coral group-hover:ring-coral"
        >
          <ArrowUpRight strokeWidth={2} className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  )
}
