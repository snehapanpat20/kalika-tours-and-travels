"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useTransition, type ReactNode } from "react"
import { Eye, EyeOff, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { formatDay, travelTypeLabels } from "@/components/admin/format"
import { GalleryEditor, type EditorUploads } from "@/components/admin/gallery-editor"
import { useAdminErrors } from "@/components/admin/use-admin-action"
import { Spinner } from "@/components/ui/spinner"
import { focusRing } from "@/components/ui/styles"
import { useToast } from "@/components/ui/toast"
import { deleteGalleryItem, updateGalleryItem, type AdminGalleryItem } from "@/lib/api/admin"
import { cn } from "@/lib/utils/cn"

/** The admin gallery: photo cards with quick publish/feature toggles, an editor and delete. */
export function GalleryManager({
  items,
  bundledImages,
  uploads,
  empty,
  autoOpen = false,
}: {
  items: AdminGalleryItem[]
  bundledImages: string[]
  uploads: EditorUploads
  empty: ReactNode
  /** Open “Add photo” straight away (from the dashboard's quick actions). */
  autoOpen?: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const reportError = useAdminErrors()
  const [refreshing, startRefresh] = useTransition()
  const [editor, setEditor] = useState<{ open: boolean; item: AdminGalleryItem | null; session: number }>({ open: autoOpen, item: null, session: autoOpen ? 1 : 0 })
  const openEditor = (item: AdminGalleryItem | null) => setEditor((state) => ({ open: true, item, session: state.session + 1 }))
  const [busy, setBusy] = useState<string | null>(null) // `${id}:${action}`
  const [deleting, setDeleting] = useState<AdminGalleryItem | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const refresh = () => startRefresh(() => router.refresh())


  async function toggle(item: AdminGalleryItem, field: "published" | "featured") {
    if (busy) return
    setBusy(`${item.id}:${field}`)
    const next = !item[field]
    const body = new FormData()
    body.set(field, next ? "true" : "false")
    try {
      await updateGalleryItem(item.id, body)
      const titles = { published: next ? "Published" : "Moved to drafts", featured: next ? "Featured on the homepage" : "No longer featured" }
      toast.push({ tone: "success", title: titles[field], description: item.title })
      refresh()
    } catch (error) {
      reportError(error, "Photo not updated")
    } finally {
      setBusy(null)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteGalleryItem(deleting.id)
      toast.push({ tone: "success", title: "Photo deleted", description: deleting.title })
      setDeleting(null)
      refresh()
    } catch (error) {
      setDeleting(null)
      reportError(error, "Photo not deleted")
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="inline-flex min-h-6 items-center gap-2 text-sm text-muted">
          {refreshing ? (
            <>
              <Spinner /> Refreshing…
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => openEditor(null)}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-bold text-forest-deep hover:bg-coral/90", focusRing)}
        >
          <Plus aria-hidden="true" className="size-4" /> Add photo
        </button>
      </div>

      {items.length ? (
        <ul className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4", refreshing && "opacity-70 transition-opacity")}>
          {items.map((item) => (
            <li key={item.id} className="flex flex-col overflow-hidden rounded-card bg-ivory shadow-soft ring-1 ring-line">
              <div className="relative aspect-[4/3] bg-stone-deep">
                <Image src={item.imageUrl} alt="" fill sizes="(min-width: 1536px) 22vw, (min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded-pill px-2.5 py-1 text-[0.6875rem] font-bold",
                      item.published ? "bg-success-soft text-success" : "bg-white/90 text-muted",
                    )}
                  >
                    {item.published ? "Published" : "Draft"}
                  </span>
                  {item.featured ? <span className="rounded-pill bg-coral px-2.5 py-1 text-[0.6875rem] font-bold text-forest-deep">Featured</span> : null}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-bold text-forest">{item.title}</h3>
                <p className="mt-1 text-xs text-muted">
                  {[item.destination, item.tripType ? travelTypeLabels[item.tripType] : null, item.tripDate ? formatDay(item.tripDate) : null]
                    .filter(Boolean)
                    .join(" · ") || "No details yet"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Order {item.sortOrder} · {item.uploaded ? "Uploaded" : "Website photo"}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  <ActionButton label="Edit" icon={<Pencil className="size-4" />} onClick={() => openEditor(item)} />
                  <ActionButton
                    label={item.published ? "Unpublish" : "Publish"}
                    icon={item.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    busy={busy === `${item.id}:published`}
                    disabled={Boolean(busy)}
                    onClick={() => toggle(item, "published")}
                  />
                  <ActionButton
                    label={item.featured ? "Unfeature" : "Feature"}
                    icon={<Star className={cn("size-4", item.featured && "fill-coral text-coral")} />}
                    busy={busy === `${item.id}:featured`}
                    disabled={Boolean(busy)}
                    pressed={item.featured}
                    onClick={() => toggle(item, "featured")}
                  />
                  <ActionButton label="Delete" icon={<Trash2 className="size-4" />} tone="danger" onClick={() => setDeleting(item)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        empty
      )}

      <GalleryEditor
        key={editor.session}
        open={editor.open}
        item={editor.item}
        bundledImages={bundledImages}
        uploads={uploads}
        onClose={() => setEditor((state) => ({ ...state, open: false }))}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this photo?"
        body={
          <>
            <strong className="text-ink">{deleting?.title}</strong> will be removed from the gallery
            {deleting?.uploaded ? " and the uploaded file deleted" : ""}. This cannot be undone.
          </>
        }
        confirmLabel="Delete photo"
        busyLabel="Deleting…"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}

function ActionButton({
  label,
  icon,
  onClick,
  busy = false,
  disabled = false,
  pressed,
  tone = "default",
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  busy?: boolean
  disabled?: boolean
  pressed?: boolean
  tone?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-xs font-bold ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        tone === "danger" ? "text-danger ring-danger/25 hover:bg-danger-soft" : "text-forest ring-line hover:bg-white",
        focusRing,
      )}
    >
      <span aria-hidden="true">{busy ? <Spinner /> : icon}</span>
      {label}
    </button>
  )
}
