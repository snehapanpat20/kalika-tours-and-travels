import Image from "next/image"
import { business } from "@/data/business"
import { getBrandLogoPath } from "@/lib/config/logo-file"
import { cn } from "@/lib/utils/cn"

/** Heights only. Width follows the logo's own 913×721 proportions. */
const sizeClass = {
  mark: "h-10 w-auto sm:h-12",
  badge: "h-11 w-auto",
  nav: "h-12 w-auto sm:h-14",
  header: "h-20 w-auto sm:h-24",
  footer: "h-20 w-auto sm:h-24",
} as const

/**
 * The official logo from `public/images/brand`. It has a white background of
 * its own, so `plate` sets it on a matching white tile instead of editing it.
 */
export function BrandLogo({
  className,
  size = "header",
  priority = false,
  plate = false,
  alt = business.name,
}: {
  className?: string
  size?: keyof typeof sizeClass
  priority?: boolean
  plate?: boolean
  alt?: string
}) {
  const src = getBrandLogoPath()

  if (!src) {
    return (
      <span className={cn("inline-flex items-center gap-2 font-display text-lg font-bold text-forest", className)}>
        <span className="size-2.5 rounded-full bg-coral" aria-hidden="true" />
        {business.name}
      </span>
    )
  }

  const image = (
    <Image
      src={src}
      alt={alt}
      width={913}
      height={721}
      preload={priority}
      unoptimized={src.endsWith(".svg")}
      sizes={size === "header" || size === "footer" ? "140px" : "90px"}
      className={cn(sizeClass[size], !plate && className)}
    />
  )

  if (!plate) return image

  return <span className={cn("inline-flex rounded-[0.875rem] bg-white p-1.5 shadow-soft", className)}>{image}</span>
}
