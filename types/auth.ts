import type { Locale } from "@/lib/i18n/locales"

export const userRoles = ["customer", "admin"] as const
export type UserRole = (typeof userRoles)[number]

export const userStatuses = ["active", "disabled"] as const
export type UserStatus = (typeof userStatuses)[number]

export type Session = {
  userId: string
  role: UserRole
  expiresAt: string
}

export type UserRecord = {
  id: string
  role: UserRole
  status: UserStatus
  name: string
  email: string
  phone: string | null
  passwordHash: string
  locale: Locale
  createdAt: string
  updatedAt: string
}

export type PublicUser = Omit<UserRecord, "passwordHash">
