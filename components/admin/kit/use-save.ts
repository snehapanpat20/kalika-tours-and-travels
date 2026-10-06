"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"
import { useAdminErrors } from "@/components/admin/use-admin-action"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api/client"

/**
 * Runs one admin save/delete/publish: tracks "busy", turns server field errors
 * into per-field messages, sends an expired session back to sign-in, shows a
 * success message and refreshes the page data.
 */
export function useSave() {
  const router = useRouter()
  const toast = useToast()
  const reportError = useAdminErrors()
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [refreshing, startRefresh] = useTransition()

  const run = useCallback(
    async <T,>(action: () => Promise<T>, options: { success: string; description?: string; failure: string; inline?: boolean }): Promise<T | null> => {
      setBusy(true)
      setErrors({})
      setFormError(null)
      try {
        const result = await action()
        toast.push({ tone: "success", title: options.success, description: options.description })
        startRefresh(() => router.refresh())
        return result
      } catch (error) {
        if (options.inline && error instanceof ApiError && error.status !== 401) {
          // Show problems inside the form, next to the fields
          setErrors(Object.fromEntries(error.errors.map((issue) => [issue.field, issue.message])))
          setFormError(
            error.code === "NETWORK" || error.code === "TIMEOUT"
              ? "Couldn't reach the server. Please check your connection and try again."
              : error.status === 403
                ? "You don't have permission to do this."
                : error.message,
          )
        } else {
          reportError(error, options.failure)
        }
        return null
      } finally {
        setBusy(false)
      }
    },
    [reportError, router, toast],
  )

  const reset = useCallback(() => {
    setErrors({})
    setFormError(null)
  }, [])

  return { run, busy, errors, formError, refreshing, reset }
}
