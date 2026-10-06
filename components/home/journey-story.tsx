import { storyImage } from "@/components/home/home-content"
import { Photo } from "@/components/media/photo"
import { Parallax } from "@/components/motion/parallax"
import { Reveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { shell } from "@/components/ui/styles"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { pagePath } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

export function JourneyStory({ locale, copy }: { locale: Locale; copy: Dictionary["home"]["story"] }) {
  return (
    <section
      aria-labelledby="story-title"
      className="relative isolate flex min-h-[max(38rem,92svh)] items-end overflow-hidden bg-forest-deep text-white"
    >
      <Parallax range={10} className="-z-20">
        <Photo image={storyImage} alt={copy.imageAlt} sizes="100vw" />
      </Parallax>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-deep/90 via-forest-deep/30 to-forest-deep/5" />

      <div className={cn(shell, "py-16 sm:py-20 lg:py-28")}>
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-white/80">{copy.eyebrow}</p>
          <h2 id="story-title" className="type-display mt-5 text-balance">
            {copy.title}
          </h2>
          <p className="type-lead mt-6 max-w-lg text-white/85">{copy.description}</p>
          <Button href={pagePath(locale, "plan")} size="lg" arrow className="mt-9">
            {copy.action}
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
