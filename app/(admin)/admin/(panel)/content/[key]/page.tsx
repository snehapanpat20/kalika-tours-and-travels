import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { SectionEditor } from "@/components/admin/section-editor"
import { focusRing } from "@/components/ui/styles"
import { can } from "@/lib/auth/permissions"
import { getSection } from "@/lib/cms/sections"
import { cn } from "@/lib/utils/cn"
import { getImageOptions } from "@/server/admin/image-options"
import { requireAdminPage } from "@/server/auth/admin-page"
import { sectionEditorData } from "@/server/cms/section-admin"

export const metadata: Metadata = { title: "Edit website content" }

export default async function AdminContentSectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const section = getSection(key)
  if (!section) notFound()
  if (section.key === "traveller") redirect("/admin/traveller")
  const admin = await requireAdminPage(`/admin/content/${key}`, "content.read")
  const [data, images] = await Promise.all([sectionEditorData(key), getImageOptions()])

  return (
    <div className="grid gap-4">
      <Link href="/admin/content" className={cn("inline-flex w-fit items-center gap-1.5 rounded-pill text-sm font-bold text-teal-deep hover:underline", focusRing)}>
        <ArrowLeft aria-hidden="true" className="size-4" /> All website content
      </Link>
      <AdminPageHeader title={section.title} description={section.description} />
      <SectionEditor {...data} bundledImages={images.bundledImages} uploads={images.uploads} canEdit={can(admin.role, section.permission)} />
    </div>
  )
}
