import type { Metadata } from "next"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { ServicesManager } from "@/components/admin/services-manager"
import { getImageOptions } from "@/server/admin/image-options"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminListServices } from "@/server/cms/services"

export const metadata: Metadata = { title: "Services" }

export default async function AdminServicesPage() {
  await requireAdminPage("/admin/services", "services.read")
  // A handful of services: one page lists them all
  const [{ items, counts }, images] = await Promise.all([adminListServices({ page: 1, pageSize: 100 }), getImageOptions()])

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Services" description="The kinds of trips Kalika offers, shown on the Services page and the homepage. Only published services appear on the website." />
      <ServicesManager items={items} totalAll={counts.all} bundledImages={images.bundledImages} uploads={images.uploads} />
    </div>
  )
}
