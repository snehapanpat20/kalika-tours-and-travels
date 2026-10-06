import Link from "next/link"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/** Pill tabs that filter a list through the URL (?status=…), with counts. */
export function StatusTabs({ label, tabs, current }: { label: string; tabs: { key: string; label: string; href: string; count?: number; highlight?: boolean }[]; current: string }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1">
      <ul className="flex gap-2">
        {tabs.map((tab) => {
          const active = tab.key === current
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-bold whitespace-nowrap ring-1 transition-colors",
                  active ? "bg-forest text-white ring-forest" : "bg-ivory text-forest ring-line hover:ring-forest/30",
                  focusRing,
                )}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.6875rem]",
                      active ? "bg-white/15" : tab.highlight && tab.count > 0 ? "bg-coral text-forest-deep" : "bg-stone-deep text-muted",
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
