"use client"

import { useState, type FormEvent } from "react"
import { KeyRound, Pencil, Plus, ShieldCheck, UserRound, Wand2 } from "lucide-react"
import { EditorDrawer } from "@/components/admin/kit/editor-drawer"
import { CheckField, SelectField, TextField } from "@/components/admin/kit/form-controls"
import { StatusPill } from "@/components/admin/kit/status-pill"
import { useSave } from "@/components/admin/kit/use-save"
import { focusRing } from "@/components/ui/styles"
import { createAdminUser, resetAdminUserPassword, updateAdminUser } from "@/lib/api/admin"
import { adminRoles, roleDescriptions, roleLabels } from "@/lib/auth/permissions"
import { formatIst } from "@/lib/cms/schedule"
import { cn } from "@/lib/utils/cn"
import type { AdminUser } from "@/server/admin/users"

const roleOptions = adminRoles.map((role) => ({ value: role, label: `${roleLabels[role]}: ${roleDescriptions[role]}` }))

/** A random temporary password, generated in this browser. Shown once so it can be passed on. */
function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")
}

type Editor = { mode: "create" } | { mode: "edit"; user: AdminUser } | { mode: "password"; user: AdminUser }

/** Super Admin only: the people who can sign in to this admin panel. */
export function UsersManager({ users, currentAdminId }: { users: AdminUser[]; currentAdminId: string }) {
  const save = useSave()
  const [editor, setEditor] = useState<{ open: boolean; value: Editor; session: number }>({ open: false, value: { mode: "create" }, session: 0 })

  const open = (value: Editor) => {
    save.reset()
    setEditor((state) => ({ open: true, value, session: state.session + 1 }))
  }
  const close = () => setEditor((state) => ({ ...state, open: false }))

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => open({ mode: "create" })}
          className={cn("inline-flex min-h-11 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-bold text-forest-deep hover:bg-coral/90", focusRing)}
        >
          <Plus aria-hidden="true" className="size-4" /> Add admin
        </button>
      </div>

      <div className={cn("overflow-hidden rounded-card bg-ivory shadow-soft ring-1 ring-line", save.refreshing && "opacity-70 transition-opacity")}>
        <table className="hidden w-full text-left text-sm md:table">
          <caption className="sr-only">Admin users</caption>
          <thead className="border-b border-line bg-stone text-xs font-bold tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Name</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Last sign-in</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-bold text-forest">
                    {user.name} {user.id === currentAdminId ? <span className="text-xs font-semibold text-muted">(you)</span> : null}
                  </p>
                  <p className="text-xs text-muted">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  <UserStatus user={user} />
                </td>
                <td className="px-4 py-3 text-muted">{user.lastLoginAt ? formatIst(user.lastLoginAt) : "Never"}</td>
                <td className="px-4 py-3 text-muted">{formatIst(user.createdAt)}</td>
                <td className="px-4 py-3">
                  <UserActions user={user} isSelf={user.id === currentAdminId} onEdit={() => open({ mode: "edit", user })} onPassword={() => open({ mode: "password", user })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Phones and tablets: cards instead of a wide table */}
        <ul className="divide-y divide-line md:hidden">
          {users.map((user) => (
            <li key={user.id} className="grid gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-forest">
                    {user.name} {user.id === currentAdminId ? <span className="text-xs font-semibold text-muted">(you)</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <RoleBadge role={user.role} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <UserStatus user={user} /> Last sign-in: {user.lastLoginAt ? formatIst(user.lastLoginAt) : "never"}
              </div>
              <UserActions user={user} isSelf={user.id === currentAdminId} onEdit={() => open({ mode: "edit", user })} onPassword={() => open({ mode: "password", user })} />
            </li>
          ))}
        </ul>
      </div>

      {/* Editors mount only once opened: the generated password must come from the browser */}
      {editor.session > 0 && editor.value.mode === "create" ? <CreateUser key={editor.session} open={editor.open} save={save} onClose={close} /> : null}
      {editor.session > 0 && editor.value.mode === "edit" ? (
        <EditUser key={editor.session} open={editor.open} user={editor.value.user} isSelf={editor.value.user.id === currentAdminId} save={save} onClose={close} />
      ) : null}
      {editor.session > 0 && editor.value.mode === "password" ? <ResetPassword key={editor.session} open={editor.open} user={editor.value.user} save={save} onClose={close} /> : null}
    </>
  )
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[0.6875rem] font-bold whitespace-nowrap",
        role === "SUPER_ADMIN" ? "bg-forest text-white" : "bg-teal-soft text-teal-deep",
      )}
    >
      {role === "SUPER_ADMIN" ? <ShieldCheck aria-hidden="true" className="size-3.5" /> : <UserRound aria-hidden="true" className="size-3.5" />}
      {roleLabels[role]}
    </span>
  )
}

function UserStatus({ user }: { user: AdminUser }) {
  if (!user.isActive) return <StatusPill status="DISABLED" />
  if (user.mustChangePassword) return <StatusPill status="PENDING" label="Must set password" />
  return <StatusPill status="ACTIVE" />
}

function UserActions({ user, isSelf, onEdit, onPassword }: { user: AdminUser; isSelf: boolean; onEdit: () => void; onPassword: () => void }) {
  const button = cn("inline-flex min-h-10 items-center gap-1.5 rounded-pill px-3 text-xs font-bold text-forest ring-1 ring-line hover:bg-white", focusRing)
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <button type="button" onClick={onEdit} className={button}>
        <Pencil aria-hidden="true" className="size-4" /> Edit <span className="sr-only">{user.name}</span>
      </button>
      {!isSelf ? (
        <button type="button" onClick={onPassword} className={button}>
          <KeyRound aria-hidden="true" className="size-4" /> Reset password <span className="sr-only">for {user.name}</span>
        </button>
      ) : null}
    </div>
  )
}

function PasswordField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Temporary password"
        value={value}
        onChange={onChange}
        error={error}
        hint="At least 12 characters. Pass it on privately (in person or by phone). They must choose their own password the first time they sign in."
      />
      <button
        type="button"
        onClick={() => onChange(temporaryPassword())}
        className={cn("inline-flex w-fit items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold text-teal-deep ring-1 ring-teal/30 hover:bg-teal-soft", focusRing)}
      >
        <Wand2 aria-hidden="true" className="size-4" /> Generate a strong password
      </button>
    </div>
  )
}

function CreateUser({ open, save, onClose }: { open: boolean; save: ReturnType<typeof useSave>; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "CONTENT_ADMIN", password: temporaryPassword() })
  const e = save.errors

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const done = await save.run(() => createAdminUser(form), { success: "Admin created", description: `${form.name} can now sign in with the temporary password.`, failure: "Admin not created", inline: true })
    if (done) onClose()
  }

  return (
    <EditorDrawer open={open} title="Add an admin" description="Give someone their own sign-in for this admin panel." busy={save.busy} error={save.formError} submitLabel="Create admin" onSubmit={submit} onClose={onClose}>
      <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={e.name} max={80} placeholder="e.g. Umesh Panpat" />
      <TextField label="Email (used to sign in)" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} error={e.email} max={254} />
      <SelectField label="Role" value={form.role} onChange={(role) => setForm({ ...form, role })} options={roleOptions} error={e.role} />
      <PasswordField value={form.password} onChange={(password) => setForm({ ...form, password })} error={e.password} />
    </EditorDrawer>
  )
}

function EditUser({ open, user, isSelf, save, onClose }: { open: boolean; user: AdminUser; isSelf: boolean; save: ReturnType<typeof useSave>; onClose: () => void }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role as string, isActive: user.isActive })
  const e = save.errors

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const changes: { name?: string; email?: string; role?: string; isActive?: boolean } = {}
    if (form.name !== user.name) changes.name = form.name
    if (form.email !== user.email) changes.email = form.email
    if (form.role !== user.role) changes.role = form.role
    if (form.isActive !== user.isActive) changes.isActive = form.isActive
    if (!Object.keys(changes).length) return onClose()
    const done = await save.run(() => updateAdminUser(user.id, changes), { success: "Admin updated", description: form.name, failure: "Admin not updated", inline: true })
    if (done) onClose()
  }

  return (
    <EditorDrawer open={open} title={`Edit ${user.name}`} busy={save.busy} error={save.formError} submitLabel="Save changes" onSubmit={submit} onClose={onClose}>
      <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={e.name} max={80} />
      <TextField
        label="Email (used to sign in)"
        type="email"
        value={form.email}
        onChange={(email) => setForm({ ...form, email })}
        error={e.email}
        max={254}
        hint={isSelf ? undefined : "Changing it signs them out; they sign in again with the new email."}
      />
      {isSelf ? (
        <p className="rounded-xl bg-stone p-3 text-sm text-muted">You can&apos;t change your own role or disable your own account. Ask another Super Admin.</p>
      ) : (
        <>
          <SelectField label="Role" value={form.role} onChange={(role) => setForm({ ...form, role })} options={roleOptions} error={e.role} hint="Changing the role signs them out so the new permissions apply at once." />
          <CheckField
            label="Account enabled"
            description={form.isActive ? "They can sign in." : "Disabled: they can't sign in and are signed out everywhere."}
            checked={form.isActive}
            onChange={(isActive) => setForm({ ...form, isActive })}
          />
        </>
      )}
    </EditorDrawer>
  )
}

function ResetPassword({ open, user, save, onClose }: { open: boolean; user: AdminUser; save: ReturnType<typeof useSave>; onClose: () => void }) {
  const [password, setPassword] = useState(temporaryPassword())

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const done = await save.run(() => resetAdminUserPassword(user.id, password), {
      success: "Temporary password set",
      description: `${user.name} has been signed out and must choose a new password.`,
      failure: "Password not reset",
      inline: true,
    })
    if (done) onClose()
  }

  return (
    <EditorDrawer
      open={open}
      title={`Reset password for ${user.name}`}
      description="Signs them out everywhere. They choose their own password at their next sign-in."
      busy={save.busy}
      error={save.formError}
      submitLabel="Set temporary password"
      onSubmit={submit}
      onClose={onClose}
    >
      <PasswordField value={password} onChange={setPassword} error={save.errors.password} />
    </EditorDrawer>
  )
}
