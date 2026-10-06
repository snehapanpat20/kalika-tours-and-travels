import "server-only"
import { cookies, draftMode } from "next/headers"
import type { Admin } from "@/generated/prisma/client"
import { can, type Permission } from "@/lib/auth/permissions"
import { getAllowedOrigins, isProduction } from "@/lib/config/env"
import { AppError } from "@/lib/errors/app-error"
import { assertNotRateLimited, enforceRateLimit, getClientIp, rateLimits } from "@/server/api/rate-limit"
import { getDecoyHash, verifyPassword } from "@/server/auth/password"
import { ADMIN_TOKEN_TTL_SECONDS, signAdminToken, verifyAdminToken } from "@/server/auth/token"
import { getPrisma } from "@/server/db/prisma"

/**
 * In production the __Host- prefix makes the browser insist on Secure, Path=/
 * and no Domain, so no other site or subdomain can set or read it.
 */
export const adminCookieName = () => (isProduction() ? "__Host-kalika_admin" : "kalika_admin")

/** What the rest of the app knows about the signed-in admin. Never includes the password hash. */
export type AdminProfile = Pick<Admin, "id" | "email" | "name" | "role" | "mustChangePassword"> & {
  lastLoginAt: string | null
}

const toProfile = (admin: Admin): AdminProfile => ({
  id: admin.id,
  email: admin.email,
  name: admin.name,
  role: admin.role,
  mustChangePassword: admin.mustChangePassword,
  lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
})

/**
 * What a request needs: a permission from lib/auth/permissions.ts, or "self"
 * for an admin's own account (profile, password, sign-out), which every
 * signed-in admin may use, including one who must change their password first.
 */
export type AdminAccess = Permission | "self"

const stateChanging = (method: string) => !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())

/**
 * Cookie-authenticated requests that change data must come from our own pages.
 * SameSite=Strict already blocks most cross-site requests; this is a second check.
 */
function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const own = new URL(request.url).origin
  if (!origin || (origin !== own && !getAllowedOrigins().includes(origin))) {
    throw new AppError("FORBIDDEN", "This request is not allowed from this origin.", 403)
  }
}

/** The admin a token belongs to, if the token is still valid and the account is enabled. */
async function adminForToken(token: string): Promise<Admin | null> {
  const claims = await verifyAdminToken(token)
  const admin = await getPrisma().admin.findUnique({ where: { id: claims.sub } })
  return admin && admin.isActive && admin.tokenVersion === claims.ver ? admin : null
}

/** Throws 403 unless the admin may do this. The one place roles are checked for API requests. */
export function assertAccess(admin: AdminProfile, access: AdminAccess) {
  if (access === "self") return
  if (admin.mustChangePassword) {
    throw new AppError("FORBIDDEN", "Please choose a new password before continuing.", 403)
  }
  if (!can(admin.role, access)) {
    throw new AppError("FORBIDDEN", "You don't have permission to do this.", 403)
  }
}

/**
 * Returns the signed-in admin if they may do `access`. Throws 401 when not signed in
 * (or the account is disabled), 403 when signed in without permission.
 * Accepts the session cookie or a Bearer token.
 */
export async function requireAdmin(request: Request, access: AdminAccess): Promise<AdminProfile> {
  const header = request.headers.get("authorization")
  const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const cookieToken = (await cookies()).get(adminCookieName())?.value
  const token = bearer || cookieToken

  if (!token) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.", 401)
  // Bearer tokens are never sent automatically by a browser, so only cookie use needs the origin check.
  if (!bearer && stateChanging(request.method)) assertTrustedOrigin(request)

  const admin = await adminForToken(token)
  if (!admin) throw new AppError("UNAUTHENTICATED", "Your session is not valid. Please sign in again.", 401)

  const profile = toProfile(admin)
  assertAccess(profile, access)
  return profile
}

/** Sets the session cookie for a freshly signed token. */
async function setSessionCookie(admin: Pick<Admin, "id" | "tokenVersion">) {
  const { token, expiresAt } = await signAdminToken({ sub: admin.id, ver: admin.tokenVersion })
  ;(await cookies()).set(adminCookieName(), token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_TOKEN_TTL_SECONDS,
  })
  return expiresAt
}

/** Checks the password, applies login rate limits and sets the session cookie. */
export async function signInAdmin(request: Request, email: string, password: string) {
  assertTrustedOrigin(request)
  const ip = getClientIp(request)
  // A locked account stays locked, even for the right password, until the window passes
  await assertNotRateLimited(rateLimits.loginPerIp, ip)
  await assertNotRateLimited(rateLimits.loginPerAccount, email)

  const admin = await getPrisma().admin.findUnique({ where: { email } })
  // Hash something even when the email is unknown, so timing does not reveal which emails exist.
  const valid = await verifyPassword(password, admin?.passwordHash ?? (await getDecoyHash()))
  if (!admin || !valid) {
    // Only failures count, so the owner signing in often is never locked out
    await enforceRateLimit(rateLimits.loginPerIp, ip)
    await enforceRateLimit(rateLimits.loginPerAccount, email)
    throw new AppError("UNAUTHENTICATED", "Incorrect email or password.", 401)
  }
  // Only said after the correct password, so it reveals nothing to someone guessing
  if (!admin.isActive) {
    throw new AppError("FORBIDDEN", "This account has been disabled. Please contact the site administrator.", 403)
  }

  const updated = await getPrisma().admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
  const expiresAt = await setSessionCookie(updated)
  return { admin: toProfile(updated), expiresAt }
}

/** Re-issues the cookie after the admin's own token version changed (e.g. a new password). */
export async function refreshSession(admin: Pick<Admin, "id" | "tokenVersion">) {
  return setSessionCookie(admin)
}

export async function signOutAdmin(request: Request) {
  assertTrustedOrigin(request)
  ;(await cookies()).delete({ name: adminCookieName(), path: "/" })
  // Leaving the admin also leaves website preview
  ;(await draftMode()).disable()
}

/** For server-rendered pages: the signed-in, enabled admin from the cookie, or null. */
export async function getSignedInAdmin(): Promise<AdminProfile | null> {
  const token = (await cookies()).get(adminCookieName())?.value
  if (!token) return null
  try {
    const admin = await adminForToken(token)
    return admin ? toProfile(admin) : null
  } catch {
    return null
  }
}
