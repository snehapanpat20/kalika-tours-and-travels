"use client"

import Image from "next/image"
import { useState, type FormEvent, type ReactNode } from "react"
import { Download, Eye, EyeOff, MapPin, Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EditorDrawer } from "@/components/admin/kit/editor-drawer"
import { BilingualField, CheckField, SelectField, TextField } from "@/components/admin/kit/form-controls"
import { ImageInput, appendImage, type ImageValue, type UploadsStatus } from "@/components/admin/kit/image-input"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { useSave } from "@/components/admin/kit/use-save"
import { focusRing } from "@/components/ui/styles"
import { deleteContentItem, importBuiltIn, previewHref, saveContentItem } from "@/lib/api/admin"
import { destinationCategoryLabels } from "@/lib/cms/labels"
import { DESTINATION_PAGE_MIN_DESCRIPTION, slugify } from "@/lib/cms/slug"
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, defaultDestinationDescription, defaultDestinationTitle } from "@/lib/seo/destination-meta"
import { cn } from "@/lib/utils/cn"
import type { AdminDestination } from "@/server/cms/destinations"

type Bi = { en: string; mr: string }
type Form = { name: Bi; shortDescription: Bi; description: Bi; state: string; country: string; category: AdminDestination["category"]; imageAlt: string; sortOrder: string; published: boolean; slug: string; seoTitle: string; seoDescription: string }

const blank: Form = {
  name: { en: "", mr: "" },
  shortDescription: { en: "", mr: "" },
  description: { en: "", mr: "" },
  state: "",
  country: "India",
  category: "MAHARASHTRA",
  imageAlt: "",
  sortOrder: "0",
  published: true,
  slug: "",
  seoTitle: "",
  seoDescription: "",
}

const fromItem = (item: AdminDestination): Form => ({
  name: { en: item.name, mr: item.nameMr ?? "" },
  shortDescription: { en: item.shortDescription, mr: item.shortDescriptionMr ?? "" },
  description: { en: item.description ?? "", mr: item.descriptionMr ?? "" },
  state: item.state ?? "",
  country: item.country,
  category: item.category,
  imageAlt: item.imageAlt ?? "",
  sortOrder: String(item.sortOrder),
  published: item.published,
  slug: item.slug,
  seoTitle: item.seoTitle ?? "",
  seoDescription: item.seoDescription ?? "",
})

function toFormData(form: Form, image: ImageValue) {
  const data = new FormData()
  for (const key of ["name", "shortDescription", "description"] as const) {
    data.set(key, form[key].en)
    data.set(`${key}Mr`, form[key].mr)
  }
  data.set("state", form.state)
  data.set("country", form.country)
  data.set("category", form.category)
  data.set("imageAlt", form.imageAlt)
  data.set("sortOrder", form.sortOrder || "0")
  data.set("published", form.published ? "true" : "false")
  data.set("slug", form.slug.trim().toLowerCase())
  data.set("seoTitle", form.seoTitle)
  data.set("seoDescription", form.seoDescription)
  appendImage(data, image)
  return data
}

/** Destinations on the website: add, edit, publish, delete, or import what the site shows today. */
export function DestinationsManager({
  items,
  totalAll,
  bundledImages,
  uploads,
  emptyState,
}: {
  items: AdminDestination[]
  /** All destinations, ignoring filters: zero means the website still shows its built-in list. */
  totalAll: number
  bundledImages: string[]
  uploads: UploadsStatus
  emptyState: ReactNode
}) {
  const save = useSave()
  const quick = useSave()
  const [editor, setEditor] = useState<{ open: boolean; item: AdminDestination | null; session: number }>({ open: false, item: null, session: 0 })
  const [deleting, setDeleting] = useState<AdminDestination | null>(null)

  const open = (item: AdminDestination | null) => {
    save.reset()
    setEditor((state) => ({ open: true, item, session: state.session + 1 }))
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <a href={previewHref("/en/destinations")} target="_blank" rel="noopener noreferrer" className={actionClass}>
          <Eye aria-hidden="true" className="size-4" /> Preview page <span className="sr-only">(opens in a new tab)</span>
        </a>
        <button
          type="button"
          onClick={() => open(null)}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-bold text-forest-deep hover:bg-coral/90", focusRing)}
        >
          <Plus aria-hidden="true" className="size-4" /> Add Destination
        </button>
      </div>

      {totalAll === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-card bg-teal-soft/60 p-5 ring-1 ring-teal/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-forest">The website is showing its built-in destinations.</p>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Import them to start editing: the same places, descriptions (English and Marathi) and photos are copied here. Nothing on the website changes until you edit.
            </p>
          </div>
          <button
            type="button"
            disabled={quick.busy}
            onClick={() => quick.run(() => importBuiltIn("destinations"), { success: "Destinations imported", failure: "Destinations not imported" })}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill bg-forest px-5 text-sm font-bold text-white hover:bg-forest-soft disabled:opacity-60", focusRing)}
          >
            <Download aria-hidden="true" className="size-4" /> {quick.busy ? "Importing…" : "Import current destinations"}
          </button>
        </div>
      ) : null}

      {items.length ? (
        <ul className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", (quick.refreshing || save.refreshing) && "opacity-70 transition-opacity")}>
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-card bg-ivory p-3 shadow-soft ring-1 ring-line">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-stone-deep">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill sizes="5rem" className="object-cover" />
                ) : (
                  <MapPin aria-hidden="true" className="absolute inset-0 m-auto size-6 text-muted" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="font-bold text-forest">{item.name}</h3>
                  <StatusPill status={item.published ? "PUBLISHED" : "DRAFT"} />
                </div>
                <p className="text-xs text-muted">
                  {destinationCategoryLabels[item.category]}
                  {item.state ? ` · ${item.state}` : ""} · Order {item.sortOrder}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{item.shortDescription}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <ActionButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => open(item)} />
                  <ActionButton
                    label={item.published ? "Unpublish" : "Publish"}
                    icon={item.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    disabled={quick.busy}
                    onClick={() => {
                      const data = new FormData()
                      data.set("published", item.published ? "false" : "true")
                      quick.run(() => saveContentItem("destinations", item.id, data), {
                        success: item.published ? "Destination unpublished" : "Destination published",
                        description: item.name,
                        failure: "Destination not updated",
                      })
                    }}
                  />
                  <ActionButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(item)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : totalAll > 0 ? (
        emptyState
      ) : null}

      <DestinationEditor
        key={editor.session}
        open={editor.open}
        item={editor.item}
        bundledImages={bundledImages}
        uploads={uploads}
        save={save}
        onClose={() => setEditor((state) => ({ ...state, open: false }))}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this destination?"
        body={
          <>
            <strong className="text-ink">{deleting?.name}</strong> will be removed from the website. To hide it for now, unpublish it instead.
          </>
        }
        confirmLabel="Delete destination"
        busyLabel="Deleting…"
        busy={quick.busy}
        onConfirm={async () => {
          if (!deleting) return
          const done = await quick.run(() => deleteContentItem("destinations", deleting.id), { success: "Destination deleted", description: deleting.name, failure: "Destination not deleted" })
          if (done !== null) setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function DestinationEditor({
  open,
  item,
  bundledImages,
  uploads,
  save,
  onClose,
}: {
  open: boolean
  item: AdminDestination | null
  bundledImages: string[]
  uploads: UploadsStatus
  save: ReturnType<typeof useSave>
  onClose: () => void
}) {
  const [form, setForm] = useState<Form>(item ? fromItem(item) : blank)
  const [image, setImage] = useState<ImageValue>({ kind: "keep" })
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const e = save.errors
  const hasPage = form.description.en.trim().length >= DESTINATION_PAGE_MIN_DESCRIPTION
  const slugPreview = form.name.en ? slugify(form.name.en) : ""

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const done = await save.run(() => saveContentItem("destinations", item?.id ?? null, toFormData(form, image)), {
      success: item ? "Destination saved" : "Destination added",
      description: form.name.en,
      failure: "Destination not saved",
      inline: true,
    })
    if (done) onClose()
  }

  return (
    <EditorDrawer
      open={open}
      title={item ? "Edit destination" : "Add a destination"}
      description="Shown on the Destinations page, grouped by category."
      busy={save.busy}
      error={save.formError}
      submitLabel={item ? "Save changes" : "Add destination"}
      onSubmit={submit}
      onClose={onClose}
      wide
    >
      <BilingualField label="Name" value={form.name} onChange={(value) => set("name", value)} errors={{ en: e.name, mr: e.nameMr }} max={80} />
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          label="Category"
          value={form.category}
          onChange={(value) => set("category", value as Form["category"])}
          options={Object.entries(destinationCategoryLabels).map(([value, label]) => ({ value, label }))}
          error={e.category}
        />
        <TextField label="State" optional value={form.state} onChange={(value) => set("state", value)} error={e.state} max={80} />
        <TextField label="Country" value={form.country} onChange={(value) => set("country", value)} error={e.country} max={80} />
      </div>
      <BilingualField label="Short description" multiline rows={2} value={form.shortDescription} onChange={(value) => set("shortDescription", value)} errors={{ en: e.shortDescription, mr: e.shortDescriptionMr }} max={240} />
      <BilingualField
        label="More details"
        optional
        multiline
        rows={4}
        value={form.description}
        onChange={(value) => set("description", value)}
        errors={{ en: e.description, mr: e.descriptionMr }}
        max={2000}
        hint={`Visitors can open this under “More details”. With ${DESTINATION_PAGE_MIN_DESCRIPTION}+ characters in English, the destination also gets its own page on the website.`}
      />
      <ImageInput label="Photo (optional)" currentUrl={item?.imageUrl ?? null} value={image} onChange={setImage} bundledImages={bundledImages} uploads={uploads} error={e.image} />
      <TextField label="Photo description" optional value={form.imageAlt} onChange={(value) => set("imageAlt", value)} error={e.imageAlt} max={200} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Display order" type="number" value={form.sortOrder} onChange={(value) => set("sortOrder", value)} error={e.sortOrder} hint="Lower numbers show first." />
        <CheckField label="Published" description="Show this destination on the website." checked={form.published} onChange={(value) => set("published", value)} />
      </div>
      <fieldset className="grid gap-5 rounded-card border border-line p-4 sm:p-5">
        <legend className="px-1 text-sm font-bold text-forest">Search engines (optional)</legend>
        <p className="-mt-2 text-sm text-muted">
          {hasPage
            ? "This destination has its own page. Leave these empty to use the defaults shown."
            : `These are used once the destination has its own page (an English “More details” of ${DESTINATION_PAGE_MIN_DESCRIPTION}+ characters).`}
        </p>
        <TextField
          label="Web address"
          optional
          value={form.slug}
          onChange={(value) => set("slug", value)}
          error={e.slug}
          max={80}
          placeholder={item?.slug ?? (slugPreview || "made from the name")}
          hint={
            <>
              /en/destinations/<strong>{form.slug.trim().toLowerCase() || item?.slug || slugPreview || "…"}</strong> · lowercase letters, numbers and hyphens.
              {item ? " Changing it breaks links people already shared." : " Leave empty to make it from the name."}
            </>
          }
        />
        <TextField
          label="SEO title"
          optional
          value={form.seoTitle}
          onChange={(value) => set("seoTitle", value)}
          error={e.seoTitle}
          max={SEO_TITLE_MAX}
          placeholder={form.name.en ? defaultDestinationTitle("en", form.name.en.trim()) : undefined}
          hint="Shown as the headline in Google results. Aim for 50–60 characters, describing this place honestly."
        />
        <TextField
          label="Meta description"
          optional
          multiline
          rows={2}
          value={form.seoDescription}
          onChange={(value) => set("seoDescription", value)}
          error={e.seoDescription}
          max={SEO_DESCRIPTION_MAX}
          placeholder={form.name.en && form.shortDescription.en ? defaultDestinationDescription("en", form.name.en.trim(), form.shortDescription.en) : undefined}
          hint="The summary under the title in results. Aim for 120–160 characters."
        />
      </fieldset>
    </EditorDrawer>
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
