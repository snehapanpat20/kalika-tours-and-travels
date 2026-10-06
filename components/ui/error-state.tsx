import type { ReactNode } from "react"

export function ErrorState({
  title,
  description,
  action,
  heading = "h2",
}: {
  title: string
  description?: string
  action?: ReactNode
  heading?: "h1" | "h2"
}) {
  const Tag = heading

  return (
    <div role="alert" className="rounded-card border border-danger/20 bg-danger-soft px-6 py-8">
      <Tag className="font-display text-2xl font-semibold text-danger">{title}</Tag>
      {description ? <p className="mt-2 max-w-xl text-sm leading-6 text-ink">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
