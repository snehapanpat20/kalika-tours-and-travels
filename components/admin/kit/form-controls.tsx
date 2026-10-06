"use client"

import { useId, useState, type ReactNode } from "react"
import { ChevronDown, Languages } from "lucide-react"
import { cmsIcon } from "@/components/cms/cms-icon"
import { cmsIconNames, cmsIcons, type CmsIconName } from "@/lib/cms/icons"
import { linkablePages } from "@/lib/cms/links"
import { controlClass, focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

export const inputClass = cn(controlClass, "min-h-11 py-2 text-sm")

/** Label, optional hint, the control, and its error, wired together for screen readers. */
export function FormField({
  label,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  error?: string
  optional?: boolean
  /** Receives the ids to put on the control. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
  className?: string
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-bold text-forest">
        {label} {optional ? <span className="font-medium text-muted">(optional)</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="text-xs leading-5 text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  optional,
  max,
  multiline,
  rows = 3,
  placeholder,
  type = "text",
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: ReactNode
  optional?: boolean
  max?: number
  multiline?: boolean
  rows?: number
  placeholder?: string
  type?: "text" | "email" | "password" | "number" | "datetime-local" | "date"
  className?: string
}) {
  return (
    <FormField label={label} hint={hint} error={error} optional={optional} className={className}>
      {({ id, describedBy, invalid }) =>
        multiline ? (
          <textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={max}
            rows={rows}
            placeholder={placeholder}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, "py-2.5 text-sm")}
          />
        ) : (
          <input
            id={id}
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={max}
            placeholder={placeholder}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            autoComplete={type === "password" ? "new-password" : undefined}
            className={inputClass}
          />
        )
      }
    </FormField>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
  hint?: ReactNode
  className?: string
}) {
  return (
    <FormField label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={inputClass}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  )
}

/** A yes/no setting with a short explanation, e.g. "Published". */
export function CheckField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-line has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-teal" />
      <span>
        <span className="block text-sm font-bold text-forest">{label}</span>
        {description ? <span className="block text-xs leading-5 text-muted">{description}</span> : null}
      </span>
    </label>
  )
}

/**
 * English text with an optional Marathi version. The Marathi box stays folded
 * away until wanted; when empty, the Marathi website shows the English text
 * (or, for website sections, its own built-in Marathi text).
 */
export function BilingualField({
  label,
  value,
  onChange,
  errors,
  hint,
  optional,
  max,
  multiline,
  rows,
  placeholders,
  marathiNote = "Leave empty to show the English text on the Marathi site.",
}: {
  label: string
  value: { en: string; mr: string }
  onChange: (value: { en: string; mr: string }) => void
  errors?: { en?: string; mr?: string }
  hint?: ReactNode
  optional?: boolean
  max?: number
  multiline?: boolean
  rows?: number
  placeholders?: { en?: string; mr?: string }
  marathiNote?: string
}) {
  const [showMarathi, setShowMarathi] = useState(Boolean(value.mr) || Boolean(errors?.mr))
  return (
    <div className="grid gap-2">
      <TextField
        label={label}
        value={value.en}
        onChange={(en) => onChange({ ...value, en })}
        error={errors?.en}
        hint={hint}
        optional={optional}
        max={max}
        multiline={multiline}
        rows={rows}
        placeholder={placeholders?.en}
      />
      {showMarathi ? (
        <div className="rounded-xl border-l-4 border-teal/40 bg-teal-soft/40 py-2 pr-2 pl-3">
          <TextField
            label={`${label} — मराठी`}
            value={value.mr}
            onChange={(mr) => onChange({ ...value, mr })}
            error={errors?.mr}
            hint={marathiNote}
            optional
            max={max}
            multiline={multiline}
            rows={rows}
            placeholder={placeholders?.mr}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowMarathi(true)}
          className={cn("inline-flex w-fit items-center gap-1.5 rounded-pill px-2 py-1 text-xs font-bold text-teal-deep hover:bg-teal-soft", focusRing)}
        >
          <Languages aria-hidden="true" className="size-3.5" /> Add Marathi text
          <ChevronDown aria-hidden="true" className="size-3" />
        </button>
      )}
    </div>
  )
}

/** "Button goes to": a page of this website, or a web address. */
export function LinkField({
  label,
  value,
  onChange,
  error,
  allowNone = true,
  noneLabel = "No button",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  allowNone?: boolean
  noneLabel?: string
}) {
  const isPage = value.startsWith("page:")
  const [custom, setCustom] = useState(Boolean(value) && !isPage)
  const selectValue = custom ? "custom" : value
  return (
    <FormField
      label={label}
      error={error}
      hint={custom ? "A full address starting with https://, or tel: / mailto:." : undefined}
    >
      {({ id, describedBy, invalid }) => (
        <div className="grid gap-2">
          <select
            id={id}
            value={selectValue}
            onChange={(event) => {
              const next = event.target.value
              if (next === "custom") {
                setCustom(true)
                onChange(isPage ? "" : value)
              } else {
                setCustom(false)
                onChange(next)
              }
            }}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={inputClass}
          >
            {allowNone ? <option value="">{noneLabel}</option> : null}
            {linkablePages.map((page) => (
              <option key={page.key} value={`page:${page.key}`}>
                {page.label}
              </option>
            ))}
            <option value="custom">Another web address…</option>
          </select>
          {custom ? (
            <input
              type="url"
              value={value}
              onChange={(event) => onChange(event.target.value.trim())}
              placeholder="https://"
              aria-label={`${label}: web address`}
              aria-invalid={invalid || undefined}
              className={inputClass}
            />
          ) : null}
        </div>
      )}
    </FormField>
  )
}

/** Choose one of the fixed icons, shown as buttons with the drawing. */
export function IconField({ label, value, onChange, names = cmsIconNames }: { label: string; value: string; onChange: (value: CmsIconName) => void; names?: CmsIconName[] }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-bold text-forest">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => {
          const Icon = cmsIcon(name)
          const selected = value === name
          return (
            <label
              key={name}
              title={cmsIcons[name]}
              className={cn(
                "inline-flex size-10 cursor-pointer items-center justify-center rounded-xl ring-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal",
                selected ? "bg-forest text-white ring-forest" : "bg-white text-forest ring-line hover:ring-forest/30",
              )}
            >
              <input type="radio" name={`icon-${label}`} value={name} checked={selected} onChange={() => onChange(name)} className="sr-only" />
              <Icon aria-hidden="true" className="size-[1.125rem]" />
              <span className="sr-only">{cmsIcons[name]}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
