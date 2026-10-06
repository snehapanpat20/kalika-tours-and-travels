import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Shown (with status 403) when a signed-in admin opens a page their role can't use. */
export default function AdminForbidden() {
  return (
    <div className="mx-auto grid max-w-lg justify-items-center gap-4 rounded-panel bg-ivory px-6 py-14 text-center shadow-soft ring-1 ring-line">
      <span className="grid size-14 place-items-center rounded-full bg-coral-soft text-coral">
        <ShieldAlert aria-hidden="true" className="size-7" />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight text-forest">Permission denied</h1>
      <p className="text-muted">Your account doesn&apos;t have access to this page. If you need it, ask the site administrator.</p>
      <Button href="/admin" variant="outline" arrow>
        Back to the dashboard
      </Button>
    </div>
  )
}
