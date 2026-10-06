"use client"

import { useState, type FormEvent } from "react"
import { travelTypeLabels, travelTypeOrder } from "@/components/admin/format"
import { EditorDrawer } from "@/components/admin/kit/editor-drawer"
import { CheckField, SelectField, TextField } from "@/components/admin/kit/form-controls"
import { ImageInput, type ImageValue, type UploadsStatus } from "@/components/admin/kit/image-input"
import { useSave } from "@/components/admin/kit/use-save"
import { createGalleryItem, updateGalleryItem, type AdminGalleryItem } from "@/lib/api/admin"

export type EditorUploads = UploadsStatus

/**
 * Add or edit a gallery photo in a side panel. The parent gives each opening
 * its own `key`, so every session starts with a fresh form.
 */
export function GalleryEditor({
  open,
  item,
  bundledImages,
  uploads,
  onClose,
}: {
  open: boolean
  item: AdminGalleryItem | null
  bundledImages: string[]
  uploads: EditorUploads
  onClose: () => void
}) {
  const save = useSave()
  const [image, setImage] = useState<ImageValue>({ kind: "keep" })
  const [form, setForm] = useState({
    title: item?.title ?? "",
    altText: item?.altText ?? "",
    caption: item?.caption ?? "",
    destination: item?.destination ?? "",
    tripType: item?.tripType ?? "",
    tripDate: item?.tripDate ?? "",
    sortOrder: String(item?.sortOrder ?? 0),
    published: item?.published ?? false,
    featured: item?.featured ?? false,
  })
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }))
  const [missingImage, setMissingImage] = useState<string | null>(null)
  const e = save.errors

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!item && image.kind !== "upload" && image.kind !== "website") {
      setMissingImage("Add a photo: upload one or choose a website photo.")
      return
    }
    setMissingImage(null)
    // Every field is sent, so switching something off (e.g. Published) is saved too
    const body = new FormData()
    for (const key of ["title", "altText", "caption", "destination", "tripType", "tripDate", "sortOrder"] as const) body.set(key, form[key])
    body.set("published", form.published ? "true" : "false")
    body.set("featured", form.featured ? "true" : "false")
    if (image.kind === "upload") body.set("image", image.file)
    if (image.kind === "website") body.set("imagePath", image.path)

    const done = await save.run(() => (item ? updateGalleryItem(item.id, body) : createGalleryItem(body)), {
      success: item ? "Photo updated" : "Photo added",
      description: form.title,
      failure: "Photo not saved",
      inline: true,
    })
    if (done) onClose()
  }

  return (
    <EditorDrawer
      open={open}
      title={item ? "Edit photo" : "Add a photo"}
      description={item ? "Changes show on the website straight away." : "Only published photos appear on the website."}
      busy={save.busy}
      error={save.formError}
      submitLabel={item ? "Save changes" : "Add photo"}
      onSubmit={submit}
      onClose={onClose}
    >
      <ImageInput
        label={item ? "Photo (upload a new one to replace it)" : "Photo"}
        currentUrl={item?.imageUrl ?? null}
        value={image}
        onChange={(value) => {
          setMissingImage(null)
          setImage(value)
        }}
        bundledImages={bundledImages}
        uploads={uploads}
        allowRemove={false}
        aspect="aspect-[4/3]"
        hint="Real photos from Kalika trips. Location data is removed from uploads automatically."
        error={missingImage ?? e.image ?? e.imagePath}
      />
      <TextField label="Title" value={form.title} onChange={(value) => set("title", value)} error={e.title} max={120} />
      <TextField
        label="Alt text"
        optional
        value={form.altText}
        onChange={(value) => set("altText", value)}
        error={e.altText}
        max={200}
        hint="Describe what the photo shows, for people using screen readers. Without it, the title is used."
      />
      <TextField label="Description" optional multiline value={form.caption} onChange={(value) => set("caption", value)} error={e.caption} max={500} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Category"
          value={form.tripType}
          onChange={(value) => set("tripType", value)}
          options={[{ value: "", label: "No category" }, ...travelTypeOrder.map((type) => ({ value: type, label: travelTypeLabels[type] }))]}
          hint="Used by the filters on the gallery page."
          error={e.tripType}
        />
        <TextField label="Destination" optional value={form.destination} onChange={(value) => set("destination", value)} error={e.destination} max={120} />
        <TextField label="Trip date" optional type="date" value={form.tripDate} onChange={(value) => set("tripDate", value)} error={e.tripDate} />
        <TextField label="Display order" type="number" value={form.sortOrder} onChange={(value) => set("sortOrder", value)} error={e.sortOrder} hint="Lower numbers show first." />
      </div>
      <div className="grid gap-2">
        <CheckField label="Published" description="Show this photo in the website gallery." checked={form.published} onChange={(value) => set("published", value)} />
        <CheckField label="Featured" description="Also show it on the homepage (published photos only)." checked={form.featured} onChange={(value) => set("featured", value)} />
      </div>
    </EditorDrawer>
  )
}
