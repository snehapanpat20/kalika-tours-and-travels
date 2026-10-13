"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, m } from "motion/react"
import { ArrowRight, Menu, Phone, X } from "lucide-react"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { easeOut } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { WhatsAppIcon } from "@/components/ui/icons"
import { focusRing, shell } from "@/components/ui/styles"
import { business, callNumbers } from "@/data/business"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { Locale } from "@/lib/i18n/locales"
import { hasDarkHero, pagePath, type PageKey } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

type NavKey = Extract<PageKey, "home" | "about" | "services" | "destinations" | "traveller" | "gallery" | "reviews">

const navKeys: NavKey[] = ["home", "about", "services", "destinations", "traveller", "gallery", "reviews"]

export function SiteNav({
  locale,
  dictionary,
  logo,
  topSlot,
}: {
  locale: Locale
  dictionary: Dictionary
  logo: ReactNode
  /** Shown above the navigation inside the fixed header (the announcement bar). */
  topSlot?: ReactNode
}) {
  const copy = dictionary.nav
  const pathname = usePathname()
  const menuId = useId()
  const headerRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const items = navKeys.map((key) => ({ key, label: copy[key], href: pagePath(locale, key) }))
  const planHref = pagePath(locale, "plan")
  // The current page is highlighted; Home only on the homepage itself
  const isActive = (href: string) => (href === `/${locale}` ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))
  const active = items.find((item) => isActive(item.href))?.key ?? null

  // Compact, translucent header once the page moves
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close on route change
  const [menuPath, setMenuPath] = useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setOpen(false)
  }

  // Menu: lock scroll, close on Escape, keep focus inside the header
  useEffect(() => {
    if (!open) return
    const header = headerRef.current
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        toggleRef.current?.focus()
        return
      }
      if (event.key !== "Tab" || !header) return
      const focusable = Array.from(header.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")).filter(
        (node) => node.offsetParent !== null,
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  // Over a hero image the header is transparent with light text
  const overlay = hasDarkHero(pathname) && !scrolled && !open

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-500",
        overlay
          ? "border-b border-transparent bg-transparent"
          : "border-b border-forest/8 bg-ivory/85 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-ivory/75",
        open && "bg-ivory supports-[backdrop-filter]:bg-ivory",
      )}
    >
      {overlay ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-forest-deep/45 to-transparent" />
      ) : null}
      {topSlot}
      <div
        className={cn(
          shell,
          "flex items-center gap-4 transition-[height] duration-500 ease-out",
          scrolled ? "h-14 lg:h-16" : "h-16 lg:h-20",
        )}
      >
        <Link
          href={`/${locale}`}
          aria-label={`${business.name}, ${copy.home}`}
          className={cn(
            "shrink-0 rounded-[0.875rem] transition-transform duration-500 ease-out",
            "[&_img]:transition-[height] [&_img]:duration-500",
            scrolled ? "[&_img]:h-9 lg:[&_img]:h-11" : "[&_img]:h-11 lg:[&_img]:h-14",
            focusRing,
          )}
        >
          {logo}
        </Link>

        <nav aria-label={copy.label} className="ml-auto hidden xl:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const current = active === item.key
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative inline-flex min-h-11 items-center px-2.5 text-[0.875rem] font-semibold whitespace-nowrap transition-colors duration-300 2xl:px-3.5 2xl:text-[0.9375rem]",
                      "after:absolute after:inset-x-2.5 2xl:after:inset-x-3.5 after:bottom-1.5 after:h-0.5 after:origin-left after:rounded-full after:bg-coral after:transition-transform after:duration-500 after:ease-out",
                      current ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                      overlay
                        ? current
                          ? "text-white"
                          : "text-white/80 hover:text-white"
                        : current
                          ? "text-teal-deep"
                          : "text-ink/80 hover:text-teal-deep",
                      focusRing,
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-4 xl:gap-5">
          <div className="hidden sm:block">
            <LanguageSwitcher locale={locale} labels={dictionary.languages} label={dictionary.languageLabel} tone={overlay ? "light" : "dark"} />
          </div>
          <Button href={planHref} size="sm" arrow variant={overlay ? "light" : "primary"} className="hidden md:inline-flex">
            {copy.plan}
          </Button>
          <a
            href={`tel:${business.phoneE164}`}
            aria-label={`${copy.call} ${business.phone}`}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full transition-colors md:hidden",
              overlay ? "text-white hover:bg-white/10" : "text-forest hover:bg-forest/5",
              focusRing,
            )}
          >
            <Phone aria-hidden="true" strokeWidth={1.8} className="size-5" />
          </a>
          <button
            ref={toggleRef}
            type="button"
            className={cn(
              "-mr-2 inline-flex size-11 items-center justify-center rounded-full transition-colors xl:hidden",
              overlay ? "text-white hover:bg-white/10" : "text-forest hover:bg-forest/5",
              focusRing,
            )}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? copy.closeMenu : copy.openMenu}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" strokeWidth={1.8} className="size-6" /> : <Menu aria-hidden="true" strokeWidth={1.8} className="size-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <m.div
            key="menu"
            id={menuId}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: easeOut }}
            className="absolute inset-x-0 top-full h-[calc(100dvh-100%)] overflow-y-auto overscroll-contain border-t border-line bg-ivory xl:hidden"
          >
            <nav aria-label={copy.label} className={cn(shell, "flex min-h-full flex-col pt-4 pb-8")}>
              <m.ul
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
                className="grid md:grid-cols-2 md:gap-x-10"
              >
                {items.map((item) => (
                  <m.li
                    key={item.key}
                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } } }}
                    className="border-b border-line"
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active === item.key ? "page" : undefined}
                      className={cn(
                        "group flex min-h-15 items-center justify-between text-xl font-bold tracking-tight text-forest",
                        focusRing,
                      )}
                    >
                      <span className="flex items-center gap-3">
                        {active === item.key ? <span aria-hidden="true" className="size-1.5 rounded-full bg-coral" /> : null}
                        {item.label}
                      </span>
                      <ArrowRight aria-hidden="true" strokeWidth={1.8} className="nudge size-5 text-muted" />
                    </Link>
                  </m.li>
                ))}
              </m.ul>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Button href={planHref} size="lg" arrow onClick={() => setOpen(false)} className="w-full">
                  {copy.plan}
                </Button>
                <Button
                  href={business.whatsappUrl}
                  variant="outline"
                  size="lg"
                  className="w-full"
                  icon={<WhatsAppIcon className="size-5 text-whatsapp" />}
                >
                  {copy.whatsapp}
                </Button>
              </div>
              <div className="mt-auto flex items-center justify-between gap-4 pt-10 text-sm">
                <div className="flex flex-col">
                  {callNumbers.map((number) => (
                    <a
                      key={number.e164}
                      href={`tel:${number.e164}`}
                      aria-label={`${copy.call} ${number.display}`}
                      className={cn("inline-flex min-h-11 items-center gap-2 font-semibold text-forest", focusRing)}
                    >
                      <Phone aria-hidden="true" strokeWidth={1.8} className="size-4 text-teal-deep" />
                      {number.display}
                    </a>
                  ))}
                </div>
                <LanguageSwitcher locale={locale} labels={dictionary.languages} label={dictionary.languageLabel} />
              </div>
            </nav>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
