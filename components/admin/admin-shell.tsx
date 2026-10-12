"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, m } from "motion/react"
import {
  Bell,
  BusFront,
  ChevronDown,
  ExternalLink,
  FileText,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  MapPinned,
  Megaphone,
  Search,
  Menu,
  MessageSquareQuote,
  Settings,
  Tag,
  UserRound,
  UsersRound,
  X,
} from "lucide-react"
import type { AdminRole } from "@/generated/prisma/enums"
import { MotionProvider } from "@/components/motion/motion-provider"
import { easeOut } from "@/components/motion/reveal"
import { Spinner } from "@/components/ui/spinner"
import { focusRing } from "@/components/ui/styles"
import { useToast } from "@/components/ui/toast"
import { business } from "@/data/business"
import { signOut } from "@/lib/api/admin"
import { can, roleLabels, type Permission } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils/cn"

type ShellProps = {
  admin: { name: string; email: string; role: AdminRole; mustChangePassword: boolean }
  newEnquiries: number
  pendingReviews: number
  logo: ReactNode
  children: ReactNode
}

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  permission: Permission
  badge?: "enquiries" | "reviews"
}

/** The sidebar. Each item only shows for roles the server would let in anyway. */
const navGroups: { label: string; items: NavItem[] }[] = [
  { label: "Main", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.read" }] },
  {
    label: "Business",
    items: [
      { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, permission: "enquiries.read", badge: "enquiries" },
      { href: "/admin/gallery", label: "Gallery", icon: Images, permission: "gallery.read" },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, permission: "reviews.read", badge: "reviews" },
    ],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/content", label: "Website Content", icon: LayoutTemplate, permission: "content.read" },
      { href: "/admin/offers", label: "Offers", icon: Tag, permission: "offers.read" },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone, permission: "announcements.read" },
      { href: "/admin/destinations", label: "Destinations", icon: MapPinned, permission: "destinations.read" },
      { href: "/admin/services", label: "Services", icon: FileText, permission: "services.read" },
      { href: "/admin/traveller", label: "Our Traveller", icon: BusFront, permission: "traveller.read" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/users", label: "Admin Users", icon: UsersRound, permission: "users.read" },
      { href: "/admin/seo", label: "SEO", icon: Search, permission: "settings.read" },
      { href: "/admin/audit-logs", label: "Activity Log", icon: History, permission: "audit.read" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.read" },
    ],
  },
]

const pageTitles: [RegExp, string][] = [
  [/^\/admin\/account/, "My account"],
  ...navGroups.flatMap((group) => group.items.map((item): [RegExp, string] => [item.href === "/admin" ? /^\/admin\/?$/ : new RegExp(`^${item.href}(/|$)`), item.label])),
]

const isActive = (href: string, path: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`))

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function AdminShell({ admin, newEnquiries, pendingReviews, logo, children }: ShellProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const title = pageTitles.find(([pattern]) => pattern.test(pathname))?.[1] ?? "Admin"

  // Close the drawer when navigating
  const [drawerPath, setDrawerPath] = useState(pathname)
  if (drawerPath !== pathname) {
    setDrawerPath(pathname)
    setDrawerOpen(false)
  }

  useEffect(() => {
    if (!drawerOpen) return
    // Move focus into the drawer so keyboard and screen reader users land in it
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>("#admin-drawer a, #admin-drawer button")?.focus())
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [drawerOpen])

  const sidebar = (
    <SidebarContent admin={admin} badges={{ enquiries: newEnquiries, reviews: pendingReviews }} logo={logo} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
  )

  return (
    <MotionProvider>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-forest focus:px-5 focus:py-3 focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <div className="min-h-dvh bg-stone lg:pl-64">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-forest-deep text-white lg:flex">{sidebar}</aside>

        {/* Mobile and tablet drawer */}
        <AnimatePresence>
          {drawerOpen ? (
            <>
              <m.div
                key="overlay"
                className="fixed inset-0 z-40 bg-forest-deep/60 backdrop-blur-[2px] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
              />
              <m.aside
                key="drawer"
                id="admin-drawer"
                aria-label="Admin navigation"
                className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col bg-forest-deep text-white shadow-overlay lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3, ease: easeOut }}
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className={cn("absolute top-4 right-3 inline-flex size-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10", focusRing)}
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
                {sidebar}
              </m.aside>
            </>
          ) : null}
        </AnimatePresence>

        {/* Top header */}
        <header className="sticky top-0 z-20 border-b border-line bg-ivory/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              ref={menuButton}
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="admin-drawer"
              className={cn("-ml-2 inline-flex size-11 items-center justify-center rounded-full text-forest hover:bg-forest/5 lg:hidden", focusRing)}
            >
              <Menu aria-hidden="true" className="size-6" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold tracking-tight text-forest">{title}</p>
              <p className="truncate text-xs font-medium text-muted">{business.name} · Business Manager</p>
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {can(admin.role, "enquiries.read") ? (
                <Link
                  href="/admin/enquiries?status=NEW"
                  aria-label={newEnquiries === 0 ? "No new enquiries" : `${newEnquiries} new ${newEnquiries === 1 ? "enquiry" : "enquiries"}`}
                  className={cn("relative inline-flex size-11 items-center justify-center rounded-full text-forest hover:bg-forest/5", focusRing)}
                >
                  <Bell aria-hidden="true" className="size-5" />
                  {newEnquiries > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 right-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[0.6875rem] leading-5 font-bold text-forest-deep"
                    >
                      {newEnquiries > 99 ? "99+" : newEnquiries}
                    </span>
                  ) : null}
                </Link>
              ) : null}
              <AccountMenu admin={admin} />
            </div>
          </div>
        </header>

        <main id="content" tabIndex={-1} className="mx-auto w-full max-w-[90rem] px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-10">
          {children}
        </main>
      </div>
    </MotionProvider>
  )
}

/** Name, role and a menu with My account and Log out. */
function AccountMenu({ admin }: { admin: ShellProps["admin"] }) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn("flex min-h-11 items-center gap-2.5 rounded-pill py-1 pr-2 pl-1 hover:bg-forest/5", focusRing)}
      >
        <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
          {initials(admin.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-40 truncate text-sm leading-tight font-bold text-forest">{admin.name}</span>
          <span className="block text-[0.6875rem] leading-tight font-semibold text-muted">{roleLabels[admin.role]}</span>
        </span>
        <span className="sr-only sm:hidden">
          {admin.name}, {roleLabels[admin.role]}
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-30 mt-2 w-64 rounded-card bg-ivory p-2 shadow-overlay ring-1 ring-line">
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="truncate text-sm font-bold text-forest">{admin.name}</p>
            <p className="truncate text-xs text-muted">{admin.email}</p>
            <p className="mt-1.5 inline-flex rounded-pill bg-teal-soft px-2 py-0.5 text-[0.6875rem] font-bold text-teal-deep">{roleLabels[admin.role]}</p>
          </div>
          <Link
            href="/admin/account"
            onClick={() => setOpen(false)}
            className={cn("mt-1 flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-forest hover:bg-forest/5", focusRing)}
          >
            <UserRound aria-hidden="true" className="size-4" /> My account
          </Link>
          <LogoutButton variant="menu" />
        </div>
      ) : null}
    </div>
  )
}

function SidebarContent({
  admin,
  badges,
  logo,
  pathname,
  onNavigate,
}: {
  admin: ShellProps["admin"]
  badges: Record<"enquiries" | "reviews", number>
  logo: ReactNode
  pathname: string
  onNavigate: () => void
}) {
  // Someone who must change their password sees only their account until they do
  const groups = admin.mustChangePassword
    ? []
    : navGroups.map((group) => ({ ...group, items: group.items.filter((item) => can(admin.role, item.permission)) })).filter((group) => group.items.length)

  return (
    <>
      <div className="px-5 pt-5 pb-5">
        <Link href="/admin" onClick={onNavigate} aria-label={`${business.name} admin home`} className={cn("inline-flex rounded-[0.875rem]", focusRing)}>
          {logo}
        </Link>
        <p className="mt-4 text-[0.6875rem] font-bold tracking-[0.18em] text-teal-light uppercase">Business Manager</p>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group, index) => (
          <div key={group.label} className={cn(index > 0 && "mt-5")}>
            <p id={`nav-${group.label}`} className="px-3 pb-2 text-[0.6875rem] font-bold tracking-[0.18em] text-white/45 uppercase">
              {group.label}
            </p>
            <ul className="grid gap-1" aria-labelledby={`nav-${group.label}`}>
              {group.items.map((item) => {
                const active = isActive(item.href, pathname)
                const Icon = item.icon
                const count = item.badge ? badges[item.badge] : 0
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                        active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                        focusRing,
                      )}
                    >
                      <span aria-hidden="true" className={cn("h-5 w-0.5 rounded-full", active ? "bg-coral" : "bg-transparent")} />
                      <Icon aria-hidden="true" strokeWidth={1.8} className="size-[1.125rem]" />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 ? (
                        <span className="rounded-full bg-coral px-2 py-0.5 text-[0.6875rem] font-bold text-forest-deep">
                          {count > 99 ? "99+" : count}
                          <span className="sr-only">{item.badge === "reviews" ? " waiting for approval" : " new"}</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        <ul className="mt-5 grid gap-1 border-t border-white/10 pt-4">
          <li>
            <Link
              href="/admin/account"
              onClick={onNavigate}
              aria-current={pathname.startsWith("/admin/account") ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                pathname.startsWith("/admin/account") ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                focusRing,
              )}
            >
              <span aria-hidden="true" className={cn("h-5 w-0.5 rounded-full", pathname.startsWith("/admin/account") ? "bg-coral" : "bg-transparent")} />
              <UserRound aria-hidden="true" strokeWidth={1.8} className="size-[1.125rem]" />
              My account
            </Link>
          </li>
          <li>
            <a
              href="/en"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white", focusRing)}
            >
              <span aria-hidden="true" className="h-5 w-0.5" />
              <ExternalLink aria-hidden="true" strokeWidth={1.8} className="size-[1.125rem]" />
              View website
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold text-white">{admin.name}</p>
        <p className="truncate text-xs text-white/55">
          {roleLabels[admin.role]} · {admin.email}
        </p>
        <LogoutButton variant="sidebar" />
      </div>
    </>
  )
}

function LogoutButton({ variant }: { variant: "sidebar" | "menu" }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, setPending] = useState(false)

  async function logout() {
    setPending(true)
    try {
      await signOut()
      router.replace("/admin/login")
      router.refresh()
    } catch {
      setPending(false)
      toast.push({ tone: "error", title: "Could not log out", description: "Please try again." })
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={cn(
        variant === "sidebar"
          ? "mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
          : "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-danger hover:bg-danger-soft",
        "disabled:opacity-60",
        focusRing,
      )}
    >
      {pending ? <Spinner /> : <LogOut aria-hidden="true" strokeWidth={1.8} className="size-4" />}
      {pending ? "Logging out…" : "Log out"}
    </button>
  )
}
