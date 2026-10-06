import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { focusRing } from "@/components/ui/styles"
import { formatIst } from "@/lib/cms/schedule"
import { contentSections } from "@/lib/cms/sections"
import { cn } from "@/lib/utils/cn"
import { requireAdminPage } from "@/server/auth/admin-page"
import { adminListSections } from "@/server/cms/site-content"

export const metadata: Metadata = { title: "Website Content" }

export default async function AdminContentPage() {
  await requireAdminPage("/admin/content", "content.read")
  const states = await adminListSections()
  // The Traveller has its own page in the sidebar
  const sections = contentSections.filter((section) => section.key !== "traveller")

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Website Content"
        description="Change the words, photos and buttons in each section of the website. The design and layout stay the same, so nothing can break."
      />
      <ul className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => {
          const state = states.find((item) => item.key === section.key)
          const status = !state?.published && !state?.hasUnpublishedChanges ? "BUILT_IN" : state?.hasUnpublishedChanges ? "CHANGES" : "PUBLISHED"
          return (
            <li key={section.key}>
              <Link
                href={`/admin/content/${section.key}`}
                className={cn("group flex h-full flex-col gap-2 rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line transition hover:ring-teal/40", focusRing)}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-extrabold tracking-tight text-forest">{section.title}</h2>
                  <StatusPill status={status} label={status === "PUBLISHED" ? "Live" : undefined} />
                </div>
                <p className="text-sm text-muted">{section.description}</p>
                <p className="mt-auto flex items-center justify-between pt-2 text-xs text-muted">
                  <span>{state?.publishedAt ? `Published ${formatIst(state.publishedAt)}` : "Showing the website's built-in text"}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-teal-deep">
                    Edit <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
