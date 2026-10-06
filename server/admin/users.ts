import "server-only"
import { z } from "zod"
import type { Admin, AdminRole, Prisma } from "@/generated/prisma/client"
import { adminRoles } from "@/lib/auth/permissions"
import { AppError } from "@/lib/errors/app-error"
import { cleanText } from "@/lib/validation/enquiry"
import { assertNotRateLimited, enforceRateLimit, rateLimits } from "@/server/api/rate-limit"
import type { AdminProfile } from "@/server/auth/admin-session"
import { refreshSession } from "@/server/auth/admin-session"
import { MIN_ADMIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/server/auth/password"
import { listQueryBase, paginate } from "@/server/cms/entity-helpers"
import { getPrisma } from "@/server/db/prisma"

// ─── Validation ───────────────────────────────────────────────

const name = z
  .string({ error: "Enter a name." })
  .max(160)
  .transform((value) => cleanText(value))
  .pipe(z.string().min(2, { error: "Enter a name of at least 2 characters." }).max(80, { error: "Name must be 80 characters or fewer." }))

const email = z.string({ error: "Enter an email address." }).trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address." }).max(254))

export const newPassword = z
  .string({ error: "Enter a password." })
  .min(MIN_ADMIN_PASSWORD_LENGTH, { error: `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.` })
  .max(200, { error: "Use 200 characters or fewer." })

const role = z.enum(adminRoles, { error: "Choose a role." })

export const userCreateSchema = z.object({ name, email, role, password: newPassword }).strict()
export const userUpdateSchema = z
  .object({ name, email, role, isActive: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update." })
export const passwordResetSchema = z.object({ password: newPassword }).strict()

export const userListSchema = z.object({
  ...listQueryBase,
  role: role.optional(),
  status: z.enum(["active", "disabled"]).optional(),
})

export const profileUpdateSchema = z.object({ name }).strict()
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string({ error: "Enter your current password." }).min(1, { error: "Enter your current password." }).max(200),
    newPassword,
  })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, { path: ["newPassword"], error: "Choose a password different from the current one." })

// ─── Output: never the password hash or token version ─────────

export function serializeAdmin(admin: Admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    mustChangePassword: admin.mustChangePassword,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
  }
}

export type AdminUser = ReturnType<typeof serializeAdmin>

// ─── Super Admin: manage admins ───────────────────────────────

export async function listAdmins(query: z.infer<typeof userListSchema>) {
  const where: Prisma.AdminWhereInput = {}
  if (query.role) where.role = query.role
  if (query.status) where.isActive = query.status === "active"
  const search = query.search?.trim()
  if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }]
  const prisma = getPrisma()
  const [total, rows] = await prisma.$transaction([
    prisma.admin.count({ where }),
    prisma.admin.findMany({ where, orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ])
  return paginate(rows.map(serializeAdmin), total, query.page, query.pageSize)
}

const emailTaken = () => new AppError("CONFLICT", "An admin with this email already exists.", 409, [{ field: "email", message: "An admin with this email already exists." }])

/** New admins must choose their own password the first time they sign in. */
export async function createAdmin(input: z.infer<typeof userCreateSchema>) {
  const prisma = getPrisma()
  if (await prisma.admin.findUnique({ where: { email: input.email } })) throw emailTaken()
  const admin = await prisma.admin.create({
    data: { name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password), mustChangePassword: true },
  })
  return serializeAdmin(admin)
}

async function findAdmin(id: string) {
  const admin = await getPrisma().admin.findUnique({ where: { id } })
  if (!admin) throw new AppError("NOT_FOUND", "Admin not found.", 404)
  return admin
}

/** There must always be at least one enabled Super Admin, or nobody could manage admins. */
async function assertAnotherActiveSuperAdmin(excludingId: string) {
  const others = await getPrisma().admin.count({ where: { role: "SUPER_ADMIN", isActive: true, id: { not: excludingId } } })
  if (others === 0) throw new AppError("CONFLICT", "There must always be at least one active Super Admin.", 409)
}

export async function updateAdmin(actor: AdminProfile, id: string, input: z.infer<typeof userUpdateSchema>) {
  const existing = await findAdmin(id)
  const self = actor.id === id
  if (self && input.role !== undefined && input.role !== existing.role) {
    throw new AppError("FORBIDDEN", "You can't change your own role. Ask another Super Admin.", 403)
  }
  if (self && input.isActive === false) throw new AppError("FORBIDDEN", "You can't disable your own account.", 403)

  const losesSuperAdmin =
    existing.role === "SUPER_ADMIN" && existing.isActive && ((input.role !== undefined && input.role !== "SUPER_ADMIN") || input.isActive === false)
  if (losesSuperAdmin) await assertAnotherActiveSuperAdmin(id)

  if (input.email && input.email !== existing.email && (await getPrisma().admin.findUnique({ where: { email: input.email } }))) throw emailTaken()

  // Changing role, disabling or changing the sign-in email ends their current sessions
  const signOut = (input.role !== undefined && input.role !== existing.role) || input.isActive === false || (input.email !== undefined && input.email !== existing.email)
  const admin = await getPrisma().admin.update({
    where: { id },
    data: { ...input, ...(signOut ? { tokenVersion: { increment: 1 } } : {}) },
  })
  return { before: serializeAdmin(existing), admin: serializeAdmin(admin) }
}

/** Sets a temporary password; the admin must change it at next sign-in. Signs them out everywhere. */
export async function resetAdminPassword(actor: AdminProfile, id: string, password: string) {
  const existing = await findAdmin(id)
  if (actor.id === id) throw new AppError("FORBIDDEN", "Change your own password from My account.", 403)
  const admin = await getPrisma().admin.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true, tokenVersion: { increment: 1 } },
  })
  return { before: serializeAdmin(existing), admin: serializeAdmin(admin) }
}

// ─── Every admin: their own account ───────────────────────────

export async function updateOwnProfile(actor: AdminProfile, input: z.infer<typeof profileUpdateSchema>) {
  return serializeAdmin(await getPrisma().admin.update({ where: { id: actor.id }, data: { name: input.name } }))
}

/**
 * Needs the current password. Signs out every other session, then gives
 * this browser a fresh session so the admin stays signed in here.
 */
export async function changeOwnPassword(actor: AdminProfile, input: z.infer<typeof passwordChangeSchema>) {
  await assertNotRateLimited(rateLimits.passwordChange, actor.id)
  const admin = await findAdmin(actor.id)
  if (!(await verifyPassword(input.currentPassword, admin.passwordHash))) {
    await enforceRateLimit(rateLimits.passwordChange, actor.id)
    throw new AppError("VALIDATION", "Your current password is not correct.", 422, [{ field: "currentPassword", message: "Your current password is not correct." }])
  }
  const updated = await getPrisma().admin.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(input.newPassword), mustChangePassword: false, tokenVersion: { increment: 1 } },
  })
  await refreshSession(updated)
  return serializeAdmin(updated)
}

export type { AdminRole }
