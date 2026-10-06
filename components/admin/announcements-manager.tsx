"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { CalendarClock, Eye, EyeOff, Info, Megaphone, Pencil, Plus, Sparkles, Tag, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { EditorDrawer } from "@/components/admin/kit/editor-drawer"
import { BilingualField, LinkField, TextField } from "@/components/admin/kit/form-controls"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { useSave } from "@/components/admin/kit/use-save"
import { focusRing } from "@/components/ui/styles"
import { deleteContentItem, previewHref, saveContentItem } from "@/lib/api/admin"
import { describeLink } from "@/lib/cms/links"
import { formatIst, toIstInput } from "@/lib/cms/schedule"
import { cn } from "@/lib/utils/cn"
import type { AdminAnnouncement } from "@/server/cms/announcements"

const types = {
  INFO: { label: "Information", icon: Info, swatch: "bg-forest-deep text-white" },
  OFFER: { label: "Offer", icon: Tag, swatch: "bg-coral text-forest-deep" },
  IMPORTANT: { label: "Important", icon: Megaphone, swatch: "bg-ink text-white" },
  FESTIVE: { label: "Festive", icon: Sparkles, swatch: "bg-teal-deep text-white" },
} as const

type TypeKey = keyof typeof types

type Form = { message: { en: string; mr: string }; ctaText: { en: string; mr: string }; ctaLink: string; type: TypeKey; startsAt: string; endsAt: string }

const blank: Form = { message: { en: "", mr: "" }, ctaText: { en: "", mr: "" }, ctaLink: "", type: "INFO", startsAt: "", endsAt: "" }

const fromItem = (item: AdminAnnouncement): Form => ({
  message: { en: item.message, mr: item.messageMr ?? "" },
  ctaText: { en: item.ctaText ?? "", mr: item.ctaTextMr ?? "" },
  ctaLink: item.ctaLink ?? "",
  type: item.type,
  startsAt: toIstInput(item.startsAt),
  endsAt: toIstInput(item.endsAt),
})

const body = (form: Form, published: boolean) => ({
  message: form.message.en,
  messageMr: form.message.mr,
  ctaText: form.ctaText.en,
  ctaTextMr: form.ctaText.mr,
  ctaLink: form.ctaLink,
  type: form.type,
  startsAt: form.startsAt,
  endsAt: form.endsAt,
  published,
})

/** Notice-bar messages. Only one shows at a time: the most recently started active one. */
export function AnnouncementsManager({ items, emptyState, autoOpen = false }: { items: AdminAnnouncement[]; emptyState: ReactNode; autoOpen?: boolean }) {
  const save = useSave()
  const quick = useSave()
  const [editor, setEditor] = useState<{ open: boolean; item: AdminAnnouncement | null; session: number }>({ open: autoOpen, item: null, session: autoOpen ? 1 : 0 })
  const [deleting, setDeleting] = useState<AdminAnnouncement | null>(null)

  const open = (item: AdminAnnouncement | null) => {
    save.reset()
    setEditor((state) => ({ open: true, item, session: state.session + 1 }))
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => open(null)}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-bold text-forest-deep hover:bg-coral/90", focusRing)}
        >
          <Plus aria-hidden="true" className="size-4" /> Add Announcement
        </button>
      </div>

      {items.length ? (
        <ul className={cn("grid gap-3", (quick.refreshing || save.refreshing) && "opacity-70 transition-opacity")}>
          {items.map((item) => {
            const type = types[item.type]
            const Icon = type.icon
            return (
              <li key={item.id} className="rounded-card bg-ivory p-4 shadow-soft ring-1 ring-line sm:p-5">
                <div className={cn("flex items-start gap-3 rounded-xl px-4 py-3 text-sm", type.swatch)}>
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <p className="font-semibold">
                    {item.message}
                    {item.ctaLink ? <span className="ml-2 underline">{item.ctaText || "Learn more"}</span> : null}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                  <StatusPill status={item.status} />
                  <span>{type.label}</span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock aria-hidden="true" className="size-3.5" />
                    {item.startsAt || item.endsAt
                      ? `${item.startsAt ? formatIst(item.startsAt) : "Now"} → ${item.endsAt ? formatIst(item.endsAt) : "until unpublished"}`
                      : "No dates: shows while published"}
                  </span>
                  {item.ctaLink ? <span>Link: {describeLink(item.ctaLink)}</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <ActionButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => open(item)} />
                  {item.status !== "EXPIRED" ? (
                    <ActionButton
                      label={item.published ? "Unpublish" : "Publish"}
                      icon={item.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      disabled={quick.busy}
                      onClick={() =>
                        quick.run(() => saveContentItem("announcements", item.id, { published: !item.published }), {
                          success: item.published ? "Announcement unpublished" : "Announcement published",
                          description: item.message,
                          failure: "Announcement not updated",
                        })
                      }
                    />
                  ) : null}
                  {item.status !== "EXPIRED" ? (
                    <a href={previewHref("/en")} target="_blank" rel="noopener noreferrer" className={actionClass}>
                      <Eye aria-hidden="true" className="size-4" /> Preview <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                  <ActionButton label="Delete" tone="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(item)} />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        emptyState
      )}

      <AnnouncementEditor key={editor.session} open={editor.open} item={editor.item} save={save} onClose={() => setEditor((state) => ({ ...state, open: false }))} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this announcement?"
        body={<>“{deleting?.message}” will be removed. To keep it for later, unpublish it instead.</>}
        confirmLabel="Delete announcement"
        busyLabel="Deleting…"
        busy={quick.busy}
        onConfirm={async () => {
          if (!deleting) return
          const done = await quick.run(() => deleteContentItem("announcements", deleting.id), { success: "Announcement deleted", failure: "Announcement not deleted" })
          if (done !== null) setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function AnnouncementEditor({ open, item, save, onClose }: { open: boolean; item: AdminAnnouncement | null; save: ReturnType<typeof useSave>; onClose: () => void }) {
  const [form, setForm] = useState<Form>(item ? fromItem(item) : blank)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))
  const e = save.errors

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const published = (event.nativeEvent as SubmitEvent).submitter?.dataset.intent !== "draft"
    const done = await save.run(() => saveContentItem("announcements", item?.id ?? null, body(form, published)), {
      success: published ? "Announcement published" : "Draft saved",
      description: form.message.en,
      failure: "Announcement not saved",
      inline: true,
    })
    if (done) onClose()
  }

  const Preview = types[form.type]
  return (
    <EditorDrawer
      open={open}
      title={item ? "Edit announcement" : "Add an announcement"}
      description="A short message in the bar at the top of every page."
      busy={save.busy}
      error={save.formError}
      submitLabel={item?.published ? "Save and keep live" : "Publish"}
      onSubmit={submit}
      onClose={onClose}
      secondaryAction={
        <button
          type="submit"
          data-intent="draft"
          disabled={save.busy}
          className={cn("inline-flex min-h-11 items-center rounded-pill bg-forest px-5 text-sm font-bold text-white hover:bg-forest-soft disabled:opacity-60", focusRing)}
        >
          {item?.published ? "Unpublish and save as draft" : "Save draft"}
        </button>
      }
    >
      <BilingualField label="Message" multiline rows={2} value={form.message} onChange={(value) => set("message", value)} errors={{ en: e.message, mr: e.messageMr }} max={200} placeholders={{ en: "e.g. Diwali group tour bookings are now open." }} />

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-bold text-forest">Type</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(types) as TypeKey[]).map((key) => {
            const Icon = types[key].icon
            return (
              <label
                key={key}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold ring-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal",
                  form.type === key ? "bg-forest text-white ring-forest" : "bg-white text-forest ring-line",
                )}
              >
                <input type="radio" name="type" value={key} checked={form.type === key} onChange={() => set("type", key)} className="sr-only" />
                <Icon aria-hidden="true" className="size-4" /> {types[key].label}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">How it will look</p>
        <div className={cn("flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm", Preview.swatch)}>
          <Preview.icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="font-semibold">{form.message.en || "Your message"}</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <BilingualField label="Link text" optional value={form.ctaText} onChange={(value) => set("ctaText", value)} errors={{ en: e.ctaText, mr: e.ctaTextMr }} max={40} placeholders={{ en: "Learn more" }} />
        <LinkField label="Link goes to" value={form.ctaLink} onChange={(value) => set("ctaLink", value)} error={e.ctaLink} noneLabel="No link" />
      </div>

      <div className="grid gap-5 rounded-card bg-white p-4 ring-1 ring-line sm:grid-cols-2">
        <p className="text-sm font-bold text-forest sm:col-span-2">When should it show? (India time)</p>
        <TextField label="Starts" type="datetime-local" optional value={form.startsAt} onChange={(value) => set("startsAt", value)} error={e.startsAt} hint="Empty: as soon as it is published." />
        <TextField label="Ends" type="datetime-local" optional value={form.endsAt} onChange={(value) => set("endsAt", value)} error={e.endsAt} hint="Empty: until you unpublish it." />
      </div>
      <p className="text-xs leading-5 text-muted">If more than one announcement is active, the website shows the one that started most recently.</p>
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
