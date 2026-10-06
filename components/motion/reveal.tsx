"use client"

import type { ReactNode } from "react"
import { m, useReducedMotion, type Variants } from "motion/react"

export const easeOut = [0.22, 1, 0.36, 1] as const

const tags = {
  div: m.div,
  li: m.li,
  ul: m.ul,
  ol: m.ol,
  figure: m.figure,
  article: m.article,
} as const

type Tag = keyof typeof tags

const viewport = { once: true, amount: 0.25 } as const

/** Fades and rises into place the first time it scrolls into view. */
export function Reveal({
  children,
  as = "div",
  className,
  delay = 0,
  y = 28,
  x = 0,
  duration = 0.8,
}: {
  children: ReactNode
  as?: Tag
  className?: string
  delay?: number
  y?: number
  x?: number
  duration?: number
}) {
  const Component = tags[as]
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={viewport}
      transition={{ duration, delay, ease: easeOut }}
    >
      {children}
    </Component>
  )
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
}

/** Parent that reveals its StaggerItem children one after another. */
export function Stagger({
  children,
  as = "div",
  className,
  stagger = 0.09,
  delay = 0,
}: {
  children: ReactNode
  as?: Tag
  className?: string
  stagger?: number
  delay?: number
}) {
  const Component = tags[as]
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {children}
    </Component>
  )
}

export function StaggerItem({ children, as = "div", className }: { children: ReactNode; as?: Tag; className?: string }) {
  const Component = tags[as]
  return (
    <Component className={className} variants={itemVariants}>
      {children}
    </Component>
  )
}

/** Unmasks a photograph from a slightly inset frame while it settles from a gentle zoom. */
export function ImageReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion()

  if (reduce) return <div className={className}>{children}</div>

  return (
    <m.div
      className={className}
      initial={{ clipPath: "inset(6% 6% 6% 6% round 1.25rem)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0% round 1.25rem)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.1, delay, ease: easeOut }}
    >
      <m.div
        className="absolute inset-0"
        initial={{ scale: 1.1 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.4, delay, ease: easeOut }}
      >
        {children}
      </m.div>
    </m.div>
  )
}
