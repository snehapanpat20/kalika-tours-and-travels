"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Eye, EyeOff, ImagePlus, Pencil, Plus, RefreshCw, Search, Star, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EditorDrawer } from "@/components/admin/kit/editor-drawer"
import { BilingualField, CheckField, SelectField, TextField, inputClass } from "@/components/admin/kit/form-controls"
import type { UploadsStatus } from "@/components/admin/kit/image-input"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { useSave } from "@/components/admin/kit/use-save"
import { focusRing } from "@/components/ui/styles"
import {
  addVehiclePhoto,
  arrangeVehiclePhotos,
  deleteContentItem,
  deleteVehiclePhoto,
  importBuiltIn,
  previewHref,
  reorderVehicles,
  saveContentItem,
  updateVehiclePhoto,
} from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils/cn"
import type { AdminVehicle } from "@/server/cms/vehicles"

type Category = AdminVehicle["category"]
type Ac = NonNullable<AdminVehicle["ac"]>

export const categoryLabels: Record<Category, string> = { TRAVELLER: "Traveller", BUS: "Bus", SLEEPER_BUS: "Sleeper bus", CAR: "Car" }
const acLabels: Record<Ac, string> = { AC: "AC", NON_AC: "Non-AC", BOTH: "AC / Non-AC" }
const categories = Object.keys(categoryLabels) as Category[]

const accepted = ["image/jpeg", "image/png", "image/webp", "image/avif"]
/**
 * Largest photo this page sends. The website's host (Vercel) refuses any request
 * over 4.5 MB, form wrapping included, before it reaches the website, so 4 MB
 * leaves room for that. The server itself accepts up to 12 MB (IMAGE_MAX_BYTES).
 */
const MAX_MB = 4
const PHOTO_LIMIT = 12

type Bi = { en: string; mr: string }
type Form = {
  name: Bi
  description: Bi
  seatingType: Bi
  capacity: string
  ac: "" | Ac
  category: Category
  pushBackSeats: boolean
  published: boolean
}

const blank: Form = {
  name: { en: "", mr: "" },
  description: { en: "", mr: "" },
  seatingType: { en: "", mr: "" },
  capacity: "",
  ac: "",
  category: "BUS",
  pushBackSeats: false,
  published: false,
}

const fromItem = (item: AdminVehicle): Form => ({
  name: { en: item.name, mr: item.nameMr ?? "" },
  description: { en: item.description ?? "", mr: item.descriptionMr ?? "" },
  seatingType: { en: item.seatingType ?? "", mr: item.seatingTypeMr ?? "" },
  capacity: item.capacity === null ? "" : String(item.capacity),
  ac: item.ac ?? "",
  category: item.category,
  pushBackSeats: item.pushBackSeats,
  published: item.published,
})

const toBody = (form: Form) => ({
  name: form.name.en,
  nameMr: form.name.mr,
  description: form.description.en,
  descriptionMr: form.description.mr,
  seatingType: form.seatingType.en,
  seatingTypeMr: form.seatingType.mr,
  capacity: form.capacity.trim(),
  ac: form.ac,
  category: form.category,
  pushBackSeats: form.pushBackSeats,
  published: form.published,
})

/** One line of facts for the list: "26 seats · AC / Non-AC · Push-back seats". */
function factsOf(item: AdminVehicle) {
  return [
    item.capacity === null ? "Seats to confirm" : `${item.capacity} seats`,
    item.ac ? acLabels[item.ac] : "AC to confirm",
    categoryLabels[item.category],
    item.pushBackSeats ? "Push-back seats" : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

/**
 * Admin › Fleet: the vehicles on the Our Fleet page. Add, edit, publish,
 * reorder and delete vehicles, and manage each vehicle's photos. Only
 * published vehicles appear on the website.
 */
export function FleetManager({ items, totalAll, uploads }: { items: AdminVehicle[]; totalAll: number; uploads: UploadsStatus }) {
  const save = useSave()
  const quick = useSave()
  const [editor, setEditor] = useState<{ open: boolean; item: AdminVehicle | null; session: number }>({ open: false, item: null, session: 0 })
  const [deleting, setDeleting] = useState<AdminVehicle | null>(null)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<"" | Category>("")
  const [status, setStatus] = useState<"" | "published" | "draft">("")
  const [order, setOrder] = useState(items.map((item) => item.id))

  // Fresh data from the server replaces the local order
  const itemsKey = items.map((item) => item.id).join(",")
  const [seenKey, setSeenKey] = useState(itemsKey)
  if (seenKey !== itemsKey) {
    setSeenKey(itemsKey)
    setOrder(items.map((item) => item.id))
  }

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const ordered = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
  const term = search.trim().toLowerCase()
  const filtered = ordered.filter(
    (item) =>
      (!term || item.name.toLowerCase().includes(term) || (item.nameMr ?? "").toLowerCase().includes(term) || String(item.capacity ?? "").includes(term)) &&
      (!category || item.category === category) &&
      (!status || item.published === (status === "published")),
  )
  const filtering = Boolean(term || category || status)

  const open = (item: AdminVehicle | null) => {
    save.reset()
    setEditor((state) => ({ open: true, item, session: state.session + 1 }))
  }

  async function move(id: string, direction: -1 | 1) {
    const index = order.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
    const done = await quick.run(() => reorderVehicles(next), { success: "Order saved", failure: "Order not saved" })
    if (done === null) setOrder(order)
  }

  return (
    <>
      {!uploads.enabled ? (
        <Notice tone="warning">
          Photo uploads are switched off: {uploads.reason}
        </Notice>
      ) : !uploads.persistent ? (
        <Notice tone="warning">Uploaded photos are saved on this server only and may be lost when the website is redeployed. Connect cloud storage before relying on uploads.</Notice>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <a href={previewHref("/en/traveller")} target="_blank" rel="noopener noreferrer" className={actionClass}>
          <Eye aria-hidden="true" className="size-4" /> Preview Our Fleet <span className="sr-only">(opens in a new tab)</span>
        </a>
        {totalAll > 0 ? (
          <button
            type="button"
            disabled={quick.busy}
            onClick={() => quick.run(() => importBuiltIn("vehicles"), { success: "Import finished", failure: "Vehicles not imported" })}
            className={actionClass}
          >
            <RefreshCw aria-hidden="true" className="size-4" /> Add missing website vehicles
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => open(null)}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-bold text-forest-deep hover:bg-coral/90", focusRing)}
        >
          <Plus aria-hidden="true" className="size-4" /> Add Vehicle
        </button>
      </div>

      {totalAll === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-card bg-teal-soft/60 p-5 ring-1 ring-teal/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-forest">The Our Fleet page is showing its built-in list of vehicles.</p>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Import them to start managing the fleet here: names and descriptions (English and Marathi) and the photos already on the website are copied. A draft “Push-Back Seat
              Vehicle” is added too, to publish once its seats and AC are confirmed.
            </p>
          </div>
          <button
            type="button"
            disabled={quick.busy}
            onClick={() => quick.run(() => importBuiltIn("vehicles"), { success: "Vehicles imported", failure: "Vehicles not imported" })}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill bg-forest px-5 text-sm font-bold text-white hover:bg-forest-soft disabled:opacity-60", focusRing)}
          >
            <Download aria-hidden="true" className="size-4" /> {quick.busy ? "Importing…" : "Import current vehicles"}
          </button>
        </div>
      ) : null}

      {totalAll > 0 ? (
        <div className="grid gap-3 rounded-card bg-ivory p-4 ring-1 ring-line sm:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <span className="sr-only">Search vehicles</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or seats" className={cn(inputClass, "pl-9")} />
          </label>
          <label>
            <span className="sr-only">Kind of vehicle</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as "" | Category)} className={inputClass}>
              <option value="">All kinds</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as "" | "published" | "draft")} className={inputClass}>
              <option value="">Published and drafts</option>
              <option value="published">Published only</option>
              <option value="draft">Drafts only</option>
            </select>
          </label>
          {filtering ? <p className="text-xs text-muted sm:col-span-3">Clear the search and filters to change the order.</p> : null}
        </div>
      ) : null}

      {totalAll > 0 && !filtered.length ? <p className="rounded-card bg-ivory p-6 text-center text-sm text-muted ring-1 ring-line">No vehicles match these filters.</p> : null}

      {filtered.length ? (
        <ol className={cn("grid gap-3", (quick.refreshing || save.refreshing) && "opacity-70 transition-opacity")}>
          {filtered.map((item) => {
            const position = order.indexOf(item.id)
            return (
              <li key={item.id} className="flex flex-col gap-4 rounded-card bg-ivory p-4 shadow-soft ring-1 ring-line sm:flex-row sm:items-center">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-stone-deep sm:w-32">
                  {item.coverUrl ? (
                    <Image src={item.coverUrl} alt="" fill sizes="8rem" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center px-2 text-center text-xs text-muted">No photo yet</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-bold text-forest">{item.name}</h3>
                    <StatusPill status={item.published ? "PUBLISHED" : "DRAFT"} />
                  </div>
                  {item.nameMr ? <p className="text-sm text-muted">{item.nameMr}</p> : null}
                  <p className="mt-1 text-sm text-ink/80">{factsOf(item)}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.photos.length} {item.photos.length === 1 ? "photo" : "photos"} · Position {position + 1}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:max-w-xs sm:justify-end">
                  <IconButton label={`Move ${item.name} up`} disabled={filtering || quick.busy || position === 0} onClick={() => move(item.id, -1)} icon={<ArrowUp className="size-4" />} />
                  <IconButton
                    label={`Move ${item.name} down`}
                    disabled={filtering || quick.busy || position === order.length - 1}
                    onClick={() => move(item.id, 1)}
                    icon={<ArrowDown className="size-4" />}
                  />
                  <ActionButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => open(item)} />
                  <ActionButton
                    label={item.published ? "Unpublish" : "Publish"}
                    icon={item.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    disabled={quick.busy}
                    onClick={() =>
                      quick.run(() => saveContentItem("vehicles", item.id, { published: !item.published }), {
                        success: item.published ? "Vehicle unpublished" : "Vehicle published",
                        description: item.name,
                        failure: "Vehicle not updated",
                      })
                    }
                  />
                  <ActionButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(item)} />
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}

      <VehicleEditor
        key={editor.session}
        open={editor.open}
        item={editor.item}
        uploads={uploads}
        save={save}
        onCreated={(created) => setEditor((state) => ({ ...state, item: created }))}
        onClose={() => setEditor((state) => ({ ...state, open: false }))}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this vehicle?"
        body={
          <>
            <strong className="text-ink">{deleting?.name}</strong> and its {deleting?.photos.length ?? 0} photos will be removed from the website. Past enquiries are not affected. To
            hide it for now, unpublish it instead.
          </>
        }
        confirmLabel="Delete vehicle"
        busyLabel="Deleting…"
        busy={quick.busy}
        onConfirm={async () => {
          if (!deleting) return
          const done = await quick.run(() => deleteContentItem("vehicles", deleting.id), { success: "Vehicle deleted", description: deleting.name, failure: "Vehicle not deleted" })
          if (done !== null) setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function VehicleEditor({
  open,
  item,
  uploads,
  save,
  onCreated,
  onClose,
}: {
  open: boolean
  item: AdminVehicle | null
  uploads: UploadsStatus
  save: ReturnType<typeof useSave>
  onCreated: (item: AdminVehicle) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Form>(item ? fromItem(item) : blank)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const e = save.errors

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await save.run(() => saveContentItem<{ vehicle: AdminVehicle }>("vehicles", item?.id ?? null, toBody(form)), {
      success: item ? "Vehicle saved" : "Vehicle added",
      description: item ? form.name.en : "Now add its photos below.",
      failure: "Vehicle not saved",
      inline: true,
    })
    if (!result) return
    // A new vehicle stays open so its photos can be added straight away
    if (item) onClose()
    else onCreated(result.vehicle)
  }

  return (
    <EditorDrawer
      open={open}
      title={item ? "Edit vehicle" : "Add a vehicle"}
      description="Only enter details the business has confirmed. Leave seats or AC empty until they are confirmed; they are not shown until then."
      busy={save.busy}
      error={save.formError}
      submitLabel={item ? "Save changes" : "Add vehicle"}
      onSubmit={submit}
      onClose={onClose}
      wide
    >
      <BilingualField label="Vehicle name" value={form.name} onChange={(value) => set("name", value)} errors={{ en: e.name, mr: e.nameMr }} max={80} hint="e.g. “26 Seater Bus”." />
      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          label="Passenger seats"
          optional
          type="number"
          value={form.capacity}
          onChange={(value) => set("capacity", value)}
          error={e.capacity}
          hint="Empty until confirmed."
        />
        <SelectField
          label="AC"
          value={form.ac}
          onChange={(value) => set("ac", value as Form["ac"])}
          options={[
            { value: "", label: "Not confirmed yet" },
            { value: "BOTH", label: "AC / Non-AC (either)" },
            { value: "AC", label: "AC only" },
            { value: "NON_AC", label: "Non-AC only" },
          ]}
          error={e.ac}
        />
        <SelectField
          label="Kind of vehicle"
          value={form.category}
          onChange={(value) => set("category", value as Category)}
          options={categories.map((value) => ({ value, label: categoryLabels[value] }))}
          error={e.category}
        />
      </div>
      <CheckField label="Push-back seats available" description="Shows “Push-back seats available” on the vehicle's card." checked={form.pushBackSeats} onChange={(value) => set("pushBackSeats", value)} />
      <BilingualField
        label="Seating detail"
        optional
        value={form.seatingType}
        onChange={(value) => set("seatingType", value)}
        errors={{ en: e.seatingType, mr: e.seatingTypeMr }}
        max={120}
        hint="Only if confirmed, e.g. “2 + 2 seating”."
      />
      <BilingualField label="Description" optional multiline rows={3} value={form.description} onChange={(value) => set("description", value)} errors={{ en: e.description, mr: e.descriptionMr }} max={600} />
      <CheckField label="Published" description="Show this vehicle on the Our Fleet page." checked={form.published} onChange={(value) => set("published", value)} />

      {item ? (
        <PhotoManager key={item.id} vehicle={item} uploads={uploads} />
      ) : (
        <p className="rounded-control bg-stone px-4 py-3 text-sm text-muted">Photos can be added once the vehicle is saved.</p>
      )}
    </EditorDrawer>
  )
}

/** A chosen photo with its preview while it uploads (or the reason it could not be). */
type Pending = { id: number; file: File; preview: string; error?: string; retry?: boolean }

/** Why a chosen file cannot be uploaded, checked before sending (the server checks again). */
function fileProblem(file: File): string | undefined {
  if (/\.(heic|heif)$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif") {
    return "iPhone HEIC photos can't be used. Share the photo as JPG, or set the iPhone camera to Most Compatible (Settings › Camera › Formats)."
  }
  if (!accepted.includes(file.type)) return "Use a JPG, PNG, WebP or AVIF photo."
  if (file.size > MAX_MB * 1024 * 1024) return `Photos must be ${MAX_MB} MB or smaller. This one is ${Math.ceil(file.size / 1024 / 1024)} MB.`
  return undefined
}

/** Why an upload failed, in words an admin can act on (the toast shows it too). */
function uploadProblem(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK") return "Couldn't reach the website. Check the connection and try again."
    if (error.code === "TIMEOUT") return "The upload took too long. Check the connection and try again."
    // The host refuses large requests before they reach the website (plain-text 413, no JSON)
    if (error.status === 413 && error.code === "INTERNAL") return `This photo is too large for the website's host to accept. Choose a photo under ${MAX_MB} MB or resize it, then try again.`
    if (error.code !== "INTERNAL" || error.status < 500) return error.errors[0]?.message ?? error.message
  }
  return "This photo could not be uploaded. Try again or choose another."
}

function PhotoManager({ vehicle: initial, uploads }: { vehicle: AdminVehicle; uploads: UploadsStatus }) {
  const action = useSave()
  const [vehicle, setVehicle] = useState(initial)
  const [pending, setPending] = useState<Pending[]>([])
  const [chooserError, setChooserError] = useState<string | null>(null)
  /** The batch being uploaded, for the "Uploading 2 of 5…" line. */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [removing, setRemoving] = useState<AdminVehicle["photos"][number] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const replacing = useRef<string | null>(null)
  const nextId = useRef(0)
  const pendingRef = useRef<Pending[]>([])
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  // Release preview URLs when the editor closes
  useEffect(() => () => pendingRef.current.forEach((item) => URL.revokeObjectURL(item.preview)), [])

  const photos = vehicle.photos
  const room = PHOTO_LIMIT - photos.length - pending.length

  /** Chosen photos upload straight away; their previews show until each one is saved. */
  function choose(files: FileList | null) {
    if (!files) return
    setChooserError(null)
    const next: Pending[] = []
    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      next.push({ id: nextId.current++, file, preview: URL.createObjectURL(file), error: fileProblem(file) })
    }
    if (files.length > room) setChooserError(`A vehicle can have up to ${PHOTO_LIMIT} photos; only the first ${Math.max(0, room)} were added.`)
    setPending((current) => [...current, ...next])
    if (fileRef.current) fileRef.current.value = ""
    void upload(next.filter((item) => !item.error))
  }

  function discard(id: number) {
    setPending((current) => {
      const found = current.find((item) => item.id === id)
      if (found) URL.revokeObjectURL(found.preview)
      return current.filter((item) => item.id !== id)
    })
  }

  async function upload(items: Pending[]) {
    if (!items.length) return
    setProgress({ done: 0, total: items.length })
    for (const [index, item] of items.entries()) {
      const data = new FormData()
      data.set("image", item.file)
      let failure: unknown = null
      const result = await action.run(
        () =>
          addVehiclePhoto<{ vehicle: AdminVehicle }>(vehicle.id, data).catch((error: unknown) => {
            failure = error
            throw error
          }),
        { success: "Photo added", description: item.file.name, failure: "Photo not added" },
      )
      if (result) {
        setVehicle(result.vehicle)
        discard(item.id)
      } else {
        setPending((current) => current.map((entry) => (entry.id === item.id ? { ...entry, error: uploadProblem(failure), retry: true } : entry)))
      }
      setProgress({ done: index + 1, total: items.length })
    }
    setProgress(null)
  }

  async function arrange(ids: string[], coverId: string) {
    const result = await action.run(() => arrangeVehiclePhotos<{ vehicle: AdminVehicle }>(vehicle.id, ids, coverId), { success: "Photos saved", failure: "Photos not saved" })
    if (result) setVehicle(result.vehicle)
  }

  const coverId = (photos.find((photo) => photo.isCover) ?? photos[0])?.id ?? ""
  const shift = (index: number, direction: -1 | 1) => {
    const ids = photos.map((photo) => photo.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    return arrange(ids, coverId)
  }

  async function replace(file: File | undefined) {
    const photoId = replacing.current
    replacing.current = null
    if (replaceRef.current) replaceRef.current.value = ""
    if (!file || !photoId) return
    const problem = fileProblem(file)
    if (problem) {
      setChooserError(problem)
      return
    }
    const data = new FormData()
    data.set("image", file)
    const result = await action.run(() => updateVehiclePhoto<{ vehicle: AdminVehicle }>(vehicle.id, photoId, data), { success: "Photo replaced", failure: "Photo not replaced" })
    if (result) setVehicle(result.vehicle)
  }

  async function saveDescription(photoId: string, alt: string, altMr: string) {
    const data = new FormData()
    data.set("alt", alt)
    data.set("altMr", altMr)
    const result = await action.run(() => updateVehiclePhoto<{ vehicle: AdminVehicle }>(vehicle.id, photoId, data), { success: "Description saved", failure: "Description not saved" })
    if (result) setVehicle(result.vehicle)
  }

  return (
    <section aria-labelledby={`photos-${vehicle.id}`} className="grid gap-4 border-t border-line pt-6">
      <div>
        <h3 id={`photos-${vehicle.id}`} className="font-bold text-forest">
          Photos ({photos.length} of {PHOTO_LIMIT})
        </h3>
        <p className="mt-1 text-sm text-muted">Only genuine photos of this vehicle. The cover photo is shown on its card; the others in its photo viewer. Changes here are saved straight away.</p>
      </div>

      {photos.length ? (
        <ol className="grid gap-3 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={index}
              count={photos.length}
              cover={photo.id === coverId}
              busy={action.busy}
              onCover={() => arrange(photos.map((item) => item.id), photo.id)}
              onMove={(direction) => shift(index, direction)}
              onReplace={() => {
                replacing.current = photo.id
                replaceRef.current?.click()
              }}
              onRemove={() => setRemoving(photo)}
              onDescribe={(alt, altMr) => saveDescription(photo.id, alt, altMr)}
            />
          ))}
        </ol>
      ) : (
        <p className="rounded-control bg-stone px-4 py-6 text-center text-sm text-muted">No photos yet. The card shows a “photo coming soon” panel until one is added.</p>
      )}

      <input ref={replaceRef} type="file" accept={accepted.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => replace(event.target.files?.[0])} />

      {/* Add photos from the computer; each one uploads as soon as it is chosen */}
      <div className="grid gap-3 rounded-control bg-stone/70 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            id={`add-${vehicle.id}`}
            type="file"
            multiple
            accept={accepted.join(",")}
            className="sr-only"
            disabled={!uploads.enabled || room <= 0}
            onChange={(event) => choose(event.target.files)}
          />
          <label
            htmlFor={`add-${vehicle.id}`}
            className={cn(actionClass, "cursor-pointer", (!uploads.enabled || room <= 0) && "pointer-events-none opacity-50")}
            aria-disabled={!uploads.enabled || room <= 0}
          >
            <ImagePlus aria-hidden="true" className="size-4" /> Add Photos
          </label>
          <span className="text-xs text-muted">JPG, PNG, WebP or AVIF, up to {MAX_MB} MB each (the most the website&apos;s host accepts). They upload as soon as you choose them.</span>
        </div>
        {!uploads.enabled ? <p className="text-xs text-muted">Photo uploads are switched off on this website, so photos can&apos;t be added right now.</p> : null}
        {progress ? (
          <p role="status" className="text-sm font-semibold text-forest">
            Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…
          </p>
        ) : null}
        {chooserError ? (
          <p role="alert" className="text-sm text-danger">
            {chooserError}
          </p>
        ) : null}

        {pending.length ? (
          <ul aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pending.map((item) => (
              <li key={item.id} className="grid gap-1.5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob: URL), not an optimised website image */}
                  <img src={item.preview} alt="" className={cn("size-full object-cover", !item.error && "opacity-60")} />
                  {item.error ? null : (
                    <span className="absolute inset-0 grid place-items-center text-xs font-bold text-forest">
                      <span className="rounded-full bg-white/90 px-3 py-1">Uploading…</span>
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted">{item.file.name}</p>
                {item.error ? (
                  <>
                    <p role="alert" className="text-xs text-danger">
                      {item.error}
                    </p>
                    <div className="flex gap-3">
                      {item.retry ? (
                        <button
                          type="button"
                          disabled={action.busy}
                          onClick={() => {
                            const again = { ...item, error: undefined, retry: undefined }
                            setPending((current) => current.map((entry) => (entry.id === item.id ? again : entry)))
                            void upload([again])
                          }}
                          className={cn("text-xs font-semibold text-forest underline", focusRing)}
                        >
                          Try again
                        </button>
                      ) : null}
                      <button type="button" onClick={() => discard(item.id)} className={cn("text-xs font-semibold text-danger underline", focusRing)}>
                        Dismiss
                      </button>
                    </div>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this photo?"
        body={<>The photo will be removed from this vehicle{removing?.uploaded ? " and the uploaded file deleted" : ""}. This cannot be undone.</>}
        confirmLabel="Remove photo"
        busyLabel="Removing…"
        busy={action.busy}
        onConfirm={async () => {
          if (!removing) return
          const result = await action.run(() => deleteVehiclePhoto<{ vehicle: AdminVehicle }>(vehicle.id, removing.id), { success: "Photo removed", failure: "Photo not removed" })
          if (result) {
            setVehicle(result.vehicle)
            setRemoving(null)
          }
        }}
        onCancel={() => setRemoving(null)}
      />
    </section>
  )
}

function PhotoCard({
  photo,
  index,
  count,
  cover,
  busy,
  onCover,
  onMove,
  onReplace,
  onRemove,
  onDescribe,
}: {
  photo: AdminVehicle["photos"][number]
  index: number
  count: number
  cover: boolean
  busy: boolean
  onCover: () => void
  onMove: (direction: -1 | 1) => void
  onReplace: () => void
  onRemove: () => void
  onDescribe: (alt: string, altMr: string) => void
}) {
  const [alt, setAlt] = useState(photo.alt ?? "")
  const [altMr, setAltMr] = useState(photo.altMr ?? "")
  const changed = alt !== (photo.alt ?? "") || altMr !== (photo.altMr ?? "")

  return (
    <li className="grid gap-2 rounded-control bg-white p-3 ring-1 ring-line">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-deep">
        <Image src={photo.url} alt="" fill sizes="(min-width: 640px) 18rem, 90vw" className="object-cover" />
        {cover ? (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-1 text-xs font-bold text-white">
            <Star aria-hidden="true" className="size-3.5 fill-current" /> Cover
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cover ? null : <ActionButton label="Make cover" icon={<Star className="size-4" />} disabled={busy} onClick={onCover} />}
        <IconButton label={`Move photo ${index + 1} earlier`} disabled={busy || index === 0} onClick={() => onMove(-1)} icon={<ArrowLeft className="size-4" />} />
        <IconButton label={`Move photo ${index + 1} later`} disabled={busy || index === count - 1} onClick={() => onMove(1)} icon={<ArrowRight className="size-4" />} />
        <ActionButton label="Replace" icon={<RefreshCw className="size-4" />} disabled={busy} onClick={onReplace} />
        <ActionButton label="Remove" tone="danger" icon={<Trash2 className="size-4" />} disabled={busy} onClick={onRemove} />
      </div>
      <label className="grid gap-1 text-xs font-semibold text-forest">
        Photo description (for screen readers)
        <input value={alt} onChange={(event) => setAlt(event.target.value)} maxLength={200} className={inputClass} placeholder="What the photo shows" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-forest">
        Marathi description
        <input value={altMr} onChange={(event) => setAltMr(event.target.value)} maxLength={200} className={inputClass} />
      </label>
      {changed ? (
        <button type="button" disabled={busy} onClick={() => onDescribe(alt, altMr)} className={cn(actionClass, "justify-self-start")}>
          Save description
        </button>
      ) : null}
    </li>
  )
}

function Notice({ tone, children }: { tone: "warning"; children: ReactNode }) {
  return (
    <p role="status" className={cn("flex items-start gap-2 rounded-card px-4 py-3 text-sm", tone === "warning" && "bg-coral-soft text-ink ring-1 ring-coral/30")}>
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

const actionClass = cn(
  "inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-xs font-bold ring-1 transition-colors text-forest ring-line hover:bg-white disabled:cursor-not-allowed disabled:opacity-60",
  focusRing,
)

function ActionButton({ label, icon, onClick, disabled, tone = "default" }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean; tone?: "default" | "danger" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(actionClass, tone === "danger" && "text-danger ring-danger/25 hover:bg-danger-soft")}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}

function IconButton({ label, icon, onClick, disabled }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn(actionClass, "w-10 justify-center px-0")}>
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}
