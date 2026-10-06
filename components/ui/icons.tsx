import type { SVGProps } from "react"

type IconProps = { className?: string }

function Stroke({ className, children, ...rest }: IconProps & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.16-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.06.89.9-2.98-.2-.31a8.2 8.2 0 1 1 6.84 3.73Zm4.5-6.13c-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.13-.16.24-.63.8-.77.96-.14.17-.28.19-.53.06a6.7 6.7 0 0 1-1.97-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.66.31 2.77 2.77 0 0 0-.86 2.06 4.8 4.8 0 0 0 1 2.56 11 11 0 0 0 4.22 3.73c.59.25 1.05.4 1.4.52.6.19 1.13.16 1.56.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  )
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </Stroke>
  )
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M5 4h3.2l1.6 4-2 1.3a11 11 0 0 0 5 5l1.3-2 4 1.6V17a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </Stroke>
  )
}

export function MailIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </Stroke>
  )
}

export function PinIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </Stroke>
  )
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Stroke>
  )
}

export function UsersIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3.2 2.9-5 5.5-5s4.7 1.8 5.5 5" />
      <path d="M15.5 5.2a3 3 0 0 1 0 5.6M17 14.2c1.9.5 3.1 2.1 3.5 4.8" />
    </Stroke>
  )
}

export function SnowIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" />
    </Stroke>
  )
}

export function SteeringIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M3.8 10.5c2.6-.9 5.4-1.3 8.2-1.3s5.6.4 8.2 1.3M10.2 13.6 7 19.6M13.8 13.6l3.2 6" />
    </Stroke>
  )
}

export function SeatIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M7 4.5h4a1.5 1.5 0 0 1 1.5 1.6l-.6 7.4H17a2 2 0 0 1 2 2v1.5H7.5a2 2 0 0 1-2-2.1L5.5 6A1.5 1.5 0 0 1 7 4.5Z" />
      <path d="M8 17v3M17 17v3" />
    </Stroke>
  )
}

export function LuggageIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="6" y="7" width="12" height="13" rx="2" />
      <path d="M9.5 7V4.5h5V7M10 11v5M14 11v5" />
    </Stroke>
  )
}

export function MusicIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </Stroke>
  )
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2L12 3.5Z" />
    </Stroke>
  )
}

export function WindowIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <rect x="3.5" y="5" width="17" height="11" rx="2" />
      <path d="M12 5v11M3.5 19.5h17" />
    </Stroke>
  )
}

export function LegroomIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" />
    </Stroke>
  )
}

export function RouteIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16" />
    </Stroke>
  )
}

export function HeartIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" />
    </Stroke>
  )
}

export function QuoteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M13 8c-4.4 1.6-7 5.2-7 10v6h8v-8h-4c0-2.9 1.4-5 4.2-6.2L13 8Zm13 0c-4.4 1.6-7 5.2-7 10v6h8v-8h-4c0-2.9 1.4-5 4.2-6.2L26 8Z" />
    </svg>
  )
}
