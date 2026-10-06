import type { ReactNode } from "react"
import { ToastProvider } from "@/components/ui/toast"
import { fontVariables } from "@/lib/fonts"
import type { Locale } from "@/lib/i18n/locales"

export function Document({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={locale} className={fontVariables}>
      <body className="min-h-dvh bg-stone font-sans text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
