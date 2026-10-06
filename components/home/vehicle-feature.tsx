import type { Icon } from "@/components/home/home-content"

export function VehicleFeature({ icon: IconComponent, label }: { icon: Icon; label: string }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/8 text-teal-light ring-1 ring-white/10">
        <IconComponent aria-hidden="true" strokeWidth={1.7} className="size-[1.125rem]" />
      </span>
      <span className="text-[0.9375rem] font-semibold text-white/90">{label}</span>
    </div>
  )
}
