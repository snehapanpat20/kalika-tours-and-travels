"use client"

import { useId, type ReactNode } from "react"

export function Field({
  label,
  hint,
  error,
  success,
  children,
}: {
  label: string
  hint?: string
  error?: string
  success?: string
  children: (props: { id: string; invalid: boolean; describedBy: string | undefined }) => ReactNode
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const successId = !error && success ? `${id}-success` : undefined
  const describedBy = [hintId, errorId, successId].filter(Boolean).join(" ") || undefined

  return (
    <div className="grid content-start gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-forest">
        {label}
      </label>
      {children({ id, invalid: Boolean(error), describedBy })}
      {hint ? (
        <p id={hintId} className="text-[0.8125rem] leading-5 text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {!error && success ? (
        <p id={successId} className="text-sm font-medium text-success">
          {success}
        </p>
      ) : null}
    </div>
  )
}
