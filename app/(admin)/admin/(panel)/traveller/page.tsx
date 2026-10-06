import type { Metadata } from "next"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { SectionEditor } from "@/components/admin/section-editor"
import { can } from "@/lib/auth/permissions"
import { getImageOptions } from "@/server/admin/image-options"
import { requireAdminPage } from "@/server/auth/admin-page"
import { sectionEditorData } from "@/server/cms/section-admin"

export const metadata: Metadata = { title: "Our Traveller" }

export default async function AdminTravellerPage() {
  const admin = await requireAdminPage("/admin/traveller", "traveller.read")
  const [data, images] = await Promise.all([sectionEditorData("traveller"), getImageOptions()])

  return (
    <div className="grid gap-4">
      <AdminPageHeader
        title="Our Traveller"
        description="The 20+1 seater Traveller on the homepage and the Our Traveller page: its description, features and photos. Only list features the vehicle really has."
      />
      <SectionEditor {...data} bundledImages={images.bundledImages} uploads={images.uploads} canEdit={can(admin.role, "traveller.write")} />
    </div>
  )
}
