"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { ArrowRight, Info, Megaphone, Sparkles, Tag, X } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type AnnouncementView = {
  message: string
  type: "INFO" | "OFFER" | "IMPORTANT" | "FESTIVE"
  cta: { text: string; href: string; external: boolean } | null
  preview: boolean
  version: string
}

const tones = {
  INFO: { className: "bg-forest-deep text-white", icon: Info, iconClass: "text-teal-light", link: "text-teal-light" },
  OFFER: { className: "bg-coral text-forest-deep", icon: Tag, iconClass: "text-forest-deep", link: "text-forest-deep underline" },
  IMPORTANT: { className: "bg-ink text-white", icon: Megaphone, iconClass: "text-coral", link: "text-coral" },
  FESTIVE: { className: "bg-teal-deep text-white", icon: Sparkles, iconClass: "text-coral-soft", link: "text-white underline" },
} as const

const storageKey = "kalika-announcement-dismissed"

function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return null // Storage blocked: the bar simply stays visible
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

/**
 * The notice bar at the very top of the website. Closing it hides that
 * message for this visitor; a new or edited message shows again.
 * Its height is published as --announcement-h so the page content moves down
 * by exactly that much (the header is fixed).
 */
export function AnnouncementBar({ announcement, closeLabel, notLiveLabel }: { announcement: AnnouncementView; closeLabel: string; notLiveLabel: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [closedNow, setClosedNow] = useState(false)
  // Read after hydration (the server always renders the bar), and kept in step across tabs
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => null)
  const hidden = closedNow || dismissed === announcement.version

  useEffect(() => {
    // The site frame (#top) holds the variable, with a server-rendered first estimate
    const root = document.getElementById("top") ?? document.documentElement
    const bar = ref.current
    if (hidden || !bar) {
      root.style.setProperty("--announcement-h", "0px")
      return
    }
    const update = () => root.style.setProperty("--announcement-h", `${bar.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.setProperty("--announcement-h", "0px")
    }
  }, [hidden])

  if (hidden) return null
  const tone = tones[announcement.type]
  const Icon = tone.icon

  function dismiss() {
    setClosedNow(true)
    try {
      window.localStorage.setItem(storageKey, announcement.version)
    } catch {
      // Ignore: it will show again on the next page
    }
  }

  return (
    <div ref={ref} role="region" aria-label={announcement.message} className={cn("relative", tone.className)}>
      <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-4 py-2 pr-12 text-[0.8125rem] leading-snug sm:justify-center sm:px-8 sm:pr-14 sm:text-sm">
        <Icon aria-hidden="true" strokeWidth={2} className={cn("size-4 shrink-0", tone.iconClass)} />
        <p className="min-w-0">
          {announcement.preview ? <span className="mr-2 rounded-pill bg-white/90 px-2 py-0.5 text-[0.6875rem] font-bold text-forest-deep">{notLiveLabel}</span> : null}
          <span className="font-semibold">{announcement.message}</span>
          {announcement.cta ? (
            <a
              href={announcement.cta.href}
              {...(announcement.cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn("ml-2 inline-flex items-center gap-1 font-bold whitespace-nowrap underline-offset-4 hover:underline", tone.link, focusRing)}
            >
              {announcement.cta.text}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </a>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={closeLabel}
        className={cn("absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full opacity-80 hover:bg-black/10 hover:opacity-100 sm:right-4", focusRing)}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
