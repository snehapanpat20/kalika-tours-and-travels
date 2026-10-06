"use client"

import Image from "next/image"
import { useState } from "react"
import { Lightbox } from "@/components/media/lightbox"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

type GridPhoto = { id: string; src: string; alt: string; caption: string; position?: string }

/** A tidy grid of photographs; each opens in the shared lightbox. */
export function PhotoGrid({
  photos,
  openLabel,
  labels,
}: {
  photos: GridPhoto[]
  openLabel: string
  labels: { close: string; previous: string; next: string; counter: string }
}) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.id} className={cn(index === 0 && "col-span-2 row-span-2")}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`${openLabel}: ${photo.caption}`}
              className={cn(
                "group relative block w-full overflow-hidden rounded-card bg-stone-deep",
                index === 0 ? "aspect-square sm:aspect-[4/3] lg:aspect-auto lg:h-full" : "aspect-[4/3]",
                focusRing,
              )}
            >
              <span className="zoom-img absolute inset-0">
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes={index === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                  className="object-cover"
                  style={photo.position ? { objectPosition: photo.position } : undefined}
                />
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-deep/75 to-transparent px-3 pt-8 pb-2.5 text-left text-xs font-semibold text-white sm:px-4 sm:text-sm">
                {photo.caption}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Lightbox
        items={photos.map(({ id, src, alt, caption }) => ({ id, src, alt, caption }))}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
        labels={labels}
      />
    </>
  )
}
