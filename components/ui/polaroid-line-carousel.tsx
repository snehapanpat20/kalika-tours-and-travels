"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"

/*
 * Polaroid Line Carousel: instant photos pegged to a sagging string. Drag the
 * line (or use the arrows) and the prints slide along it, swinging on their
 * pegs with the speed you give them and settling back with a little
 * overshoot; even at rest they sway in a light breeze. The one in the middle
 * is the one you're looking at.
 *
 * Drag, click a print, ←/→ and autoplay. Autoplay waits while someone is
 * hovering, focused inside or has just interacted, and is off entirely for
 * visitors who prefer reduced motion (the swing is too).
 */

export type PolaroidSlide = {
  key: string
  /** Image address, already resolved on the server. */
  image: string
  /** CSS object-position, to keep the subject in frame. */
  position?: string
  alt: string
  title: string
  caption?: string
  /** Where the print leads, and what its link says. */
  href?: string
  linkLabel?: string
}

export type PolaroidLineCarouselProps = {
  slides: PolaroidSlide[]
  /** Name of the carousel for assistive technology. */
  ariaLabel: string
  /** Labels of the arrow buttons. */
  previous: string
  next: string
  /** Announced when the print changes, e.g. "Photo {current} of {total}". */
  counter: string
  /** Any CSS length. */
  height?: number | string
  /** Width of a print in px (it shrinks on narrow screens). */
  cardWidth?: number
  /** How far the string sags in the middle, px. */
  sag?: number
  /** How much the prints swing; 0 holds them still. */
  swing?: number
  /** ms per print; 0 turns autoplay off. */
  autoplay?: number
  /** Colour of the string. */
  string?: string
  background?: string
  ink?: string
  className?: string
}

// #region logic
export function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

/** Height of a string sagging by `sag` between (0, y0) and (w, y0), at x. */
export function stringY(x: number, w: number, y0: number, sag: number): number {
  const t = clamp(x / w, 0, 1)
  return y0 + 4 * sag * t * (1 - t)
}

/** One step of a critically damped spring toward target. */
export function springStep(x: number, v: number, target: number, dt: number, k = 70): [number, number] {
  const c = 2 * Math.sqrt(k)
  const nv = v + (k * (target - x) - c * v) * dt
  return [x + nv * dt, nv]
}

/** One step of a print's swing. lineVel is the prints' on-screen speed (px/s, + = moving right); a print lags behind the motion, is pulled back by gravity and damped. */
export function swingStep(a: number, w: number, lineVel: number, dt: number, gain: number): [number, number] {
  const nw = w + (-38 * a - 4.2 * w + lineVel * 0.0034 * gain) * dt
  return [clamp(a + nw * dt, -0.6, 0.6), nw]
}

/** Index of the print nearest the centre for a line offset. */
export function nearestAt(off: number, spacing: number, n: number): number {
  return clamp(Math.round(off / spacing), 0, Math.max(0, n - 1))
}

export function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n)
}
// #endregion logic

const PL_CSS = [
  ".pl-root{position:relative;width:100%;overflow:hidden;background:var(--pl-bg);color:var(--pl-ink);user-select:none;-webkit-user-select:none;touch-action:pan-y;outline:none;cursor:grab}",
  ".pl-root[data-drag='1']{cursor:grabbing}",
  ".pl-root:focus-visible{box-shadow:inset 0 0 0 2px var(--pl-ink)}",
  ".pl-string{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible}",
  ".pl-card{position:absolute;left:0;top:0;width:var(--pl-cw);transform-origin:50% 0;will-change:transform;cursor:inherit}",
  ".pl-print{margin-top:10px;background:#fbfaf7;padding:10px 10px 0;box-shadow:0 1px 2px rgba(0,0,0,.12),0 18px 30px -16px rgba(0,0,0,.4);transition:transform .5s cubic-bezier(.2,.7,.2,1),filter .5s ease}",
  ".pl-card[data-on='0'] .pl-print{transform:scale(.9);filter:saturate(.7) brightness(.96)}",
  ".pl-shot{position:relative;aspect-ratio:1;overflow:hidden;background:#d9d5cc}",
  ".pl-shot img{object-fit:cover;pointer-events:none}",
  ".pl-note{height:46px;display:flex;align-items:center;justify-content:center;padding:0 6px;font-family:var(--kalika-font-display);font-style:italic;font-weight:500;font-size:18px;line-height:1.1;color:#3b3833;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".pl-peg{position:absolute;left:50%;top:0;width:10px;height:26px;margin-left:-5px;border-radius:2px;background:linear-gradient(90deg,#c9a67a,#e3c9a1 45%,#b8915f);box-shadow:0 2px 3px rgba(0,0,0,.25)}",
  ".pl-peg::after{content:'';position:absolute;left:4px;top:8px;width:2px;height:7px;background:rgba(80,60,30,.45);border-radius:1px}",
  ".pl-bar{position:absolute;left:clamp(16px,4vw,56px);right:clamp(16px,4vw,56px);bottom:clamp(16px,3vh,32px);display:flex;flex-wrap:wrap;align-items:center;gap:10px clamp(12px,2vw,24px);cursor:default}",
  ".pl-cap{flex:1 1 12rem;min-width:0;overflow:hidden;padding-bottom:.15em}",
  ".pl-cap>*{display:block;animation:pl-in .55s cubic-bezier(.2,.8,.2,1) both}",
  ".pl-title{font-family:var(--kalika-font-display);font-weight:600;font-size:clamp(22px,2.4vw,30px);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".pl-sub{margin-top:4px;font-family:var(--kalika-font-body);font-size:14px;line-height:1.4;color:var(--pl-muted)}",
  ".pl-count{font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;color:var(--pl-muted)}",
  ".pl-count b{color:var(--pl-ink);font-weight:500}",
  ".pl-link{display:inline-flex;align-items:center;min-height:40px;padding:0 18px;border-radius:999px;background:var(--pl-accent);color:var(--pl-on-accent);font-family:var(--kalika-font-body);font-size:14px;font-weight:500;white-space:nowrap;transition:filter .2s ease}",
  ".pl-link:hover{filter:brightness(.9)}",
  ".pl-link:focus-visible{outline:2px solid var(--pl-ink);outline-offset:2px}",
  ".pl-btn{appearance:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--pl-line);background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;transition:background .2s ease,color .2s ease}",
  ".pl-btn:hover{background:var(--pl-ink);color:var(--pl-bg)}",
  ".pl-btn:focus-visible{outline:2px solid var(--pl-ink);outline-offset:2px}",
  ".pl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
  "@keyframes pl-in{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}",
  "@media (max-width:40rem){.pl-count{display:none}}",
  "@media (prefers-reduced-motion:reduce){.pl-cap>*{animation:none}.pl-print{transition:none}}",
].join("\n")

export function PolaroidLineCarousel({
  slides,
  ariaLabel,
  previous,
  next,
  counter,
  height = "clamp(34rem, 78svh, 42rem)",
  cardWidth = 300,
  sag = 46,
  swing = 1,
  autoplay = 4500,
  string = "var(--kalika-muted)",
  background = "var(--kalika-stone)",
  ink = "var(--kalika-ink)",
  className,
}: PolaroidLineCarouselProps) {
  const n = slides.length
  const [active, setActive] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [size, setSize] = useState({ w: 1200, h: 640, cw: cardWidth })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const pathRef = useRef<SVGPathElement | null>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const sim = useRef({ off: 0, vel: 0, target: 0, a: [] as number[], w: [] as number[] })
  const drag = useRef<null | { x: number; off: number; lx: number; lt: number; v: number; moved: boolean }>(null)
  const lastTouch = useRef(0)
  /** True while the pointer is over the carousel or focus is inside it: autoplay waits. */
  const held = useRef({ hover: false, focus: false })
  const activeRef = useRef(0)

  const spacing = size.cw * 1.08
  const goTo = useCallback(
    (i: number) => {
      sim.current.target = clamp(i, 0, n - 1) * spacing
    },
    [n, spacing],
  )

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ro = new ResizeObserver(() => {
      const r = root.getBoundingClientRect()
      const cw = Math.round(Math.max(150, Math.min(cardWidth, r.width * 0.42, r.height * 0.42)))
      setSize({ w: r.width, h: r.height, cw })
    })
    ro.observe(root)
    return () => ro.disconnect()
  }, [cardWidth])

  // Keep the line on the active print when the spacing changes
  useEffect(() => {
    sim.current.target = activeRef.current * spacing
    sim.current.off = activeRef.current * spacing
  }, [spacing])

  // The simulation, written straight to the DOM each frame
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let visible = true
    let raf = 0
    let prev = performance.now()
    const S = sim.current
    const gain = reduce ? 0 : swing
    const frame = (now: number) => {
      raf = 0
      if (!visible) return
      const dt = Math.min(0.033, (now - prev) / 1000)
      prev = now
      const { w, h, cw } = size
      const y0 = Math.max(40, h * 0.16)
      const d = drag.current
      let lineVel: number
      if (d && d.moved) {
        lineVel = d.v * 1000
      } else {
        const before = S.off
        ;[S.off, S.vel] = reduce ? [S.target, 0] : springStep(S.off, S.vel, S.target, dt)
        lineVel = -(S.off - before) / Math.max(dt, 1e-3)
      }
      const near = nearestAt(S.off, spacing, n)
      for (let i = 0; i < n; i++) {
        const el = cards.current[i]
        if (!el) continue
        const x = w / 2 + i * spacing - S.off
        if (x < -cw * 1.5 || x > w + cw * 1.5) {
          el.style.visibility = "hidden"
          continue
        }
        el.style.visibility = "visible"
        let a = S.a[i] || 0
        let av = S.w[i] || 0
        ;[a, av] = swingStep(a, av, lineVel, dt, gain)
        if (gain) a += Math.sin(now / 1300 + i * 1.7) * 0.0009 * gain
        S.a[i] = a
        S.w[i] = av
        const y = stringY(x, w, y0, sag) - 6
        el.style.transform = "translate(" + (x - cw / 2).toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + a.toFixed(4) + "rad)"
        el.style.zIndex = String(i === near ? n + 1 : n - Math.abs(i - near))
      }
      pathRef.current?.setAttribute("d", "M0 " + y0 + " Q" + w / 2 + " " + (y0 + 2 * sag) + " " + w + " " + y0)
      if (near !== activeRef.current) {
        activeRef.current = near
        setActive(near)
      }
      raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !raf) {
        prev = performance.now()
        raf = requestAnimationFrame(frame)
      }
    })
    io.observe(root)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [size, spacing, n, sag, swing])

  // Autoplay, back to the first print after the last
  useEffect(() => {
    if (!autoplay || n < 2) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => {
      if (document.hidden || drag.current || held.current.hover || held.current.focus) return
      if (performance.now() - lastTouch.current < autoplay) return
      goTo(activeRef.current >= n - 1 ? 0 : activeRef.current + 1)
    }, autoplay)
    return () => window.clearInterval(timer)
  }, [autoplay, n, goTo])

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".pl-bar")) return
    lastTouch.current = performance.now()
    drag.current = { x: event.clientX, off: sim.current.off, lx: event.clientX, lt: event.timeStamp, v: 0, moved: false }
  }
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.x
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true
      setDragging(true)
      try {
        rootRef.current?.setPointerCapture(event.pointerId)
      } catch {
        // Not every pointer can be captured; the drag still works over the carousel
      }
    }
    if (!d.moved) return
    const dt = Math.max(1, event.timeStamp - d.lt)
    d.v = 0.7 * ((event.clientX - d.lx) / dt) + 0.3 * d.v
    d.lx = event.clientX
    d.lt = event.timeStamp
    const max = (n - 1) * spacing
    let off = d.off - dx
    if (off < 0) off *= 0.35
    if (off > max) off = max + (off - max) * 0.35
    sim.current.off = off
  }
  const onUp = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    lastTouch.current = performance.now()
    if (!d) return
    if (d.moved) {
      setDragging(false)
      sim.current.vel = -d.v * 1000
      goTo(nearestAt(sim.current.off - d.v * 180, spacing, n))
      return
    }
    const card = (event.target as HTMLElement).closest("[data-i]")
    if (card) goTo(Number(card.getAttribute("data-i")))
  }
  const step = (direction: number) => {
    lastTouch.current = performance.now()
    goTo(clamp(activeRef.current + direction, 0, n - 1))
  }
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") step(1)
    else if (event.key === "ArrowLeft") step(-1)
    else return
    event.preventDefault()
  }

  if (!n) return null
  const current = slides[active] ?? slides[0]
  const rootStyle = {
    height,
    "--pl-bg": background,
    "--pl-ink": ink,
    "--pl-muted": "color-mix(in srgb, var(--pl-ink) 62%, transparent)",
    "--pl-line": "color-mix(in srgb, var(--pl-ink) 22%, transparent)",
    "--pl-accent": "var(--kalika-coral)",
    "--pl-on-accent": "var(--kalika-on-coral)",
    "--pl-cw": size.cw + "px",
  } as CSSProperties

  return (
    <div
      ref={rootRef}
      className={["pl-root", className].filter(Boolean).join(" ")}
      style={rootStyle}
      data-drag={dragging ? "1" : "0"}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerEnter={() => (held.current.hover = true)}
      onPointerLeave={() => (held.current.hover = false)}
      onFocus={() => (held.current.focus = true)}
      onBlur={() => (held.current.focus = false)}
    >
      <style>{PL_CSS}</style>
      <svg className="pl-string" aria-hidden="true">
        <path ref={pathRef} fill="none" stroke={string} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {slides.map((slide, i) => (
        <div
          key={slide.key}
          className="pl-card"
          data-i={i}
          data-on={i === active ? "1" : "0"}
          ref={(element) => {
            cards.current[i] = element
          }}
          aria-hidden={i === active ? undefined : true}
        >
          <div className="pl-print">
            <div className="pl-shot">
              <Image src={slide.image} alt={slide.alt || slide.title} fill sizes="300px" draggable={false} style={slide.position ? { objectPosition: slide.position } : undefined} />
            </div>
            <div className="pl-note">{slide.title}</div>
          </div>
          <div className="pl-peg" />
        </div>
      ))}
      <div className="pl-bar">
        <div className="pl-cap" key={active} aria-hidden="true">
          <span className="pl-title">{current.title}</span>
          {current.caption ? <span className="pl-sub">{current.caption}</span> : null}
        </div>
        <span className="pl-count" aria-hidden="true">
          <b>{pad2(active + 1)}</b> / {pad2(n)}
        </span>
        {current.href && current.linkLabel ? (
          <Link href={current.href} className="pl-link">
            {current.linkLabel}
            <span className="pl-sr">: {current.title}</span>
          </Link>
        ) : null}
        <button type="button" className="pl-btn" aria-label={previous} onClick={() => step(-1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <button type="button" className="pl-btn" aria-label={next} onClick={() => step(1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
      <div className="pl-sr" aria-live="polite">
        {counter.replace("{current}", String(active + 1)).replace("{total}", String(n))}: {current.title}
      </div>
    </div>
  )
}
