import "server-only"
import { AppError } from "@/lib/errors/app-error"
import type { Session, UserRole } from "@/types/auth"

/**
 * Signed sessions are added with the authentication module.
 * A cookie is never treated as a session on its own.
 */
export async function getSession(): Promise<Session | null> {
  return null
}

export async function requireRole(role: UserRole): Promise<Session> {
  const session = await getSession()

  if (!session) {
    throw new AppError("UNAUTHENTICATED", "Sign in is required.", 401)
  }

  if (session.role !== role) {
    throw new AppError("FORBIDDEN", "You do not have access to this area.", 403)
  }

  return session
}
