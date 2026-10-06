"use client"

import { usePathname } from "next/navigation"
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/locales"

export function useLocale(): Locale {
  const pathname = usePathname()
  const segment = pathname.split("/").filter(Boolean)[0]
  return segment && isLocale(segment) ? segment : defaultLocale
}
