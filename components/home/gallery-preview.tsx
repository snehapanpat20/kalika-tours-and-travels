import Image from "next/image"
import Link from "next/link"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { InstagramIcon } from "@/components/ui/icons"
import { SectionHeading } from "@/components/ui/section-heading"
import { focusRing, shell } from "@/components/ui/styles"
import { business } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"
import type { PublicGalleryItem } from "@/server/content/gallery"

/** Homepage: a few featured photos from real trips, or an honest "coming soon". */
export function GalleryPreview({
  locale,
  copy,
  viewAll,
  items,
}: {
  locale: Locale
  copy: Dictionary["pages"]["gallery"]
  viewAll: string
  items: PublicGalleryItem[]
}) {
  return (
    <section aria-labelledby="gallery-preview-title" className="bg-ivory py-(--spacing-section)">
      <div className={shell}>
        <Reveal>
          <SectionHeading
            id="gallery-preview-title"
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
            action={
              items.length ? (
                <Button href={pagePath(locale, "gallery")} variant="outline" arrow>
                  {viewAll}
                </Button>
              ) : undefined
            }
          />
        </Reveal>

        {items.length ? (
          <Stagger as="ul" className="mt-10 columns-2 gap-3 sm:gap-4 md:columns-3 [&>li]:mb-3 sm:[&>li]:mb-4">
            {items.map((item) => (
              <StaggerItem as="li" key={item.id} className="break-inside-avoid">
                <Link href={pagePath(locale, "gallery")} className={cn("group relative block overflow-hidden rounded-card bg-stone-deep", focusRing)}>
                  <span className="zoom-img block">
                    <Image
                      src={item.imageUrl}
                      alt={item.altText || item.title}
                      width={item.width ?? 1200}
                      height={item.height ?? 900}
                      sizes="(min-width: 768px) 30vw, 48vw"
                      className="h-auto w-full"
                    />
                  </span>
                  {item.destination ? (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-deep/75 to-transparent px-3 pt-8 pb-2.5 text-[0.6875rem] font-extrabold tracking-[0.16em] text-white uppercase sm:px-4 sm:text-xs">
                      {item.destination}
                    </span>
                  ) : null}
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Reveal className="mt-10">
            <div className="flex flex-col items-start gap-5 rounded-panel border border-dashed border-line bg-stone px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <div>
                <p className="text-xl font-extrabold tracking-tight text-forest">{copy.emptyTitle}</p>
                <p className="mt-1 max-w-lg text-muted">{copy.emptyBody}</p>
              </div>
              <Button href={business.instagramUrl} variant="outline" icon={<InstagramIcon className="-ml-1 size-[1.125rem] text-coral" />}>
                {copy.followInstagram}
              </Button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
