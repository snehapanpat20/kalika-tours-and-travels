import type { ChangeEvent } from "react"
import { controlClass } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

type TextareaProps = {
  id: string
  name?: string
  value?: string
  defaultValue?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  describedBy?: string
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void
  className?: string
}

export function Textarea({
  id,
  name,
  value,
  defaultValue,
  placeholder,
  rows = 4,
  disabled,
  required,
  invalid = false,
  describedBy,
  onChange,
  className,
}: TextareaProps) {
  return (
    <textarea
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      required={required}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={onChange}
      className={cn(controlClass, "min-h-28 resize-y", className)}
    />
  )
}
