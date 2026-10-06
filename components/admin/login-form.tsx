"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"

/**
 * Posts to the existing login endpoint. The server sets an HttpOnly session
 * cookie; nothing is stored in the browser by this form.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (!email.trim() || !password) {
      setError("Enter your email and password.")
      return
    }
    setPending(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      router.replace(next)
      router.refresh()
    } catch (caught) {
      setPending(false)
      setPassword("")
      if (caught instanceof ApiError && caught.status === 401) setError("Incorrect email or password.")
      else if (caught instanceof ApiError && caught.status === 429) setError("Too many attempts. Please wait 15 minutes and try again.")
      else if (caught instanceof ApiError && (caught.code === "NETWORK" || caught.code === "TIMEOUT")) setError("Could not reach the server. Check your connection.")
      else setError("Sign in failed. Please try again.")
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5" aria-busy={pending || undefined}>
      <Field label="Email">
        {(field) => (
          <Input id={field.id} name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
        )}
      </Field>
      <Field label="Password">
        {(field) => (
          <Input
            id={field.id}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>
      <div aria-live="assertive">
        {error ? <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p> : null}
      </div>
      <Button type="submit" size="lg" loading={pending} className="w-full" icon={<LogIn aria-hidden="true" className="size-[1.125rem]" />}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
