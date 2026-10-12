import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleCheckBig,
  CircleX,
  Images,
  Inbox,
  Megaphone,
  MessageSquareQuote,
  PhoneCall,
  Plus,
  Sparkles,
  Star,
  Tag,
  UsersRound,
} from "lucide-react"
import { formatDay, statusLabels, statusOrder, travelTypeLabels } from "@/components/admin/format"
import { heroImage } from "@/components/home/home-content"
import { Photo } from "@/components/media/photo"
import { EnquiryTable } from "@/components/admin/enquiry-table"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { RefreshButton } from "@/components/admin/refresh-button"
import { business } from "@/data/business"
import { StatCard } from "@/components/admin/stat-card"
import { StatusBadge } from "@/components/admin/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { focusRing } from "@/components/ui/styles"
import { can, type Permission } from "@/lib/auth/permissions"
import { formatIst } from "@/lib/cms/schedule"
import { cn } from "@/lib/utils/cn"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminActiveOffers, countActiveOffers } from "@/server/cms/offers"
import { countPublishedPhotos } from "@/server/content/gallery"
import { adminListReviews, countPendingReviews } from "@/server/content/reviews"
import { getDashboardStats, listUpcomingTrips } from "@/server/enquiries/service"

export const metadata: Metadata = { title: "Dashboard" }

/** Greeting by the hour in India. */
function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(now))
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

const barColours: Record<string, string> = {
  NEW: "bg-coral",
  CONTACTED: "bg-teal",
  CONFIRMED: "bg-success",
  COMPLETED: "bg-forest",
  CANCELLED: "bg-muted/50",
}

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage("/admin", "dashboard.read")
  const allowed = (permission: Permission) => can(admin.role, permission)

  const [stats, pendingReviews, publishedPhotos, activeOffers, upcoming, awaiting, offers] = await Promise.all([
    getDashboardStats(),
    countPendingReviews(),
    countPublishedPhotos(),
    countActiveOffers(),
    listUpcomingTrips(30, 6),
    adminListReviews({ status: "PENDING", page: 1, pageSize: 3 }),
    adminActiveOffers(4),
  ])
  const firstName = admin.name.split(/\s+/)[0] || admin.name
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date())

  const statusCounts = {
    NEW: stats.newEnquiries,
    CONTACTED: stats.contactedEnquiries,
    CONFIRMED: stats.confirmedEnquiries,
    COMPLETED: stats.completedEnquiries,
    CANCELLED: stats.cancelledEnquiries,
  }

  const quickActions = [
    { href: "/admin/offers?new=1", label: "Add Offer", icon: Tag, permission: "offers.write" as const },
    { href: "/admin/gallery?new=1", label: "Add Gallery Photo", icon: Images, permission: "gallery.write" as const },
    { href: "/admin/announcements?new=1", label: "Add Announcement", icon: Megaphone, permission: "announcements.write" as const },
    { href: "/admin/enquiries", label: "View Enquiries", icon: Inbox, permission: "enquiries.read" as const },
  ].filter((action) => allowed(action.permission))

  return (
    <div className="grid gap-8">
      {/* Welcome banner in the website's look: the homepage collage in brand colours */}
      <section aria-labelledby="dashboard-title" className="relative isolate overflow-hidden rounded-panel bg-forest-deep px-6 py-7 text-white shadow-card sm:px-8 sm:py-9">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Photo image={heroImage} alt="" sizes="(min-width: 1024px) 70vw, 100vw" className="object-[50%_92%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-forest-deep/95 via-forest-deep/75 to-forest-deep/20" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-light">{today}</p>
            <h1 id="dashboard-title" className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-white/80">Here&apos;s what&apos;s happening with {business.name}.</p>
          </div>
          <RefreshButton onDark />
        </div>
      </section>

      {quickActions.length ? (
        <section aria-label="Quick actions">
          <ul className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-ivory px-4 text-sm font-bold text-forest shadow-soft ring-1 ring-line hover:ring-teal/40", focusRing)}
                  >
                    {action.href.includes("new=1") ? <Plus aria-hidden="true" className="size-4 text-coral" /> : null}
                    <Icon aria-hidden="true" className="size-4 text-teal-deep" />
                    {action.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section aria-label="Enquiry statistics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total enquiries" value={stats.totalEnquiries} hint="All time" icon={Inbox} href="/admin/enquiries" accent="forest" />
        <StatCard label="New" value={stats.newEnquiries} hint="Waiting for first contact" icon={Sparkles} href="/admin/enquiries?status=NEW" accent="coral" />
        <StatCard label="Contacted" value={stats.contactedEnquiries} hint="Talking with the customer" icon={PhoneCall} href="/admin/enquiries?status=CONTACTED" accent="teal" />
        <StatCard label="Confirmed" value={stats.confirmedEnquiries} hint="Trip agreed" icon={BadgeCheck} href="/admin/enquiries?status=CONFIRMED" accent="success" />
        <StatCard label="Completed" value={stats.completedEnquiries} hint="Trip finished" icon={CircleCheckBig} href="/admin/enquiries?status=COMPLETED" accent="neutral" />
        <StatCard label="Cancelled" value={stats.cancelledEnquiries} hint="Did not go ahead" icon={CircleX} href="/admin/enquiries?status=CANCELLED" accent="danger" />
      </section>

      {stats.totalEnquiries > 0 ? (
        <section aria-labelledby="mix-title" className="rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line">
          <h2 id="mix-title" className="text-sm font-bold text-forest">
            Where your enquiries are
          </h2>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-stone-deep" aria-hidden="true">
            {statusOrder.map((status) =>
              statusCounts[status] ? <div key={status} className={barColours[status]} style={{ width: `${(statusCounts[status] / stats.totalEnquiries) * 100}%` }} /> : null,
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
            {statusOrder.map((status) => (
              <li key={status} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("size-2.5 rounded-full", barColours[status])} />
                {statusLabels[status]}: <span className="font-bold text-ink">{statusCounts[status]}</span> ({Math.round((statusCounts[status] / stats.totalEnquiries) * 100)}%)
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Website content" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Reviews waiting" value={pendingReviews} hint="Need your approval" icon={MessageSquareQuote} href="/admin/reviews?status=PENDING" accent="coral" />
        <StatCard label="Active offers" value={activeOffers} hint="Showing on the website now" icon={Tag} href="/admin/offers?status=ACTIVE" accent="success" />
        <StatCard label="Published photos" value={publishedPhotos} hint="Visible in the gallery" icon={Images} href="/admin/gallery?visibility=published" accent="teal" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Upcoming trips"
          description="Open enquiries travelling in the next 30 days, soonest first."
          action={<PanelLink href="/admin/enquiries?sort=travelDate">All by travel date</PanelLink>}
        >
          {upcoming.length ? (
            <ul className="divide-y divide-line">
              {upcoming.map((enquiry) => (
                <li key={enquiry.id} className="flex items-center gap-3 py-3">
                  <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-teal-soft py-1.5 text-center text-teal-deep">
                    <CalendarDays aria-hidden="true" className="size-4" />
                    <span className="text-[0.6875rem] font-bold">{formatDay(enquiry.travelDate).replace(/ \d{4}$/, "")}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-forest">{enquiry.destination}</p>
                    <p className="truncate text-xs text-muted">
                      {enquiry.fullName} · <UsersRound aria-hidden="true" className="inline size-3" /> {enquiry.passengerCount} · {travelTypeLabels[enquiry.travelType]}
                    </p>
                  </div>
                  <StatusBadge status={enquiry.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">No trips coming up in the next 30 days.</p>
          )}
        </Panel>

        <Panel title="Reviews waiting for approval" action={<PanelLink href="/admin/reviews?status=PENDING">Moderate reviews</PanelLink>}>
          {awaiting.reviews.length ? (
            <ul className="divide-y divide-line">
              {awaiting.reviews.map((review) => (
                <li key={review.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-forest">{review.customerName}</p>
                    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${review.rating} out of 5`}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star key={value} aria-hidden="true" className={cn("size-3.5", value <= review.rating ? "fill-coral text-coral" : "text-line")} />
                      ))}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{review.destination}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink">{review.reviewText}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">No reviews waiting for approval.</p>
          )}
        </Panel>
      </div>

      <Panel
        title="Active offers"
        description="Showing on the homepage right now."
        action={allowed("offers.read") ? <PanelLink href="/admin/offers">Manage offers</PanelLink> : undefined}
      >
        {offers.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {offers.map((offer) => (
              <li key={offer.id} className="rounded-xl bg-white p-4 ring-1 ring-line">
                <StatusPill status={offer.status} />
                <p className="mt-2 font-bold text-forest">{offer.title}</p>
                <p className="mt-1 text-xs text-muted">{offer.endsAt ? `Until ${formatIst(offer.endsAt)}` : "No end date"}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">No active offers. {allowed("offers.write") ? "Add one for the next festival or season." : null}</p>
        )}
      </Panel>

      <section aria-labelledby="recent-title" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="recent-title" className="text-lg font-extrabold tracking-tight text-forest">
              Recent enquiries
            </h2>
            <p className="text-sm text-muted">The five most recent. Select one to see details and update its status.</p>
          </div>
          {stats.totalEnquiries > 0 ? <PanelLink href="/admin/enquiries">View all enquiries</PanelLink> : null}
        </div>
        <EnquiryTable
          enquiries={stats.recentEnquiries}
          caption="Recent enquiries"
          empty={<EmptyState title="No enquiries yet" description="New travel enquiries from your website will appear here." />}
        />
      </section>
    </div>
  )
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-forest">{title}</h2>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={cn("group inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-bold text-forest hover:bg-forest/5", focusRing)}>
      {children} <ArrowRight aria-hidden="true" className="nudge size-4" />
    </Link>
  )
}
