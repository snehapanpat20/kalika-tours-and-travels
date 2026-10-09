"use client"

import { useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react"
import { Crop, Crosshair, Maximize } from "lucide-react"
import type { ImageValue } from "@/components/admin/kit/image-input"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export type PhotoFit = "WHOLE" | "FILL"
export type Placement = { fit: PhotoFit; x: number; y: number }

/** The photo the form will save: a newly chosen one, or the current one. */
function usePhotoUrl(value: ImageValue, currentUrl: string | null) {
  const file = value.kind === "upload" ? value.file : null
  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => (fileUrl ? URL.revokeObjectURL(fileUrl) : undefined), [fileUrl])
  if (value.kind === "remove") return null
  if (value.kind === "website") return value.path
  return fileUrl ?? currentUrl
}

const options: { fit: PhotoFit; title: string; body: string; icon: typeof Maximize }[] = [
  { fit: "WHOLE", title: "Show the whole image", body: "Nothing is cut off. Best for posters with text.", icon: Maximize },
  { fit: "FILL", title: "Fill the frame", body: "Edges may be cropped. Click the photo to choose what stays in view.", icon: Crop },
]

const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)))

/**
 * How an offer photo sits in its frame on the website, with a live preview.
 * In "Fill the frame", clicking (or arrow keys) sets the focus point that is kept in view.
 */
export function PhotoPlacement({ image, currentUrl, value, onChange }: { image: ImageValue; currentUrl: string | null; value: Placement; onChange: (value: Placement) => void }) {
  const url = usePhotoUrl(image, currentUrl)
  const [ratio, setRatio] = useState<number | null>(null)
  if (!url) return null

  const frameRatio = value.fit === "WHOLE" && ratio ? Math.min(2, Math.max(0.8, ratio)) : 16 / 10

  function pick(event: PointerEvent<HTMLDivElement>) {
    if (value.fit !== "FILL") return
    const box = event.currentTarget.getBoundingClientRect()
    onChange({ ...value, x: clamp(((event.clientX - box.left) / box.width) * 100), y: clamp(((event.clientY - box.top) / box.height) * 100) })
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    onChange({ ...value, x: clamp(value.x + move[0]), y: clamp(value.y + move[1]) })
  }

  return (
    <fieldset className="grid gap-4 rounded-card bg-white p-4 ring-1 ring-line">
      <legend className="sr-only">How the photo fits</legend>
      <p className="text-sm font-bold text-forest">How the photo fits on the website</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon
          const selected = value.fit === option.fit
          return (
            <label
              key={option.fit}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl p-3 ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal",
                selected ? "bg-teal-soft/60 ring-teal" : "ring-line hover:bg-stone",
              )}
            >
              <input type="radio" name="imageFit" value={option.fit} checked={selected} onChange={() => onChange({ ...value, fit: option.fit })} className="sr-only" />
              <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", selected ? "text-teal-deep" : "text-muted")} />
              <span>
                <span className="block text-sm font-bold text-forest">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{option.body}</span>
              </span>
            </label>
          )
        })}
      </div>

      {/* Live preview, the same way the homepage shows it */}
      <div className="grid gap-2">
        <div
          role={value.fit === "FILL" ? "slider" : undefined}
          tabIndex={value.fit === "FILL" ? 0 : undefined}
          aria-label={value.fit === "FILL" ? "Focus point: click the photo or use the arrow keys" : undefined}
          aria-valuetext={value.fit === "FILL" ? `${value.x}% from the left, ${value.y}% from the top` : undefined}
          onPointerDown={pick}
          onKeyDown={value.fit === "FILL" ? nudge : undefined}
          style={{ aspectRatio: frameRatio }}
          className={cn(
            "relative isolate w-full max-w-md overflow-hidden rounded-xl bg-forest-deep select-none",
            value.fit === "FILL" && cn("cursor-crosshair touch-none", focusRing),
          )}
        >
          {value.fit === "WHOLE" ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview of a file that isn't uploaded yet
            <img src={url} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full scale-125 object-cover opacity-60 blur-2xl" />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file that isn't uploaded yet */}
          <img
            src={url}
            alt=""
            draggable={false}
            onLoad={(event) => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
            style={value.fit === "FILL" ? { objectPosition: `${value.x}% ${value.y}%` } : undefined}
            className={cn("size-full", value.fit === "WHOLE" ? "object-contain" : "object-cover")}
          />
          {value.fit === "FILL" ? (
            <span
              aria-hidden="true"
              style={{ left: `${value.x}%`, top: `${value.y}%` }}
              className="pointer-events-none absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-coral shadow-overlay ring-2 ring-coral"
            >
              <Crosshair className="size-5" />
            </span>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-muted">
          {value.fit === "FILL"
            ? "Click the part of the photo that must stay visible (arrow keys move it; Shift moves faster). Wider or narrower screens crop around this point."
            : "The whole image is shown. Any space around it is filled with a soft, blurred copy of the same photo."}
        </p>
      </div>
    </fieldset>
  )
}
