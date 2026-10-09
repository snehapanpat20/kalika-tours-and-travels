"use client"

import { useState, type ComponentPropsWithoutRef } from "react"
import { Eye, EyeOff } from "lucide-react"
import { focusRing } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

/**
 * A password box with a "show password" button, so people can check what they
 * typed. The password is only ever shown on this screen; nothing is stored.
 */
export function PasswordInput({ className, ...props }: Omit<ComponentPropsWithoutRef<"input">, "type">) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // Spell-check and autocorrect would send a visible password to the browser's dictionary
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={cn(className, "pr-12")}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
        title={visible ? "Hide password" : "Show password"}
        disabled={props.disabled}
        className={cn(
          "absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-forest/5 hover:text-forest disabled:opacity-50",
          focusRing,
        )}
      >
        {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  )
}
