import { Spinner } from "@/components/ui/spinner"

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-sm font-medium text-forest">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}
