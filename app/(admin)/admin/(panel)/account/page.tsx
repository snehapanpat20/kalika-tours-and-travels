import type { Metadata } from "next"
import { KeyRound } from "lucide-react"
import { PasswordForm, ProfileForm } from "@/components/admin/account-forms"
import { AdminPageHeader } from "@/components/admin/kit/page-header"
import { roleDescriptions, roleLabels } from "@/lib/auth/permissions"
import { formatIst } from "@/lib/cms/schedule"
import { requireAdminPage } from "@/server/auth/admin-page"

export const metadata: Metadata = { title: "My account" }

const contentAdminSections = "Dashboard, Enquiries, Gallery, Reviews, Website content, Offers, Announcements, Destinations, Services and Our Traveller"

export default async function AdminAccountPage() {
  const admin = await requireAdminPage("/admin/account", "self")
  const setup = admin.mustChangePassword

  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title="My account" description="Your details and password." />

      {setup ? (
        <div role="status" className="flex gap-3 rounded-card bg-coral-soft p-4 text-ink ring-1 ring-coral/30">
          <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-coral" />
          <p>
            <strong>Welcome, {admin.name}.</strong> You signed in with a temporary password. For security, the rest of the admin panel stays
            hidden until you choose your own password below. As soon as you save it, your menu appears:{" "}
            <strong>{admin.role === "SUPER_ADMIN" ? "every section of the admin panel" : contentAdminSections}</strong>.
          </p>
        </div>
      ) : null}

      <section aria-labelledby="details-title" className="grid gap-4 rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line sm:p-6">
        <h2 id="details-title" className="text-lg font-extrabold tracking-tight text-forest">
          Your details
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="font-semibold text-muted">Email</dt>
          <dd className="font-semibold break-words text-ink">{admin.email}</dd>
          <dt className="font-semibold text-muted">Role</dt>
          <dd className="text-ink">
            <span className="font-semibold">{roleLabels[admin.role]}</span>
            <span className="block text-muted">{roleDescriptions[admin.role]}</span>
          </dd>
          <dt className="font-semibold text-muted">Last sign-in</dt>
          <dd className="text-ink">{admin.lastLoginAt ? formatIst(admin.lastLoginAt) : "Not recorded"}</dd>
        </dl>
        {!setup ? <ProfileForm name={admin.name} /> : null}
      </section>

      <section aria-labelledby="password-title" className="grid gap-4 rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line sm:p-6">
        <h2 id="password-title" className="text-lg font-extrabold tracking-tight text-forest">
          {setup ? "Choose your password" : "Change password"}
        </h2>
        <PasswordForm setup={setup} />
      </section>
    </div>
  )
}
