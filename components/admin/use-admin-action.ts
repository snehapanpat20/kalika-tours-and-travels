"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api/client"

/**
 * Shared failure handling for admin actions: an expired session goes back to
 * sign-in (and returns here afterwards); anything else becomes an error toast.
 */
export function useAdminErrors() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()

  return useCallback(
    (error: unknown, title: string) => {
      if (error instanceof ApiError && error.status === 401) {
        toast.push({ tone: "error", title: "Your session has expired", description: "Please sign in again." })
        const here = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`
        router.replace(`/admin/login?next=${encodeURIComponent(here)}`)
        return
      }
      const description =
        error instanceof ApiError
          ? error.status === 404
            ? "It no longer exists. The list has been refreshed."
            : error.code === "NETWORK" || error.code === "TIMEOUT"
              ? "Please check your connection and try again."
              : error.message
          : "Please try again."
      toast.push({ tone: "error", title, description })
      if (error instanceof ApiError && error.status === 404) router.refresh()
    },
    [pathname, router, searchParams, toast],
  )
}
