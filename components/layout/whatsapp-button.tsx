import { WhatsAppIcon } from "@/components/ui/icons"
import { focusRing } from "@/components/ui/styles"
import { business } from "@/data/business"
import { cn } from "@/lib/utils/cn"

/** Always-available WhatsApp shortcut, bottom-right. */
export function WhatsAppButton({ label }: { label: string }) {
  return (
    <a
      href={business.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        "group fixed right-4 bottom-4 z-30 inline-flex items-center rounded-full bg-whatsapp text-white shadow-[0_14px_30px_-12px_rgb(7_42_36/0.6)] transition-[background-color,transform] duration-300 hover:bg-[#1a8a4a] motion-safe:hover:-translate-y-0.5 sm:right-6 sm:bottom-6",
        "motion-safe:animate-[pop-in_600ms_cubic-bezier(0.22,1,0.36,1)_1.4s_both]",
        focusRing,
      )}
    >
      <span className="inline-flex size-14 items-center justify-center sm:size-12">
        <WhatsAppIcon className="size-7 sm:size-6" />
      </span>
      <span
        aria-hidden="true"
        className="hidden max-w-0 overflow-hidden text-sm font-bold whitespace-nowrap opacity-0 transition-[max-width,opacity,padding] duration-500 ease-out group-hover:max-w-40 group-hover:pr-5 group-hover:opacity-100 group-focus-visible:max-w-40 group-focus-visible:pr-5 group-focus-visible:opacity-100 lg:block"
      >
        {label}
      </span>
    </a>
  )
}
