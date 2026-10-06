import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { CircleAlert, CircleCheck, HardDrive, Mail, ShieldCheck, UserRound } from "lucide-react"
import { adminRoles, can, permissions, roleDescriptions, roleLabels } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils/cn"
import { requireAdminPage } from "@/server/auth/admin-page"
import { getEmailStatus } from "@/server/email/mailer"
import { getStorageStatus, uploadRoot } from "@/server/storage"

export const metadata: Metadata = { title: "Settings" }

/**
 * Read-only overview of how this installation is set up. Everything here
 * comes from server environment variables; nothing secret is shown.
 */
export default async function AdminSettingsPage() {
  const admin = await requireAdminPage("/admin/settings", "settings.read")
  const email = getEmailStatus()
  const storage = getStorageStatus()

  const emailState: { ok: boolean; text: string } =
    email.mode === "none"
      ? { ok: false, text: "Email notifications are switched off (EMAIL_TRANSPORT=none). New enquiries are still saved here." }
      : email.mode === "log"
        ? { ok: false, text: "Development mode: emails are printed to the server log instead of being sent (EMAIL_TRANSPORT=log)." }
        : email.configured
          ? { ok: true, text: `SMTP is set up${email.host ? ` via ${email.host}` : ""}. Delivery problems show on each enquiry.` }
          : { ok: false, text: "SMTP is selected but EMAIL_HOST, EMAIL_USER or EMAIL_PASSWORD is missing, so no emails are sent." }

  const storageState: { ok: boolean; text: string } = !storage.enabled
    ? { ok: false, text: `${storage.reason} Gallery photos can still use images bundled with the website, and review photos are turned off.` }
    : storage.persistent
      ? { ok: true, text: "Uploads are saved to this server's disk. Back up the upload folder with your database." }
      : { ok: false, text: "Uploads are saved to this server's disk, but this host does not keep files between deployments. Photos may be lost." }

  return (
    <div className="grid max-w-3xl gap-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-forest sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted">How this website is set up. These come from server configuration and can&apos;t be changed here.</p>
      </header>

      <Panel icon={<UserRound className="size-5" />} title="Your account">
        <Row label="Name" value={admin.name} />
        <Row label="Email" value={admin.email} />
        <p className="text-sm text-muted">
          Change your password from <Link href="/admin/account" className="font-semibold text-teal-deep underline-offset-4 hover:underline">My account</Link>. Manage other admins in Admin Users.
        </p>
      </Panel>

      <Panel icon={<ShieldCheck className="size-5" />} title="Roles and permissions">
        <p className="text-sm text-muted">Every request is checked on the server, so hiding a menu item is never the only protection.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {adminRoles.map((role) => (
            <li key={role} className="rounded-xl bg-white p-4 ring-1 ring-line">
              <p className="font-bold text-forest">{roleLabels[role]}</p>
              <p className="mt-1 text-sm text-muted">{roleDescriptions[role]}</p>
              <p className="mt-2 text-xs text-muted">{permissions.filter((permission) => can(role, permission)).length} of {permissions.length} permissions</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel icon={<Mail className="size-5" />} title="Enquiry emails">
        <Status ok={emailState.ok} text={emailState.text} />
        <Row label="Sent to" value={email.notifyTo} />
      </Panel>

      <Panel icon={<HardDrive className="size-5" />} title="Photo uploads">
        <Status ok={storageState.ok} text={storageState.text} />
        <Row label="Storage" value={storage.enabled ? "Local disk" : "Off"} />
        {storage.enabled ? <Row label="Folder" value={uploadRoot()} mono /> : null}
        <p className="text-sm text-muted">Uploads are resized and re-saved as WebP, which also removes location data from phone photos.</p>
      </Panel>
    </div>
  )
}

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-4 rounded-card bg-ivory p-5 shadow-soft ring-1 ring-line sm:p-6">
      <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-forest">
        <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-teal-soft text-teal-deep">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase sm:pt-0.5">{label}</p>
      <p className={cn("min-w-0 font-semibold break-words text-ink", mono && "font-mono text-sm")}>{value}</p>
    </div>
  )
}

function Status({ ok, text }: { ok: boolean; text: string }) {
  const Icon = ok ? CircleCheck : CircleAlert
  return (
    <p className={cn("flex gap-2.5 rounded-xl p-3 text-sm leading-6", ok ? "bg-success-soft text-ink" : "bg-coral-soft text-ink")}>
      <Icon aria-hidden="true" className={cn("mt-0.5 size-[1.125rem] shrink-0", ok ? "text-success" : "text-coral")} />
      {text}
    </p>
  )
}
