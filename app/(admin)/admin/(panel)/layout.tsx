import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
import { BrandLogo } from "@/components/ui/logo"
import { can } from "@/lib/auth/permissions"
import { getAdminForPage } from "@/server/auth/admin-page"
import { countPendingReviews } from "@/server/content/reviews"
import { countNewEnquiries } from "@/server/enquiries/service"

/** Signed-in admin area: sidebar, header and the pages inside. Each page checks its own permission. */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminForPage()
  if (!admin) redirect("/admin/login")

  const ready = !admin.mustChangePassword
  const [newEnquiries, pendingReviews] = await Promise.all([
    ready && can(admin.role, "enquiries.read") ? countNewEnquiries() : 0,
    ready && can(admin.role, "reviews.read") ? countPendingReviews() : 0,
  ])

  return (
    <AdminShell
      admin={{ name: admin.name, email: admin.email, role: admin.role, mustChangePassword: admin.mustChangePassword }}
      newEnquiries={newEnquiries}
      pendingReviews={pendingReviews}
      logo={<BrandLogo size="nav" plate alt="Kalika Tours & Travels" />}
    >
      {children}
    </AdminShell>
  )
}
