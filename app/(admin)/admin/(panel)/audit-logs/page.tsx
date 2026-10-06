import type { Metadata } from "next"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { Pagination } from "@/components/admin/pagination"
import { UrlFilters } from "@/components/admin/url-filters"
import { EmptyState } from "@/components/ui/empty-state"
import { roleLabels } from "@/lib/auth/permissions"
import { formatIst } from "@/lib/cms/schedule"
import { auditEntityTypes, auditListSchema, listAuditLogs, type AuditLogRow } from "@/server/admin/audit"
import { readPageSearchParams, withQuery, type PageSearchParams } from "@/server/admin/search-params"
import { requireAdminPage } from "@/server/auth/admin-page"

export const metadata: Metadata = { title: "Activity Log" }

const actionLabels: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  publish: "Published",
  unpublish: "Unpublished",
  approve: "Approved",
  reject: "Rejected",
  status_change: "Changed status",
  role_change: "Changed role",
  enable: "Enabled",
  disable: "Disabled",
  password_reset: "Reset password",
  password_change: "Changed password",
  import: "Imported",
  discard_draft: "Discarded draft",
}

const entityLabels: Record<string, string> = {
  Enquiry: "Enquiry",
  GalleryItem: "Gallery photo",
  Review: "Review",
  Offer: "Offer",
  Announcement: "Announcement",
  SiteContent: "Website content",
  Destination: "Destination",
  Service: "Service",
  Admin: "Admin user",
}

function details(row: AuditLogRow) {
  const meta = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? (row.metadata as Record<string, unknown>) : null
  if (meta && "from" in meta && "to" in meta) return `${String(meta.from)} → ${String(meta.to)}`
  if (meta && "to" in meta) return `→ ${String(meta.to)}`
  return null
}

/** Super Admin only: who did what, and when. Never contains passwords or secrets. */
export default async function AdminAuditLogPage({ searchParams }: { searchParams: PageSearchParams }) {
  const raw = await readPageSearchParams(searchParams)
  await requireAdminPage(withQuery("/admin/audit-logs", raw), "audit.read")
  const parsed = auditListSchema.safeParse(raw)
  const query = parsed.success ? parsed.data : auditListSchema.parse({})
  const { items, pagination } = await listAuditLogs(query)
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "page"))

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Activity Log" description="Important changes made in the admin panel: who did what, and when. Passwords and other secrets are never recorded." />
      <UrlFilters
        searchPlaceholder="Name or description"
        selects={[
          { key: "entityType", label: "Area", emptyLabel: "Everything", options: auditEntityTypes.map((value) => ({ value, label: entityLabels[value] })) },
          { key: "action", label: "Action", emptyLabel: "All actions", options: Object.entries(actionLabels).map(([value, label]) => ({ value, label })) },
        ]}
      />
      {items.length ? (
        <div className="overflow-x-auto rounded-card bg-ivory shadow-soft ring-1 ring-line">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Admin activity, newest first</caption>
            <thead className="border-b border-line bg-stone text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">When</th>
                <th scope="col" className="px-4 py-3">Who</th>
                <th scope="col" className="px-4 py-3">Action</th>
                <th scope="col" className="px-4 py-3">What</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{formatIst(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-forest">{row.actorName}</p>
                    <p className="text-xs text-muted">{roleLabels[row.actorRole]}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{actionLabels[row.action] ?? row.action}</td>
                  <td className="px-4 py-3">
                    <p className="text-ink">
                      <span className="text-muted">{entityLabels[row.entityType] ?? row.entityType}: </span>
                      {row.summary ?? "—"}
                    </p>
                    {details(row) ? <p className="text-xs text-muted">{details(row)}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No activity found" description={Object.keys(carried).length ? "Try different filters." : "Changes made in the admin panel will be listed here."} />
      )}
      <Pagination basePath="/admin/audit-logs" page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} params={carried} />
    </div>
  )
}
