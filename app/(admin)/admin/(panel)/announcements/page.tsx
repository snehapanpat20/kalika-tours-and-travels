import type { Metadata } from "next"
import { AnnouncementsManager } from "@/components/admin/announcements-manager"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { StatusTabs } from "@/components/admin/kit/status-tabs"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { scheduleLabels, scheduleStatuses } from "@/lib/cms/schedule"
import { readPageSearchParams, withQuery, type PageSearchParams } from "@/server/admin/search-params"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminListAnnouncements, announcementListSchema, countAnnouncementsByStatus } from "@/server/cms/announcements"

export const metadata: Metadata = { title: "Announcements" }

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const raw = await readPageSearchParams(searchParams)
  await requireAdminPage(withQuery("/admin/announcements", raw), "announcements.read")

  const parsed = announcementListSchema.safeParse(raw)
  const query = parsed.success ? parsed.data : announcementListSchema.parse({})
  const [{ items, pagination }, counts] = await Promise.all([adminListAnnouncements(query), countAnnouncementsByStatus()])
  const current = query.status ?? "ALL"
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "page" && key !== "new"))

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Announcements"
        description="A short message in the bar at the top of the website, such as “Diwali group tour bookings are now open.” Schedule it, and it turns on and off by itself."
      />
      <StatusTabs
        label="Announcement status"
        current={current}
        tabs={[
          { key: "ALL", label: "All", count: counts.ALL, href: "/admin/announcements" },
          ...scheduleStatuses.map((status) => ({ key: status, label: scheduleLabels[status], count: counts[status], highlight: status === "ACTIVE", href: withQuery("/admin/announcements", { status }) })),
        ]}
      />
      <AnnouncementsManager
        autoOpen={raw.new === "1"}
        items={items}
        emptyState={
          <EmptyState
            title={current === "ACTIVE" ? "No active announcement" : current === "ALL" ? "No announcements yet" : `No ${scheduleLabels[current].toLowerCase()} announcements`}
            description="The notice bar is hidden on the website while no announcement is active."
          />
        }
      />
      <Pagination basePath="/admin/announcements" page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} params={carried} />
    </div>
  )
}
