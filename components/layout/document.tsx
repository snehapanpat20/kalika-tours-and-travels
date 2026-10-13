import type { ReactNode } from "react"
import { ToastProvider } from "@/components/ui/toast"
import { fontVariables } from "@/lib/fonts"
import type { Locale } from "@/lib/i18n/locales"

/** `theme="site"` switches the colour variables in globals.css to the customer website's palette. */
export function Document({ locale, theme, children }: { locale: Locale; theme?: "site"; children: ReactNode }) {
  return (
    <html lang={locale} className={fontVariables} data-theme={theme}>
      <body className="min-h-dvh bg-stone font-sans text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
