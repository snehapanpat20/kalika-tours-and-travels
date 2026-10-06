import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { heroImage } from "@/components/home/home-content"
import { LoginForm } from "@/components/admin/login-form"
import { Photo } from "@/components/media/photo"
import { BrandLogo } from "@/components/ui/logo"
import { getAdminForPage, safeAdminPath } from "@/server/auth/admin-page"

export const metadata: Metadata = { title: "Sign in" }

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeAdminPath((await searchParams).next)
  if (await getAdminForPage()) redirect(next)

  return (
    <main id="content" className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-forest-deep px-4 py-10">
      {/* The same India collage as the website's homepage, so admin and site feel like one brand */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Photo image={heroImage} alt="" sizes="100vw" className="object-[50%_100%] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-deep/80 via-forest-deep/55 to-forest-deep/85" />
      </div>
      <div className="w-full max-w-sm">
        <div className="rounded-panel bg-ivory p-6 shadow-overlay sm:p-8">
          <BrandLogo size="nav" plate alt="Kalika Tours & Travels" />
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-forest">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">Manage enquiries and website content for Kalika Tours &amp; Travels.</p>
          <div className="mt-6">
            <LoginForm next={next} />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-white/70">Forgot your password? Ask the site administrator to set a new one for you.</p>
      </div>
    </main>
  )
}
