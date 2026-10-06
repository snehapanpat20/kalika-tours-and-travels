"use client"

import Image from "next/image"
import { useMemo, useRef, useState, type FormEvent } from "react"
import { ArrowDown, ArrowUp, Eye, ImagePlus, Plus, RotateCcw, Trash2, Upload } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { BilingualField, FormField, IconField, LinkField, inputClass } from "@/components/admin/kit/form-controls"
import { ImageInput, type ImageValue, type UploadsStatus } from "@/components/admin/kit/image-input"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { useSave } from "@/components/admin/kit/use-save"
import { Spinner } from "@/components/ui/spinner"
import { controlClass, focusRing } from "@/components/ui/styles"
import { discardSection, previewHref, publishSection, saveSectionDraft } from "@/lib/api/admin"
import type { ContentImage, LocalizedText, SectionState, TravellerFeature } from "@/lib/cms/content-types"
import type { CmsIconName } from "@/lib/cms/icons"
import { describeLink } from "@/lib/cms/links"
import { formatIst } from "@/lib/cms/schedule"
import { pagePath } from "@/lib/routes"
import type { ContentSection } from "@/lib/cms/sections"
import { cn } from "@/lib/utils/cn"
import type { BuiltInFeature, BuiltInPhoto } from "@/server/cms/section-admin"

type Language = "en" | "mr"

type PhotoItem = {
  id: string
  source: { kind: "existing"; image: ContentImage } | { kind: "upload"; file: File; preview: string } | { kind: "website"; path: string }
  alt: LocalizedText
  caption: LocalizedText
}

type FeatureItem = TravellerFeature & { id: string }

const accepted = ["image/jpeg", "image/png", "image/webp", "image/avif"]
let counter = 0
const nextId = () => `item-${++counter}`

/**
 * Edits one website section. Each field shows the website's current text
 * as a starting point; anything left empty keeps that text. Saving creates a
 * draft that only admins can preview; Publish makes it live.
 */
export function SectionEditor({
  section,
  state,
  defaults,
  builtIn,
  bundledImages,
  uploads,
  canEdit,
}: {
  section: ContentSection
  state: SectionState
  defaults: { en: Record<string, string>; mr: Record<string, string> }
  builtIn: { features: BuiltInFeature[]; photos: BuiltInPhoto[] }
  bundledImages: string[]
  uploads: UploadsStatus
  canEdit: boolean
}) {
  const save = useSave()
  const draft = state.draft
  const [language, setLanguage] = useState<Language>("en")
  const [text, setText] = useState(draft.text)
  const [links, setLinks] = useState(draft.links)
  const [image, setImage] = useState<ImageValue>({ kind: "keep" })
  const [features, setFeatures] = useState<FeatureItem[]>(() => draft.features.map((feature) => ({ ...feature, id: nextId() })))
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    draft.photos.map((photo) => ({ id: nextId(), source: { kind: "existing", image: photo }, alt: photo.alt, caption: photo.caption })),
  )
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Changes since the last save, so Preview and Publish use what was saved
  const snapshot = useMemo(
    () => JSON.stringify({ text, links, image: image.kind, features: features.map(({ icon, text: t }) => ({ icon, t })), photos: photos.map((p) => [p.source.kind, p.alt, p.caption, p.source.kind === "existing" ? p.source.image.url : p.id]) }),
    [text, links, image, features, photos],
  )
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot)
  const dirty = snapshot !== savedSnapshot

  const status = !state.published && !state.hasUnpublishedChanges ? "BUILT_IN" : state.hasUnpublishedChanges ? "CHANGES" : "PUBLISHED"
  const previewPath = `${pagePath("en", section.previewPage)}${section.previewAnchor ? `#${section.previewAnchor}` : ""}`

  const setField = (name: string, value: string) => setText((current) => ({ ...current, [language]: { ...current[language], [name]: value } }))

  function buildForm(): FormData {
    const form = new FormData()
    const imageChoice =
      image.kind === "upload" ? { kind: "upload", file: "image" } : image.kind === "website" ? { kind: "website", path: image.path } : image.kind === "remove" ? { kind: "remove" } : { kind: "keep" }
    if (image.kind === "upload") form.set("image", image.file)
    const photoInputs = photos.map((photo, index) => {
      const meta = { alt: photo.alt, caption: photo.caption }
      if (photo.source.kind === "existing") return { kind: "existing", url: photo.source.image.url, ...meta }
      if (photo.source.kind === "website") return { kind: "website", path: photo.source.path, ...meta }
      form.set(`photo${index}`, photo.source.file)
      return { kind: "upload", file: `photo${index}`, ...meta }
    })
    form.set(
      "data",
      JSON.stringify({
        text,
        links: Object.fromEntries(Object.entries(links).filter(([, value]) => value)),
        image: imageChoice,
        features: features.map(({ icon, text: t }) => ({ icon, text: t })),
        photos: photoInputs,
      }),
    )
    return form
  }

  /** After the server answers, the editor shows what is now stored (uploads become saved photos). */
  function adopt(result: { section: unknown } | null) {
    if (!result) return false
    const next = (result.section as SectionState).draft
    setImage({ kind: "keep" })
    setPhotos(next.photos.map((photo) => ({ id: nextId(), source: { kind: "existing", image: photo }, alt: photo.alt, caption: photo.caption })))
    setSavedSnapshot(
      JSON.stringify({
        text,
        links,
        image: "keep",
        features: features.map(({ icon, text: t }) => ({ icon, t })),
        photos: next.photos.map((photo) => ["existing", photo.alt, photo.caption, photo.url]),
      }),
    )
    return true
  }

  async function saveDraft(event?: FormEvent) {
    event?.preventDefault()
    return adopt(await save.run(() => saveSectionDraft(section.key, buildForm()), { success: "Draft saved", description: "Use Preview to check it, then Publish.", failure: "Draft not saved", inline: true }))
  }

  async function publish() {
    if (dirty && !(await saveDraft())) return
    await save.run(() => publishSection(section.key), { success: "Published", description: `${section.title} is now live on the website.`, failure: "Not published" })
  }

  function addPhotoFiles(files: FileList | null) {
    setPhotoError(null)
    for (const file of Array.from(files ?? [])) {
      if (!accepted.includes(file.type)) return setPhotoError("Choose JPG, PNG, WebP or AVIF photos.")
      if (file.size > 12 * 1024 * 1024) return setPhotoError(`“${file.name}” is larger than 12 MB.`)
      setPhotos((current) => [...current, { id: nextId(), source: { kind: "upload", file, preview: URL.createObjectURL(file) }, alt: { en: "", mr: "" }, caption: { en: "", mr: "" } }])
    }
  }

  const move = <T,>(list: T[], index: number, by: number) => {
    const next = [...list]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item)
    return next
  }

  return (
    <form onSubmit={saveDraft} noValidate className="grid gap-6">
      {/* Status and actions */}
      <div className="sticky top-16 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-stone/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <StatusPill status={status} label={status === "PUBLISHED" ? "Live" : undefined} />
          {state.publishedAt ? <span>Last published {formatIst(state.publishedAt)}</span> : <span>Not published yet: the website shows its built-in text.</span>}
          {dirty ? <span className="font-semibold text-coral">You have unsaved edits</span> : null}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {state.hasUnpublishedChanges && state.published ? (
              <button type="button" onClick={() => setConfirmDiscard(true)} disabled={save.busy} className={secondaryButton}>
                <RotateCcw aria-hidden="true" className="size-4" /> Discard changes
              </button>
            ) : null}
            <button type="submit" disabled={save.busy || !dirty} className={secondaryButton}>
              {save.busy ? <Spinner /> : null} Save draft
            </button>
            {dirty ? (
              <span className={cn(secondaryButton, "cursor-not-allowed opacity-50")} title="Save your draft first to preview it">
                <Eye aria-hidden="true" className="size-4" /> Preview
              </span>
            ) : (
              <a href={previewHref(previewPath)} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
                <Eye aria-hidden="true" className="size-4" /> Preview <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            <button
              type="button"
              onClick={publish}
              disabled={save.busy || (!dirty && !state.hasUnpublishedChanges)}
              className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-bold text-forest-deep hover:bg-coral/90 disabled:opacity-50", focusRing)}
            >
              Publish
            </button>
          </div>
        ) : null}
      </div>

      {save.formError ? (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {save.formError}
        </p>
      ) : null}

      <fieldset disabled={!canEdit} className="grid gap-6">
        {/* Text, per language */}
        <section aria-labelledby="text-title" className="rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="text-title" className="text-lg font-extrabold tracking-tight text-forest">
              Text
            </h2>
            <div role="tablist" aria-label="Language" className="inline-flex rounded-pill bg-stone p-1">
              {(["en", "mr"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={language === code}
                  onClick={() => setLanguage(code)}
                  className={cn("min-h-9 rounded-pill px-4 text-sm font-bold", language === code ? "bg-forest text-white" : "text-forest", focusRing)}
                >
                  {code === "en" ? "English" : "मराठी"}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">
            Grey text shows what the website says now. Leave a box empty to keep it. {language === "mr" ? "Empty Marathi boxes keep the built-in Marathi text." : null}
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {section.fields.map((field) => {
              const value = text[language][field.name] ?? ""
              const fallback = defaults[language][field.name] ?? ""
              return (
                <FormField
                  key={`${language}-${field.name}`}
                  label={field.label}
                  hint={field.help}
                  error={save.errors[`text.${language}.${field.name}`]}
                  className={field.multiline ? "md:col-span-2" : undefined}
                >
                  {({ id, describedBy, invalid }) => (
                    <div className="grid gap-1.5">
                      {field.multiline ? (
                        <textarea
                          id={id}
                          lang={language}
                          value={value}
                          placeholder={fallback}
                          maxLength={field.max}
                          rows={3}
                          onChange={(event) => setField(field.name, event.target.value)}
                          aria-describedby={describedBy}
                          aria-invalid={invalid || undefined}
                          className={cn(controlClass, "py-2.5 text-sm")}
                        />
                      ) : (
                        <input
                          id={id}
                          lang={language}
                          value={value}
                          placeholder={fallback}
                          maxLength={field.max}
                          onChange={(event) => setField(field.name, event.target.value)}
                          aria-describedby={describedBy}
                          aria-invalid={invalid || undefined}
                          className={inputClass}
                        />
                      )}
                      <div className="flex justify-between gap-2 text-[0.6875rem] text-muted">
                        {value ? (
                          <button type="button" onClick={() => setField(field.name, "")} className={cn("font-semibold text-teal-deep hover:underline", focusRing)}>
                            Use the website&apos;s text again
                          </button>
                        ) : fallback ? (
                          <button type="button" onClick={() => setField(field.name, fallback)} className={cn("font-semibold text-teal-deep hover:underline", focusRing)}>
                            Edit the current text
                          </button>
                        ) : (
                          <span />
                        )}
                        <span>
                          {value.length}/{field.max}
                        </span>
                      </div>
                    </div>
                  )}
                </FormField>
              )
            })}
          </div>
        </section>

        {section.image ? (
          <section aria-labelledby="image-title" className="rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line sm:p-6">
            <h2 id="image-title" className="sr-only">
              {section.image.label}
            </h2>
            <ImageInput
              label={section.image.label}
              currentUrl={draft.image?.url ?? null}
              value={image}
              onChange={setImage}
              bundledImages={bundledImages}
              uploads={uploads}
              hint={`${section.image.help} With no photo chosen, the website keeps its designed photo.`}
              removeLabel="Use the designed photo again"
              error={save.errors.image}
            />
          </section>
        ) : null}

        {section.links?.length ? (
          <section aria-labelledby="links-title" className="rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line sm:p-6">
            <h2 id="links-title" className="text-lg font-extrabold tracking-tight text-forest">
              Buttons
            </h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {section.links.map((link) => (
                <LinkField
                  key={link.name}
                  label={link.label}
                  value={links[link.name] ?? ""}
                  onChange={(value) => setLinks((current) => ({ ...current, [link.name]: value }))}
                  noneLabel={`${describeLink(link.defaultLink)} (default)`}
                  error={save.errors.links}
                />
              ))}
            </div>
          </section>
        ) : null}

        {section.features ? (
          <section aria-labelledby="features-title" className="rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="features-title" className="text-lg font-extrabold tracking-tight text-forest">
                Features
              </h2>
              <div className="flex flex-wrap gap-2">
                {!features.length ? (
                  <button type="button" onClick={() => setFeatures(builtIn.features.map((feature) => ({ ...feature, id: nextId() })))} className={secondaryButton}>
                    Start from the current features
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFeatures((current) => [...current, { id: nextId(), icon: "check", text: { en: "", mr: "" } }])}
                  className={secondaryButton}
                >
                  <Plus aria-hidden="true" className="size-4" /> Add feature
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">
              {features.length ? "These replace the built-in feature list." : "No custom list: the website shows its built-in features. Only list what is true of the vehicle."}
            </p>
            {save.errors.features ? <p className="mt-2 text-xs font-semibold text-danger">{save.errors.features}</p> : null}
            <ol className="mt-4 grid gap-3">
              {features.map((feature, index) => (
                <li key={feature.id} className="grid gap-3 rounded-xl bg-white p-3 ring-1 ring-line">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-muted">Feature {index + 1}</span>
                    <ReorderButtons
                      index={index}
                      count={features.length}
                      label={feature.text.en || `Feature ${index + 1}`}
                      onMove={(by) => setFeatures((current) => move(current, index, by))}
                      onRemove={() => setFeatures((current) => current.filter((item) => item.id !== feature.id))}
                    />
                  </div>
                  <BilingualField
                    label="Feature"
                    value={feature.text}
                    max={60}
                    onChange={(value) => setFeatures((current) => current.map((item) => (item.id === feature.id ? { ...item, text: value } : item)))}
                  />
                  <IconField
                    label="Icon"
                    value={feature.icon}
                    onChange={(icon: CmsIconName) => setFeatures((current) => current.map((item) => (item.id === feature.id ? { ...item, icon } : item)))}
                    names={["seats", "ac", "legroom", "luggage", "audio", "clean", "windows", "driver", "bus", "shield", "check"]}
                  />
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {section.photos ? (
          <section aria-labelledby="photos-title" className="rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="photos-title" className="text-lg font-extrabold tracking-tight text-forest">
                Photos
              </h2>
              <div className="flex flex-wrap gap-2">
                {!photos.length ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPhotos(builtIn.photos.map((photo) => ({ id: nextId(), source: { kind: "website", path: photo.path }, alt: photo.alt, caption: photo.caption })))
                    }
                    className={secondaryButton}
                  >
                    Start from the current photos
                  </button>
                ) : null}
                {uploads.enabled ? (
                  <>
                    <input ref={photoInput} type="file" multiple accept={accepted.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => {
                      addPhotoFiles(event.target.files)
                      event.target.value = ""
                    }} />
                    <button type="button" onClick={() => photoInput.current?.click()} className={secondaryButton}>
                      <Upload aria-hidden="true" className="size-4" /> Upload photos
                    </button>
                  </>
                ) : null}
                {bundledImages.length ? (
                  <select
                    aria-label="Add a photo already on the website"
                    value=""
                    onChange={(event) => {
                      const path = event.target.value
                      if (path) setPhotos((current) => [...current, { id: nextId(), source: { kind: "website", path }, alt: { en: "", mr: "" }, caption: { en: "", mr: "" } }])
                    }}
                    className={cn(inputClass, "w-auto")}
                  >
                    <option value="">Add a website photo…</option>
                    {bundledImages.map((path) => (
                      <option key={path} value={path}>
                        {path.replace(/^\/images\//, "")}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">
              {photos.length
                ? "The first photo is the main one on the homepage and the Traveller page."
                : "No custom photos: the website shows its built-in photos of the Traveller."}
            </p>
            {photoError ? (
              <p role="alert" className="mt-2 text-xs font-semibold text-danger">
                {photoError}
              </p>
            ) : null}
            <ol className="mt-4 grid gap-3">
              {photos.map((photo, index) => {
                const src = photo.source.kind === "existing" ? photo.source.image.url : photo.source.kind === "website" ? photo.source.path : photo.source.preview
                return (
                  <li key={photo.id} className="grid gap-3 rounded-xl bg-white p-3 ring-1 ring-line sm:grid-cols-[10rem_1fr]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-deep">
                      {photo.source.kind === "upload" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
                      ) : (
                        <Image src={src} alt="" fill sizes="10rem" className="object-cover" />
                      )}
                      {index === 0 ? <span className="absolute top-1.5 left-1.5 rounded-pill bg-coral px-2 py-0.5 text-[0.625rem] font-bold text-forest-deep">Main photo</span> : null}
                    </div>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-muted">
                          {photo.source.kind === "upload" ? `New: ${photo.source.file.name}` : `Photo ${index + 1}`}
                        </span>
                        <ReorderButtons
                          index={index}
                          count={photos.length}
                          label={`Photo ${index + 1}`}
                          onMove={(by) => setPhotos((current) => move(current, index, by))}
                          onRemove={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}
                        />
                      </div>
                      <BilingualField
                        label="Caption"
                        value={photo.caption}
                        max={200}
                        onChange={(caption) => setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, caption } : item)))}
                      />
                      <BilingualField
                        label="Photo description"
                        hint="What the photo shows, for screen readers."
                        value={photo.alt}
                        max={200}
                        onChange={(alt) => setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, alt } : item)))}
                      />
                    </div>
                  </li>
                )
              })}
            </ol>
            {!photos.length ? (
              <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-line py-8 text-muted">
                <ImagePlus aria-hidden="true" className="size-8" />
              </div>
            ) : null}
          </section>
        ) : null}
      </fieldset>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unpublished changes?"
        body="The saved draft goes back to what is live on the website now. This cannot be undone."
        confirmLabel="Discard changes"
        busyLabel="Discarding…"
        busy={save.busy}
        onConfirm={async () => {
          const result = await save.run(() => discardSection(section.key), { success: "Changes discarded", failure: "Changes not discarded" })
          setConfirmDiscard(false)
          if (result) window.location.reload()
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </form>
  )
}

const secondaryButton = cn(
  "inline-flex min-h-11 items-center gap-2 rounded-pill bg-white px-4 text-sm font-bold text-forest ring-1 ring-line hover:ring-forest/30 disabled:cursor-not-allowed disabled:opacity-50",
  focusRing,
)

function ReorderButtons({ index, count, label, onMove, onRemove }: { index: number; count: number; label: string; onMove: (by: number) => void; onRemove: () => void }) {
  const small = cn("inline-flex size-9 items-center justify-center rounded-full ring-1 ring-line hover:bg-stone disabled:opacity-40", focusRing)
  return (
    <div className="flex gap-1">
      <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`} className={small}>
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`} className={small}>
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className={cn(small, "text-danger ring-danger/25 hover:bg-danger-soft")}>
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
