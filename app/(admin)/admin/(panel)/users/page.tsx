import type { Metadata } from "next"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { Pagination } from "@/components/admin/pagination"
import { UrlFilters } from "@/components/admin/url-filters"
import { UsersManager } from "@/components/admin/users-manager"
import { roleLabels } from "@/lib/auth/permissions"
import { readPageSearchParams, withQuery, type PageSearchParams } from "@/server/admin/search-params"
import { listAdmins, userListSchema } from "@/server/admin/users"
import { requireAdminPage } from "@/server/auth/admin-page"

export const metadata: Metadata = { title: "Admin Users" }

/** Super Admin only. Content Admins get the 403 page (no loading screen here, so the status is a real 403). */
export default async function AdminUsersPage({ searchParams }: { searchParams: PageSearchParams }) {
  const raw = await readPageSearchParams(searchParams)
  const admin = await requireAdminPage(withQuery("/admin/users", raw), "users.read")
  const parsed = userListSchema.safeParse({ ...raw, pageSize: 50 })
  const query = parsed.success ? parsed.data : userListSchema.parse({ pageSize: 50 })
  const { items, pagination } = await listAdmins(query)
  const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "page"))

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Admin Users"
        description="Who can sign in to this admin panel. Content Admins manage enquiries and website content; only Super Admins can manage admins, settings and the activity log."
      />
      <UrlFilters
        searchPlaceholder="Name or email"
        selects={[
          { key: "role", label: "Role", emptyLabel: "All roles", options: Object.entries(roleLabels).map(([value, label]) => ({ value, label })) },
          {
            key: "status",
            label: "Status",
            emptyLabel: "All",
            options: [
              { value: "active", label: "Enabled" },
              { value: "disabled", label: "Disabled" },
            ],
          },
        ]}
      />
      <UsersManager users={items} currentAdminId={admin.id} />
      <Pagination basePath="/admin/users" page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} params={carried} />
    </div>
  )
}
