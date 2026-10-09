import type { ChangeEvent } from "react"
import { PasswordInput } from "@/components/ui/password-input"
import { controlClass } from "@/components/ui/styles"
import { cn } from "@/lib/utils/cn"

type InputProps = {
  id: string
  name?: string
  type?: "text" | "email" | "tel" | "password" | "search" | "date" | "number"
  min?: string | number
  max?: string | number
  step?: string | number
  value?: string
  defaultValue?: string
  placeholder?: string
  autoComplete?: string
  inputMode?: "numeric" | "tel" | "email" | "text"
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  describedBy?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  className?: string
}

export function Input({
  id,
  name,
  type = "text",
  value,
  defaultValue,
  placeholder,
  autoComplete,
  inputMode,
  disabled,
  required,
  invalid = false,
  describedBy,
  onChange,
  min,
  max,
  step,
  className,
}: InputProps) {
  if (type === "password") {
    return (
      <PasswordInput
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={onChange}
        className={cn(controlClass, className)}
      />
    )
  }
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputMode={inputMode}
      disabled={disabled}
      required={required}
      min={min}
      max={max}
      step={step}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={onChange}
      className={cn(controlClass, className)}
    />
  )
}
