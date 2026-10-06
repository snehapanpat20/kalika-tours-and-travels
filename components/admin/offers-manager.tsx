"use client"

import Image from "next/image"
import { useState, type FormEvent } from "react"
import { CalendarClock, Eye, EyeOff, Pencil, Plus, Tag, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EditorDrawer } from "@/components/admin/kit/editor-drawer"
import { BilingualField, LinkField, TextField } from "@/components/admin/kit/form-controls"
import { ImageInput, appendImage, type ImageValue, type UploadsStatus } from "@/components/admin/kit/image-input"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { useSave } from "@/components/admin/kit/use-save"
import { focusRing } from "@/components/ui/styles"
import { deleteContentItem, previewHref, saveContentItem } from "@/lib/api/admin"
import { describeLink } from "@/lib/cms/links"
import { formatIst, toIstInput } from "@/lib/cms/schedule"
import { cn } from "@/lib/utils/cn"
import type { AdminOffer } from "@/server/cms/offers"

type Form = {
  title: { en: string; mr: string }
  label: { en: string; mr: string }
  shortDescription: { en: string; mr: string }
  description: { en: string; mr: string }
  ctaText: { en: string; mr: string }
  ctaLink: string
  imageAlt: string
  startsAt: string
  endsAt: string
  sortOrder: string
}

const blank: Form = {
  title: { en: "", mr: "" },
  label: { en: "", mr: "" },
  shortDescription: { en: "", mr: "" },
  description: { en: "", mr: "" },
  ctaText: { en: "", mr: "" },
  ctaLink: "page:plan",
  imageAlt: "",
  startsAt: "",
  endsAt: "",
  sortOrder: "0",
}

const fromOffer = (offer: AdminOffer): Form => ({
  title: { en: offer.title, mr: offer.titleMr ?? "" },
  label: { en: offer.label ?? "", mr: offer.labelMr ?? "" },
  shortDescription: { en: offer.shortDescription, mr: offer.shortDescriptionMr ?? "" },
  description: { en: offer.description ?? "", mr: offer.descriptionMr ?? "" },
  ctaText: { en: offer.ctaText ?? "", mr: offer.ctaTextMr ?? "" },
  ctaLink: offer.ctaLink ?? "",
  imageAlt: offer.imageAlt ?? "",
  startsAt: toIstInput(offer.startsAt),
  endsAt: toIstInput(offer.endsAt),
  sortOrder: String(offer.sortOrder),
})

function toFormData(form: Form, published: boolean, image: ImageValue) {
  const data = new FormData()
  const pairs: [keyof Form, string][] = [
    ["title", "title"],
    ["label", "label"],
    ["shortDescription", "shortDescription"],
    ["description", "description"],
    ["ctaText", "ctaText"],
  ]
  for (const [key, field] of pairs) {
    const value = form[key] as { en: string; mr: string }
    data.set(field, value.en)
    data.set(`${field}Mr`, value.mr)
  }
  data.set("ctaLink", form.ctaLink)
  data.set("imageAlt", form.imageAlt)
  data.set("startsAt", form.startsAt)
  data.set("endsAt", form.endsAt)
  data.set("sortOrder", form.sortOrder || "0")
  data.set("published", published ? "true" : "false")
  appendImage(data, image)
  return data
}

function dateRange(offer: AdminOffer) {
  if (!offer.startsAt && !offer.endsAt) return "No end date: shown until you unpublish it"
  if (offer.startsAt && offer.endsAt) return `${formatIst(offer.startsAt)} → ${formatIst(offer.endsAt)}`
  return offer.startsAt ? `From ${formatIst(offer.startsAt)}` : `Until ${formatIst(offer.endsAt)}`
}

/** Offers: cards with their schedule status, quick publish/unpublish, preview, edit and delete. */
export function OffersManager({
  offers,
  bundledImages,
  uploads,
  emptyState,
  autoOpen = false,
}: {
  offers: AdminOffer[]
  bundledImages: string[]
  uploads: UploadsStatus
  emptyState: React.ReactNode
  /** Open “Add Offer” straight away (from the dashboard's quick actions). */
  autoOpen?: boolean
}) {
  const save = useSave()
  const quick = useSave()
  const [editor, setEditor] = useState<{ open: boolean; offer: AdminOffer | null; session: number }>({ open: autoOpen, offer: null, session: autoOpen ? 1 : 0 })
  const [deleting, setDeleting] = useState<AdminOffer | null>(null)

  const open = (offer: AdminOffer | null) => {
    save.reset()
    setEditor((state) => ({ open: true, offer, session: state.session + 1 }))
  }

  async function togglePublished(offer: AdminOffer) {
    const data = new FormData()
    data.set("published", offer.published ? "false" : "true")
    await quick.run(() => saveContentItem("offers", offer.id, data), {
      success: offer.published ? "Offer unpublished" : "Offer published",
      description: offer.title,
      failure: "Offer not updated",
    })
  }

  async function confirmDelete() {
    if (!deleting) return
    const offer = deleting
    const done = await quick.run(() => deleteContentItem("offers", offer.id), { success: "Offer deleted", description: offer.title, failure: "Offer not deleted" })
    if (done !== null) setDeleting(null)
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => open(null)}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-bold text-forest-deep hover:bg-coral/90", focusRing)}
        >
          <Plus aria-hidden="true" className="size-4" /> Add Offer
        </button>
      </div>

      {offers.length ? (
        <ul className={cn("grid gap-4 md:grid-cols-2 2xl:grid-cols-3", (quick.refreshing || save.refreshing) && "opacity-70 transition-opacity")}>
          {offers.map((offer) => (
            <li key={offer.id} className="flex flex-col overflow-hidden rounded-card bg-ivory shadow-soft ring-1 ring-line">
              <div className="relative aspect-[16/7] bg-forest">
                {offer.imageUrl ? (
                  <Image src={offer.imageUrl} alt="" fill sizes="(min-width: 1536px) 30vw, (min-width: 768px) 45vw, 100vw" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-white/40">
                    <Tag aria-hidden="true" className="size-10" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                  <StatusPill status={offer.status} />
                  {offer.label ? <span className="rounded-pill bg-coral px-2.5 py-1 text-[0.6875rem] font-bold text-forest-deep">{offer.label}</span> : null}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-bold text-forest">{offer.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{offer.shortDescription}</p>
                <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-muted">
                  <CalendarClock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /> {dateRange(offer)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Button: {offer.ctaText || "Plan Your Trip"} → {describeLink(offer.ctaLink || "page:plan")}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  <SmallButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => open(offer)} />
                  {offer.status !== "EXPIRED" ? (
                    <SmallButton
                      label={offer.published ? "Unpublish" : "Publish"}
                      icon={offer.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      disabled={quick.busy}
                      onClick={() => togglePublished(offer)}
                    />
                  ) : null}
                  {offer.status !== "EXPIRED" ? (
                    <a href={previewHref("/en")} target="_blank" rel="noopener noreferrer" className={smallButtonClass}>
                      <Eye aria-hidden="true" className="size-4" /> Preview <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                  <SmallButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(offer)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        emptyState
      )}

      <OfferEditor key={editor.session} open={editor.open} offer={editor.offer} bundledImages={bundledImages} uploads={uploads} save={save} onClose={() => setEditor((state) => ({ ...state, open: false }))} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this offer?"
        body={
          <>
            <strong className="text-ink">{deleting?.title}</strong> will be removed from the website and the admin panel. To keep it for later, unpublish it instead.
          </>
        }
        confirmLabel="Delete offer"
        busyLabel="Deleting…"
        busy={quick.busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function OfferEditor({
  open,
  offer,
  bundledImages,
  uploads,
  save,
  onClose,
}: {
  open: boolean
  offer: AdminOffer | null
  bundledImages: string[]
  uploads: UploadsStatus
  save: ReturnType<typeof useSave>
  onClose: () => void
}) {
  const [form, setForm] = useState<Form>(offer ? fromOffer(offer) : blank)
  const [image, setImage] = useState<ImageValue>({ kind: "keep" })
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const e = save.errors
  const pair = (field: string) => ({ en: e[field], mr: e[`${field}Mr`] })

  async function submit(event: FormEvent<HTMLFormElement>, published: boolean) {
    event.preventDefault()
    const done = await save.run(() => saveContentItem<{ offer: AdminOffer }>("offers", offer?.id ?? null, toFormData(form, published, image)), {
      success: published ? (form.startsAt && new Date(`${form.startsAt}:00+05:30`) > new Date() ? "Offer scheduled" : "Offer published") : "Draft saved",
      description: form.title.en,
      failure: "Offer not saved",
      inline: true,
    })
    if (done) onClose()
  }

  return (
    <EditorDrawer
      open={open}
      title={offer ? "Edit offer" : "Add an offer"}
      description="Offers show on the homepage between their start and end dates."
      busy={save.busy}
      error={save.formError}
      submitLabel={offer?.published ? "Save and keep live" : "Publish"}
      // The button that was pressed decides: "Save draft" carries data-intent="draft"
      onSubmit={(event) => submit(event, (event.nativeEvent as SubmitEvent).submitter?.dataset.intent !== "draft")}
      onClose={onClose}
      wide
      secondaryAction={
        <button
          type="submit"
          data-intent="draft"
          disabled={save.busy}
          className={cn("inline-flex min-h-11 items-center rounded-pill bg-forest px-5 text-sm font-bold text-white hover:bg-forest-soft disabled:opacity-60", focusRing)}
        >
          {offer?.published ? "Unpublish and save as draft" : "Save draft"}
        </button>
      }
    >
      <BilingualField label="Offer title" value={form.title} onChange={(value) => set("title", value)} errors={pair("title")} max={120} placeholders={{ en: "e.g. Diwali Family Tour Offer" }} />
      <BilingualField label="Offer label" optional value={form.label} onChange={(value) => set("label", value)} errors={pair("label")} max={40} hint="A short badge such as “Festive special”." />
      <BilingualField label="Short description" multiline rows={2} value={form.shortDescription} onChange={(value) => set("shortDescription", value)} errors={pair("shortDescription")} max={240} />
      <BilingualField label="Full description" optional multiline rows={4} value={form.description} onChange={(value) => set("description", value)} errors={pair("description")} max={2000} />

      <ImageInput label="Photo (optional)" currentUrl={offer?.imageUrl ?? null} value={image} onChange={setImage} bundledImages={bundledImages} uploads={uploads} error={e.image} />
      <TextField label="Photo description" optional value={form.imageAlt} onChange={(value) => set("imageAlt", value)} error={e.imageAlt} max={200} hint="Describe the photo for people using screen readers." />

      <div className="grid gap-5 sm:grid-cols-2">
        <BilingualField label="Button text" optional value={form.ctaText} onChange={(value) => set("ctaText", value)} errors={pair("ctaText")} max={40} placeholders={{ en: "Plan Your Trip" }} />
        <LinkField label="Button goes to" value={form.ctaLink} onChange={(value) => set("ctaLink", value)} error={e.ctaLink} noneLabel="Plan Your Trip page (default)" />
      </div>

      <div className="grid gap-5 rounded-card bg-white p-4 ring-1 ring-line sm:grid-cols-2">
        <p className="text-sm font-bold text-forest sm:col-span-2">When should it show? (India time)</p>
        <TextField label="Starts" type="datetime-local" optional value={form.startsAt} onChange={(value) => set("startsAt", value)} error={e.startsAt} hint="Empty: as soon as it is published." />
        <TextField label="Ends" type="datetime-local" optional value={form.endsAt} onChange={(value) => set("endsAt", value)} error={e.endsAt} hint="Empty: until you unpublish it." />
      </div>

      <TextField label="Display order" type="number" value={form.sortOrder} onChange={(value) => set("sortOrder", value)} error={e.sortOrder} hint="Lower numbers show first." className="sm:max-w-48" />
      <p className="rounded-xl bg-teal-soft/60 p-3 text-xs leading-5 text-ink">
        <strong>Save draft</strong> keeps the offer off the website. Use <strong>Preview</strong> on the offer card to see drafts and scheduled offers on the
        homepage; only signed-in admins see them there.
      </p>
    </EditorDrawer>
  )
}

const smallButtonClass = cn(
  "inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-xs font-bold ring-1 transition-colors text-forest ring-line hover:bg-white disabled:cursor-not-allowed disabled:opacity-60",
  focusRing,
)

function SmallButton({ label, icon, onClick, disabled, tone = "default" }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(smallButtonClass, tone === "danger" && "text-danger ring-danger/25 hover:bg-danger-soft")}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}
