"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Spinner } from "@/components/ui/spinner"
import { focusRing } from "@/components/ui/styles"
import { TextField } from "@/components/admin/kit/form-controls"
import { useSave } from "@/components/admin/kit/use-save"
import { changeOwnPassword, updateOwnProfile } from "@/lib/api/admin"
import { cn } from "@/lib/utils/cn"

const submitClass = cn("inline-flex min-h-11 w-fit items-center gap-2 rounded-pill bg-forest px-5 text-sm font-bold text-white hover:bg-forest-soft disabled:opacity-60", focusRing)

export function ProfileForm({ name }: { name: string }) {
  const save = useSave()
  const [value, setValue] = useState(name)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await save.run(() => updateOwnProfile(value), { success: "Profile updated", failure: "Profile not updated", inline: true })
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <TextField label="Your name" value={value} onChange={setValue} error={save.errors.name} max={80} hint="Shown in the admin panel and the activity log." />
      {save.formError ? <p role="alert" className="text-sm font-semibold text-danger">{save.formError}</p> : null}
      <button type="submit" disabled={save.busy || value.trim() === name} className={submitClass}>
        {save.busy ? <Spinner /> : null} Save name
      </button>
    </form>
  )
}

/** Needs the current password. Other signed-in devices are signed out afterwards. */
export function PasswordForm({ setup }: { setup: boolean }) {
  const save = useSave()
  const router = useRouter()
  const [form, setForm] = useState({ current: "", next: "", repeat: "" })
  const [mismatch, setMismatch] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMismatch(form.next !== form.repeat ? "The two new passwords don't match." : null)
    if (form.next !== form.repeat) return
    const done = await save.run(() => changeOwnPassword(form.current, form.next), {
      success: "Password changed",
      description: setup ? "Welcome! You can now use the admin panel." : "Other devices have been signed out.",
      failure: "Password not changed",
      inline: true,
    })
    if (done) {
      setForm({ current: "", next: "", repeat: "" })
      if (setup) router.replace("/admin")
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <TextField
        label={setup ? "Temporary password" : "Current password"}
        type="password"
        value={form.current}
        onChange={(current) => setForm({ ...form, current })}
        error={save.errors.currentPassword}
      />
      <TextField label="New password" type="password" value={form.next} onChange={(next) => setForm({ ...form, next })} error={save.errors.newPassword} hint="At least 12 characters. A short sentence is easy to remember and hard to guess." />
      <TextField label="Repeat new password" type="password" value={form.repeat} onChange={(repeat) => setForm({ ...form, repeat })} error={mismatch ?? undefined} />
      {save.formError ? <p role="alert" className="text-sm font-semibold text-danger">{save.formError}</p> : null}
      <button type="submit" disabled={save.busy} className={submitClass}>
        {save.busy ? <Spinner /> : null} {setup ? "Set my password" : "Change password"}
      </button>
    </form>
  )
}
