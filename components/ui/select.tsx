import type { ChangeEvent, ReactNode } from "react"
import { controlClass } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

type SelectProps = {
  id: string
  name?: string
  value?: string
  defaultValue?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  describedBy?: string
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
  className?: string
}

export function Select({
  id,
  name,
  value,
  defaultValue,
  disabled,
  required,
  invalid = false,
  describedBy,
  onChange,
  children,
  className,
}: SelectProps) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      required={required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={onChange}
      className={cn(controlClass, "appearance-none bg-[length:1rem] bg-[position:right_1rem_center] bg-no-repeat pr-11", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5 10 12.5 15 7.5' stroke='%23667085' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
      }}
    >
      {children}
    </select>
  )
}
