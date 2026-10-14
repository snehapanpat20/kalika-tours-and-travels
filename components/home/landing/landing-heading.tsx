import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/**
 * A homepage section heading: a small label, then a serif title whose
 * highlighted word is set in the handwritten face (Kalam, which covers
 * Marathi too).
 */
export function LandingHeading({
  id,
  eyebrow,
  lead,
  accent,
  description,
  align = "left",
  tone = "light",
  action,
}: {
  id: string
  eyebrow: string
  lead: string
  accent: string
  description?: string
  align?: "left" | "center"
  /** "dark" for a heading on a dark section. */
  tone?: "light" | "dark"
  /** A link shown beside the heading on wide screens. */
  action?: ReactNode
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-5", align === "center" && "flex-col items-center text-center")}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <p className={cn("eyebrow", tone === "dark" ? "text-teal-light" : "text-teal-deep")}>{eyebrow}</p>
        <h2 id={id} className={cn("type-h2 mt-4", tone === "dark" ? "text-white" : "text-forest")}>
          {lead} <span className="landing-script">{accent}</span>
        </h2>
        {description ? <p className={cn("mt-4 text-[1.0625rem] leading-relaxed", tone === "dark" ? "text-white/75" : "text-muted")}>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

/** "View all …" style link with a nudging arrow. */
export function ArrowLink({ href, children, tone = "light", className }: { href: string; children: ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-11 items-center gap-2 font-medium underline-offset-4 hover:underline",
        tone === "dark" ? "text-teal-light" : "text-teal-deep",
        focusRing,
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" strokeWidth={2} className="nudge size-4" />
    </Link>
  )
}

/**
 * A thin jali-inspired divider: a row of small lattice diamonds between two
 * fine rules, drawn in the gold accent. Purely decorative.
 */
export function JaliDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex items-center justify-center gap-4 py-2 text-highlight", className)}>
      <span className="h-px w-16 bg-current opacity-50 sm:w-28" />
      <svg width="132" height="16" viewBox="0 0 132 16" fill="none" className="shrink-0">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${6 + i * 30} 0)`}>
            <path d="M10 1 19 8 10 15 1 8Z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10 5 13 8 10 11 7 8Z" fill="currentColor" opacity={i === 2 ? 1 : 0.55} />
          </g>
        ))}
      </svg>
      <span className="h-px w-16 bg-current opacity-50 sm:w-28" />
    </div>
  )
}
