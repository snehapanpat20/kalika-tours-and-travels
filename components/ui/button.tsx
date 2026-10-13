import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

type Variant = "primary" | "secondary" | "outline" | "inverse" | "light"
type Size = "sm" | "md" | "lg"

const variantClass: Record<Variant, string> = {
  primary:
    "bg-coral text-on-coral shadow-[0_10px_24px_-12px_var(--kalika-coral-glow)] hover:bg-coral-deep hover:shadow-[0_14px_28px_-12px_var(--kalika-coral-glow)]",
  secondary: "bg-forest text-white hover:bg-forest-soft",
  outline: "bg-transparent text-forest ring-1 ring-forest/25 ring-inset hover:bg-forest/5 hover:ring-forest/45",
  inverse: "bg-transparent text-white ring-1 ring-white/40 ring-inset hover:bg-white/10 hover:ring-white/70",
  light: "bg-white text-forest hover:bg-ivory",
}

const sizeClass: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-[0.9375rem] sm:min-h-13 sm:px-7",
}

type ButtonProps = {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
  href?: string
  type?: "button" | "submit" | "reset"
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  /** Trailing arrow that nudges forward on hover. */
  arrow?: boolean
  /** Leading icon element. */
  icon?: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  arrow = false,
  icon,
}: ButtonProps) {
  const classes = cn(
    "group inline-flex items-center justify-center gap-2.5 rounded-button font-bold whitespace-nowrap transition duration-300 ease-out motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60",
    focusRing,
    variantClass[variant],
    sizeClass[size],
    className,
  )
  const content = (
    <>
      {loading ? <Spinner /> : icon}
      <span>{children}</span>
      {arrow ? <ArrowRight aria-hidden="true" strokeWidth={2.2} className="nudge -mr-1 size-4 shrink-0" /> : null}
    </>
  )

  if (href && !disabled && !loading) {
    if (/^(https?:|tel:|mailto:)/.test(href)) {
      const external = href.startsWith("http")
      return (
        <a href={href} className={classes} onClick={onClick} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {content}
        </a>
      )
    }

    return (
      <Link href={href} className={classes} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined}>
      {content}
    </button>
  )
}
