import type { ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

type HeadingTag = "h1" | "h2" | "h3"

export function SectionHeading({
  eyebrow,
  title,
  description,
  as = "h2",
  inverse = false,
  align = "start",
  id,
  className,
  action,
}: {
  eyebrow?: string
  title: ReactNode
  description?: string
  as?: HeadingTag
  inverse?: boolean
  align?: "start" | "center"
  id?: string
  className?: string
  action?: ReactNode
}) {
  const Tag = as
  const centered = align === "center"

  return (
    <div
      className={cn(
        "flex flex-col gap-7",
        centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between md:gap-12",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow ? <p className={cn("eyebrow", inverse ? "text-white/70" : "text-teal-deep")}>{eyebrow}</p> : null}
        <Tag id={id} className={cn("type-h2", inverse ? "text-white" : "text-forest", eyebrow && "mt-4")}>
          {title}
        </Tag>
        {description ? (
          <p className={cn("type-lead mt-5 max-w-xl", centered && "mx-auto", inverse ? "text-white/75" : "text-muted")}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
