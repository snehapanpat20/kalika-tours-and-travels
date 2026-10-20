import type { Metadata } from "next"
import { ExternalLink } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { SectionEditor } from "@/components/admin/section-editor"
import { focusRing } from "@/components/ui/styles"
import { can } from "@/lib/auth/permissions"
import { getSiteUrl } from "@/lib/config/site"
import { cn } from "@/lib/utils/cn"
import { getImageOptions } from "@/server/admin/image-options"
import { requireAdminPage } from "@/server/auth/admin-page"
import { sectionEditorData } from "@/server/cms/section-admin"

export const metadata: Metadata = { title: "SEO" }

/** Super Admin only: page titles, descriptions and the sharing image used by search engines and social media. */
export default async function AdminSeoPage() {
  const admin = await requireAdminPage("/admin/seo", "settings.read")
  const [data, images] = await Promise.all([sectionEditorData("seo"), getImageOptions()])
  const siteUrl = getSiteUrl()
  const link = cn("inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-white px-3 text-xs font-bold text-forest ring-1 ring-line hover:ring-forest/30", focusRing)

  return (
    <div className="grid gap-4">
      <AdminPageHeader
        title="SEO"
        description="How the website appears in Google search results and when pages are shared. Destinations have their own SEO fields in Destinations."
      />
      <div className="flex flex-wrap items-center gap-2 rounded-card bg-ivory p-4 text-sm ring-1 ring-line">
        <span className="text-muted">
          Website address: <strong className="text-ink">{siteUrl}</strong> (the server&rsquo;s NEXT_PUBLIC_SITE_URL, or https://kalikayatra.com on the live site)
        </span>
        <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className={link}>
          Sitemap <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
        <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className={link}>
          Robots.txt <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </div>
      <SectionEditor {...data} bundledImages={images.bundledImages} uploads={images.uploads} canEdit={can(admin.role, "settings.write")} />
    </div>
  )
}
