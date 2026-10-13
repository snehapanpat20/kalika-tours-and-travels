import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Photo, type PhotoSource } from "@/components/media/photo"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export function JourneyCard({
  href,
  title,
  body,
  image,
  alt,
  index,
}: {
  href: string
  title: string
  body: string
  image: PhotoSource
  alt: string
  index: number
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-card bg-forest p-5 text-white shadow-soft transition-[transform,box-shadow] duration-500 ease-out motion-safe:hover:-translate-y-1 hover:shadow-card sm:p-6 lg:aspect-[3/4.2]",
        focusRing,
      )}
    >
      <div className="zoom-img absolute inset-0 -z-10">
        <Photo image={image} alt={alt} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 80vw" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-deep/90 via-forest-deep/30 to-transparent" />
      <span aria-hidden="true" className="absolute top-5 left-5 text-xs font-bold tracking-[0.16em] text-white/75 sm:top-6 sm:left-6">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="type-h3">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/80">{body}</p>
        </div>
        <span
          aria-hidden="true"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm transition-colors duration-300 group-hover:bg-coral group-hover:text-on-coral group-hover:ring-coral"
        >
          <ArrowUpRight strokeWidth={2} className="size-[1.125rem] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  )
}
