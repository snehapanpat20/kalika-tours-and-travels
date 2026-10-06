"use client"

import Image from "next/image"
import { useState, type FormEvent, type ReactNode } from "react"
import { Download, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { travelTypeLabels, travelTypeOrder } from "@/components/admin/format"
import { EditorDrawer } from "@/components/admin/kit/editor-drawer"
import { BilingualField, CheckField, IconField, SelectField, TextField } from "@/components/admin/kit/form-controls"
import { ImageInput, appendImage, type ImageValue, type UploadsStatus } from "@/components/admin/kit/image-input"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { useSave } from "@/components/admin/kit/use-save"
import { cmsIcon } from "@/components/cms/cms-icon"
import { focusRing } from "@/components/ui/styles"
import { deleteContentItem, importBuiltIn, previewHref, saveContentItem } from "@/lib/api/admin"
import type { CmsIconName } from "@/lib/cms/icons"
import { cn } from "@/lib/utils/cn"
import type { AdminService } from "@/server/cms/services"

type Bi = { en: string; mr: string }
type Form = {
  title: Bi
  shortDescription: Bi
  description: Bi
  suitableFor: Bi
  enquiryType: AdminService["enquiryType"]
  icon: string
  imageAlt: string
  sortOrder: string
  published: boolean
}

const blank: Form = {
  title: { en: "", mr: "" },
  shortDescription: { en: "", mr: "" },
  description: { en: "", mr: "" },
  suitableFor: { en: "", mr: "" },
  enquiryType: "OUTSTATION",
  icon: "route",
  imageAlt: "",
  sortOrder: "0",
  published: true,
}

const fromItem = (item: AdminService): Form => ({
  title: { en: item.title, mr: item.titleMr ?? "" },
  shortDescription: { en: item.shortDescription, mr: item.shortDescriptionMr ?? "" },
  description: { en: item.description ?? "", mr: item.descriptionMr ?? "" },
  suitableFor: { en: item.suitableFor ?? "", mr: item.suitableForMr ?? "" },
  enquiryType: item.enquiryType,
  icon: item.icon,
  imageAlt: item.imageAlt ?? "",
  sortOrder: String(item.sortOrder),
  published: item.published,
})

function toFormData(form: Form, image: ImageValue) {
  const data = new FormData()
  for (const key of ["title", "shortDescription", "description", "suitableFor"] as const) {
    data.set(key, form[key].en)
    data.set(`${key}Mr`, form[key].mr)
  }
  data.set("enquiryType", form.enquiryType)
  data.set("icon", form.icon)
  data.set("imageAlt", form.imageAlt)
  data.set("sortOrder", form.sortOrder || "0")
  data.set("published", form.published ? "true" : "false")
  appendImage(data, image)
  return data
}

/** Services shown on the website. The enquiry form keeps its five fixed trip types. */
export function ServicesManager({ items, totalAll, bundledImages, uploads }: { items: AdminService[]; totalAll: number; bundledImages: string[]; uploads: UploadsStatus }) {
  const save = useSave()
  const quick = useSave()
  const [editor, setEditor] = useState<{ open: boolean; item: AdminService | null; session: number }>({ open: false, item: null, session: 0 })
  const [deleting, setDeleting] = useState<AdminService | null>(null)

  const open = (item: AdminService | null) => {
    save.reset()
    setEditor((state) => ({ open: true, item, session: state.session + 1 }))
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <a href={previewHref("/en/services")} target="_blank" rel="noopener noreferrer" className={actionClass}>
          <Eye aria-hidden="true" className="size-4" /> Preview page <span className="sr-only">(opens in a new tab)</span>
        </a>
        <button
          type="button"
          onClick={() => open(null)}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-bold text-forest-deep hover:bg-coral/90", focusRing)}
        >
          <Plus aria-hidden="true" className="size-4" /> Add Service
        </button>
      </div>

      {totalAll === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-card bg-teal-soft/60 p-5 ring-1 ring-teal/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-forest">The website is showing its five built-in services.</p>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Import them to start editing: titles, descriptions, “suitable for” lists (English and Marathi) and photos are copied here. Nothing on the website changes until you edit.
            </p>
          </div>
          <button
            type="button"
            disabled={quick.busy}
            onClick={() => quick.run(() => importBuiltIn("services"), { success: "Services imported", failure: "Services not imported" })}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill bg-forest px-5 text-sm font-bold text-white hover:bg-forest-soft disabled:opacity-60", focusRing)}
          >
            <Download aria-hidden="true" className="size-4" /> {quick.busy ? "Importing…" : "Import current services"}
          </button>
        </div>
      ) : null}

      {items.length ? (
        <ul className={cn("grid gap-3 md:grid-cols-2", (quick.refreshing || save.refreshing) && "opacity-70 transition-opacity")}>
          {items.map((item) => {
            const Icon = cmsIcon(item.icon)
            return (
              <li key={item.id} className="flex gap-4 rounded-card bg-ivory p-4 shadow-soft ring-1 ring-line">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-stone-deep">
                  {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="6rem" className="object-cover" /> : null}
                  <span className="absolute bottom-1.5 left-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-teal-deep">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-bold text-forest">{item.title}</h3>
                    <StatusPill status={item.published ? "PUBLISHED" : "DRAFT"} />
                  </div>
                  <p className="text-xs text-muted">
                    Enquiries as: {travelTypeLabels[item.enquiryType]} · Order {item.sortOrder}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{item.shortDescription}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <ActionButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => open(item)} />
                    <ActionButton
                      label={item.published ? "Unpublish" : "Publish"}
                      icon={item.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      disabled={quick.busy}
                      onClick={() => {
                        const data = new FormData()
                        data.set("published", item.published ? "false" : "true")
                        quick.run(() => saveContentItem("services", item.id, data), {
                          success: item.published ? "Service unpublished" : "Service published",
                          description: item.title,
                          failure: "Service not updated",
                        })
                      }}
                    />
                    <ActionButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(item)} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}

      <ServiceEditor key={editor.session} open={editor.open} item={editor.item} bundledImages={bundledImages} uploads={uploads} save={save} onClose={() => setEditor((state) => ({ ...state, open: false }))} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this service?"
        body={
          <>
            <strong className="text-ink">{deleting?.title}</strong> will be removed from the website. The enquiry form is not affected. To hide it for now, unpublish it instead.
          </>
        }
        confirmLabel="Delete service"
        busyLabel="Deleting…"
        busy={quick.busy}
        onConfirm={async () => {
          if (!deleting) return
          const done = await quick.run(() => deleteContentItem("services", deleting.id), { success: "Service deleted", description: deleting.title, failure: "Service not deleted" })
          if (done !== null) setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function ServiceEditor({
  open,
  item,
  bundledImages,
  uploads,
  save,
  onClose,
}: {
  open: boolean
  item: AdminService | null
  bundledImages: string[]
  uploads: UploadsStatus
  save: ReturnType<typeof useSave>
  onClose: () => void
}) {
  const [form, setForm] = useState<Form>(item ? fromItem(item) : blank)
  const [image, setImage] = useState<ImageValue>({ kind: "keep" })
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const e = save.errors

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const done = await save.run(() => saveContentItem("services", item?.id ?? null, toFormData(form, image)), {
      success: item ? "Service saved" : "Service added",
      description: form.title.en,
      failure: "Service not saved",
      inline: true,
    })
    if (done) onClose()
  }

  return (
    <EditorDrawer
      open={open}
      title={item ? "Edit service" : "Add a service"}
      description="Shown on the Services page and as a card on the homepage."
      busy={save.busy}
      error={save.formError}
      submitLabel={item ? "Save changes" : "Add service"}
      onSubmit={submit}
      onClose={onClose}
      wide
    >
      <BilingualField label="Service title" value={form.title} onChange={(value) => set("title", value)} errors={{ en: e.title, mr: e.titleMr }} max={80} />
      <BilingualField label="Short description" multiline rows={2} value={form.shortDescription} onChange={(value) => set("shortDescription", value)} errors={{ en: e.shortDescription, mr: e.shortDescriptionMr }} max={240} />
      <BilingualField label="Full description" optional multiline rows={4} value={form.description} onChange={(value) => set("description", value)} errors={{ en: e.description, mr: e.descriptionMr }} max={2000} />
      <BilingualField
        label="Suitable for"
        optional
        multiline
        rows={4}
        value={form.suitableFor}
        onChange={(value) => set("suitableFor", value)}
        errors={{ en: e.suitableFor, mr: e.suitableForMr }}
        max={1000}
        hint="One item per line, e.g. “Families travelling with elders and children”."
      />
      <SelectField
        label="“Plan This Trip” selects"
        value={form.enquiryType}
        onChange={(value) => set("enquiryType", value as Form["enquiryType"])}
        options={travelTypeOrder.map((type) => ({ value: type, label: travelTypeLabels[type] }))}
        hint="The enquiry form has five fixed trip types; pick the one this service belongs to."
        error={e.enquiryType}
      />
      <IconField label="Icon" value={form.icon} onChange={(value: CmsIconName) => set("icon", value)} names={["route", "heart", "users", "landmark", "briefcase", "bus", "shield", "check"]} />
      <ImageInput label="Photo" currentUrl={item?.imageUrl ?? null} value={image} onChange={setImage} bundledImages={bundledImages} uploads={uploads} error={e.image} />
      <TextField label="Photo description" optional value={form.imageAlt} onChange={(value) => set("imageAlt", value)} error={e.imageAlt} max={200} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Display order" type="number" value={form.sortOrder} onChange={(value) => set("sortOrder", value)} error={e.sortOrder} hint="Lower numbers show first." />
        <CheckField label="Published" description="Show this service on the website." checked={form.published} onChange={(value) => set("published", value)} />
      </div>
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
