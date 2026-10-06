import Image from "next/image"
import type { ImageRef } from "@/components/home/home-content"

/** A bundled photograph (by folder and name) or an admin-managed image URL (/media/… or /images/…). */
export type PhotoSource = ImageRef | { src: string; position?: string }

const sourceOf = (image: PhotoSource): string | null => ("src" in image ? image.src : findNamedImage(image.category, image.name))
import { findNamedImage } from "@/lib/config/media-file"
import { cn } from "@/lib/utils/cn"

/**
 * Fills its positioned parent with a content photograph from `public/images`.
 * If the file has not been supplied yet, a labelled tonal frame stands in
 * rather than an invented image.
 */
export function Photo({
  image,
  alt,
  sizes,
  preload = false,
  placeholder,
  className,
}: {
  image: PhotoSource
  alt: string
  sizes: string
  preload?: boolean
  /** Short label shown on the stand-in frame when the file is missing. */
  placeholder?: string
  className?: string
}) {
  const src = sourceOf(image)

  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("image-frame absolute inset-0 flex items-end p-4", className)}
        data-missing-image={"src" in image ? image.src : `${image.category}/${image.name}`}
      >
        {placeholder ? (
          <span className="rounded-pill bg-white/70 px-3 py-1 text-xs font-semibold text-muted">{placeholder}</span>
        ) : null}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      quality={75}
      className={cn("object-cover", className)}
      style={image.position ? { objectPosition: image.position } : undefined}
    />
  )
}

/** Resolves a photograph for client components that render their own <Image>. */
export function resolvePhoto(image: ImageRef): (ImageRef & { src: string | null }) {
  return { ...image, src: sourceOf(image) }
}
