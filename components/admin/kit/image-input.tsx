"use client"

import Image from "next/image"
import { useEffect, useId, useRef, useState, type DragEvent } from "react"
import { ImagePlus, Info, RotateCcw, Trash2, Upload } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"
import { inputClass } from "@/components/admin/kit/form-controls"

/** What the admin chose for an image field. */
export type ImageValue =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "upload"; file: File }
  | { kind: "website"; path: string }

export type UploadsStatus = { enabled: boolean; persistent: boolean; reason?: string }

const accepted = ["image/jpeg", "image/png", "image/webp", "image/avif"]
const MAX_MB = 12

/**
 * Photo picker for admin forms: drag a photo in or browse for one, or reuse a
 * photo already on the website. Shows a preview and the file name, and checks
 * the type and size before anything is uploaded.
 */
export function ImageInput({
  label,
  currentUrl,
  value,
  onChange,
  bundledImages,
  uploads,
  error,
  hint,
  allowRemove = true,
  removeLabel = "Remove photo",
  aspect = "aspect-[16/9]",
}: {
  label: string
  /** The image saved now (null if none). */
  currentUrl: string | null
  value: ImageValue
  onChange: (value: ImageValue) => void
  bundledImages: string[]
  uploads: UploadsStatus
  error?: string
  hint?: string
  allowRemove?: boolean
  removeLabel?: string
  aspect?: string
}) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)

  // Release the preview URL when it is replaced or the form closes
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  function choose(next: ImageValue) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = next.kind === "upload" ? URL.createObjectURL(next.file) : null
    setPreview(previewRef.current)
    onChange(next)
  }

  function takeFile(file: File | undefined) {
    setLocalError(null)
    if (!file) return
    if (!accepted.includes(file.type)) return setLocalError("Choose a JPG, PNG, WebP or AVIF photo.")
    if (file.size > MAX_MB * 1024 * 1024) return setLocalError(`That photo is larger than ${MAX_MB} MB. Choose a smaller one.`)
    choose({ kind: "upload", file })
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (!uploads.enabled) return
    takeFile(event.dataTransfer.files?.[0])
  }

  const shown =
    value.kind === "upload" ? preview : value.kind === "website" ? value.path : value.kind === "remove" ? null : currentUrl
  const changed = value.kind !== "keep"
  const message = localError ?? error
  const errorId = message ? `${id}-error` : undefined

  return (
    <fieldset className="grid gap-2" aria-describedby={errorId}>
      <legend className="mb-1 text-sm font-bold text-forest">{label}</legend>

      <div
        onDragOver={(event) => {
          if (!uploads.enabled) return
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden rounded-card bg-stone-deep ring-1 transition",
          aspect,
          dragging ? "ring-2 ring-teal" : message ? "ring-danger" : "ring-line",
        )}
      >
        {shown ? (
          value.kind === "upload" ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview; next/image cannot load blob: URLs
            <img src={shown} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <Image src={shown} alt="" fill sizes="36rem" className="object-cover" />
          )
        ) : (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-muted">
            <div>
              <ImagePlus aria-hidden="true" strokeWidth={1.4} className="mx-auto size-9" />
              <p className="mt-2 text-sm font-semibold">{uploads.enabled ? "Drag a photo here, or choose one below" : "No photo"}</p>
            </div>
          </div>
        )}
        {dragging ? <div className="absolute inset-0 grid place-items-center bg-teal/20 text-sm font-bold text-forest-deep">Drop to use this photo</div> : null}
      </div>

      {value.kind === "upload" ? (
        <p className="truncate text-xs text-muted">
          New photo: <span className="font-semibold text-ink">{value.file.name}</span> ({(value.file.size / 1024 / 1024).toFixed(1)} MB). It will be saved when you save.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {uploads.enabled ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={accepted.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                takeFile(event.target.files?.[0])
                event.target.value = ""
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-forest px-4 text-xs font-bold text-white hover:bg-forest-soft", focusRing)}
            >
              <Upload aria-hidden="true" className="size-4" /> {shown ? "Upload a different photo" : "Upload a photo"}
            </button>
          </>
        ) : null}
        {allowRemove && (currentUrl || value.kind === "upload" || value.kind === "website") && value.kind !== "remove" ? (
          <button
            type="button"
            onClick={() => choose(currentUrl ? { kind: "remove" } : { kind: "keep" })}
            className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-xs font-bold text-danger ring-1 ring-danger/25 hover:bg-danger-soft", focusRing)}
          >
            <Trash2 aria-hidden="true" className="size-4" /> {removeLabel}
          </button>
        ) : null}
        {changed ? (
          <button
            type="button"
            onClick={() => {
              setLocalError(null)
              choose({ kind: "keep" })
            }}
            className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-xs font-bold text-forest ring-1 ring-line hover:bg-white", focusRing)}
          >
            <RotateCcw aria-hidden="true" className="size-4" /> Undo
          </button>
        ) : null}
      </div>

      {bundledImages.length ? (
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted">Or use a photo already on the website</span>
          <select
            value={value.kind === "website" ? value.path : ""}
            onChange={(event) => (event.target.value ? choose({ kind: "website", path: event.target.value }) : choose({ kind: "keep" }))}
            className={inputClass}
          >
            <option value="">Choose a website photo…</option>
            {bundledImages.map((path) => (
              <option key={path} value={path}>
                {path.replace(/^\/images\//, "")}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {hint ? <p className="text-xs leading-5 text-muted">{hint}</p> : null}
      {!uploads.enabled ? (
        <p className="flex gap-2 rounded-xl bg-stone p-3 text-xs leading-5 text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-teal-deep" />
          <span>Uploading is switched off on this server. {uploads.reason} You can still use photos already on the website.</span>
        </p>
      ) : !uploads.persistent ? (
        <p className="flex gap-2 rounded-xl bg-coral-soft p-3 text-xs leading-5 text-ink">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-coral" />
          <span>This server&apos;s disk is not permanent: uploaded photos may be lost when the site is redeployed.</span>
        </p>
      ) : null}
      {message ? (
        <p id={errorId} role="alert" className="text-xs font-semibold text-danger">
          {message}
        </p>
      ) : null}
    </fieldset>
  )
}

/** Adds the chosen image to a form being sent: `image` file, `imagePath`, or `removeImage`. */
export function appendImage(form: FormData, value: ImageValue) {
  if (value.kind === "upload") form.set("image", value.file)
  if (value.kind === "website") form.set("imagePath", value.path)
  if (value.kind === "remove") form.set("removeImage", "true")
}
