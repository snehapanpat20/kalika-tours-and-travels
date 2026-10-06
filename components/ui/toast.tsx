"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

type ToastTone = "info" | "success" | "error"

export type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
}

type ToastRecord = ToastInput & { id: string; tone: ToastTone }

type ToastContextValue = {
  push: (toast: ToastInput) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneClass: Record<ToastTone, string> = {
  info: "border-line bg-ivory",
  success: "border-success/30 bg-success-soft",
  error: "border-danger/30 bg-danger-soft",
}

export function ToastProvider({ children, dismissLabel = "Dismiss" }: { children: ReactNode; dismissLabel?: string }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast: ToastInput) => {
      const id = crypto.randomUUID()
      const tone = toast.tone ?? "info"
      setToasts((current) => [...current, { ...toast, id, tone }])
      const timer = window.setTimeout(() => dismiss(id), 6000)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer))
      activeTimers.clear()
    }
  }, [])

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-card border p-4 text-ink shadow-overlay",
              toneClass[toast.tone],
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-forest">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm leading-6 text-ink">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                className={`rounded-pill px-2 py-1 text-sm font-semibold text-forest hover:bg-ivory ${focusRing}`}
                onClick={() => dismiss(toast.id)}
              >
                {dismissLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.")
  }
  return context
}
