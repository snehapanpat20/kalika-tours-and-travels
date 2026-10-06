import "server-only"
import { SignJWT, errors, jwtVerify } from "jose"
import { requireEnv } from "@/lib/config/env"
import { AppError } from "@/lib/errors/app-error"

/** Admin sessions are short-lived; the owner signs in again after two hours. */
export const ADMIN_TOKEN_TTL_SECONDS = 2 * 60 * 60

const issuer = "kalika-tours"
const audience = "kalika-admin"

const secretKey = () => new TextEncoder().encode(requireEnv("JWT_SECRET"))

export type AdminClaims = {
  /** Admin id */
  sub: string
  /** Admin.tokenVersion at sign-in; bumping it revokes every token. */
  ver: number
}

export async function signAdminToken(claims: AdminClaims): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + ADMIN_TOKEN_TTL_SECONDS * 1000)
  const token = await new SignJWT({ ver: claims.ver })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey())
  return { token, expiresAt }
}

export async function verifyAdminToken(token: string): Promise<AdminClaims> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer, audience, algorithms: ["HS256"] })
    if (typeof payload.sub !== "string" || typeof payload.ver !== "number") throw new Error("Malformed claims")
    return { sub: payload.sub, ver: payload.ver }
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new AppError("UNAUTHENTICATED", "Your session has expired. Please sign in again.", 401)
    }
    throw new AppError("UNAUTHENTICATED", "Your session is not valid. Please sign in again.", 401)
  }
}
