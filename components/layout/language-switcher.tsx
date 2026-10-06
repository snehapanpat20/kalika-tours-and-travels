"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { focusRing } from "@/components/ui/styles"
import { locales, type Locale } from "@/lib/i18n/locales"
import { swapLocale } from "@/lib/i18n/locale-path"
import { cn } from "@/lib/utils/cn"

/** A quiet utility control: `EN | मराठी`. */
export function LanguageSwitcher({
  locale,
  labels,
  label,
  tone = "dark",
}: {
  locale: Locale
  labels: Record<Locale, string>
  label: string
  tone?: "dark" | "light"
}) {
  const pathname = usePathname()
  const router = useRouter()
  const light = tone === "light"

  return (
    <div role="group" aria-label={label} className="inline-flex items-center text-xs leading-none">
      {locales.map((code, index) => {
        const active = code === locale
        const short = code === "en" ? "EN" : labels.mr
        return (
          <span key={code} className="inline-flex items-center">
            {index > 0 ? (
              <span aria-hidden="true" className={cn("px-1", light ? "text-white/35" : "text-ink/25")}>
                |
              </span>
            ) : null}
            <Link
              href={swapLocale(pathname, code)}
              hrefLang={code}
              lang={code}
              aria-current={active ? "true" : undefined}
              aria-label={labels[code]}
              onClick={(event) => {
                const { search, hash } = window.location
                if (!search && !hash) return
                event.preventDefault()
                router.push(`${swapLocale(pathname, code)}${search}${hash}`)
              }}
              className={cn(
                "inline-flex min-h-11 items-center rounded-sm px-1.5 tracking-wide transition-colors",
                focusRing,
                active
                  ? cn("font-bold", light ? "text-white" : "text-forest")
                  : cn("font-medium", light ? "text-white/65 hover:text-white" : "text-muted hover:text-forest"),
              )}
            >
              {short}
            </Link>
          </span>
        )
      })}
    </div>
  )
}
