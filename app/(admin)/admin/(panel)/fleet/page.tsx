import type { Metadata } from "next"
import { FleetManager } from "@/components/admin/fleet-manager"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { getImageOptions } from "@/server/admin/image-options"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminListVehicles } from "@/server/cms/vehicles"

export const metadata: Metadata = { title: "Fleet" }

export default async function AdminFleetPage() {
  await requireAdminPage("/admin/fleet", "fleet.read")
  // A short list: one page shows every vehicle
  const [{ items, counts }, images] = await Promise.all([adminListVehicles({ page: 1, pageSize: 100 }), getImageOptions()])

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Fleet"
        description="The vehicles on the Our Fleet page, in the order shown there. Only published vehicles appear on the website; drafts stay here until you publish them."
      />
      <FleetManager items={items} totalAll={counts.all} bundledImages={images.bundledImages} uploads={images.uploads} />
    </div>
  )
}
