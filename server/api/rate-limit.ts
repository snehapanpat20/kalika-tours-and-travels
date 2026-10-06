import "server-only"
import { createHmac } from "node:crypto"
import { getServerEnv, requireEnv } from "@/lib/config/env"
import { AppError } from "@/lib/errors/app-error"
import { describeError, logger } from "@/server/api/logger"
import { getPrisma } from "@/server/db/prisma"

export type RateLimitRule = {
  /** Short name of what is being limited, e.g. "enquiry". */
  name: string
  limit: number
  windowSeconds: number
}

export const rateLimits = {
  /** A real customer rarely sends more than one or two enquiries. */
  enquiryBurst: { name: "enquiry-10m", limit: 5, windowSeconds: 10 * 60 },
  enquiryDaily: { name: "enquiry-1d", limit: 20, windowSeconds: 24 * 60 * 60 },
  /** Not tied to IP, so it holds even if an IP is hidden or forged. */
  enquiryPerPhone: { name: "enquiry-phone-1d", limit: 5, windowSeconds: 24 * 60 * 60 },
  /** Site-wide ceiling: caps the damage of any flood. */
  enquiryGlobal: { name: "enquiry-all-1h", limit: 100, windowSeconds: 60 * 60 },
  /** Customer reviews: a few per visitor, and a site-wide ceiling. */
  reviewPerIp: { name: "review-ip-1h", limit: 3, windowSeconds: 60 * 60 },
  reviewDailyIp: { name: "review-ip-1d", limit: 6, windowSeconds: 24 * 60 * 60 },
  reviewGlobal: { name: "review-all-1h", limit: 30, windowSeconds: 60 * 60 },
  /** Slows password guessing. Only failed attempts count, per IP and per email address. */
  loginPerIp: { name: "login-ip-15m", limit: 10, windowSeconds: 15 * 60 },
  loginPerAccount: { name: "login-acct-15m", limit: 5, windowSeconds: 15 * 60 },
  // Wrong "current password" attempts when an admin changes their own password
  passwordChange: { name: "pw-change-15m", limit: 5, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitRule>

/**
 * The visitor's IP address.
 *
 * X-Forwarded-For is a list that any client can start with fake entries.
 * Each proxy we control appends the address it saw, so the trustworthy entry
 * is the one TRUSTED_PROXY_COUNT places from the end. Entries before it are
 * ignored. (Next.js only fills the header when it is missing, so without a
 * proxy in front, such as local development, the value can be forged. That is
 * why enquiries also have per-phone and site-wide limits.)
 */
export function getClientIp(request: Request): string {
  const forwarded = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  const hops = getServerEnv().TRUSTED_PROXY_COUNT
  if (forwarded.length === 0) return "unknown"
  if (hops === 0) return forwarded.at(-1) ?? "unknown"
  return forwarded[Math.max(0, forwarded.length - hops)] ?? "unknown"
}

/** Keyed hash so that raw IP addresses and emails are never stored. */
export function anonymise(value: string): string {
  return createHmac("sha256", requireEnv("JWT_SECRET")).update(value.toLowerCase()).digest("base64url").slice(0, 32)
}

function tooManyRequests(rule: RateLimitRule, resetAt: Date): AppError {
  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
  // A site-wide limit being hit means something unusual is happening
  if (rule.name.includes("-all-")) logger.error("rate_limited_global", { rule: rule.name })
  else logger.warn("rate_limited", { rule: rule.name })
  return new AppError("RATE_LIMITED", "Too many requests. Please wait a little and try again.", 429, [], {
    "Retry-After": String(retryAfter),
  })
}

/** Throws 429 if `subject` is already over the limit, without counting a hit. */
export async function assertNotRateLimited(rule: RateLimitRule, subject: string): Promise<void> {
  const key = `${rule.name}:${anonymise(subject)}`
  let bucket: { count: number; resetAt: Date } | null = null
  try {
    bucket = await getPrisma().rateLimitBucket.findUnique({ where: { key } })
  } catch (error) {
    logger.error("rate_limit_unavailable", { rule: rule.name, ...describeError(error) })
    return
  }
  if (bucket && bucket.resetAt > new Date() && bucket.count > rule.limit) throw tooManyRequests(rule, bucket.resetAt)
}

/**
 * Counts one hit against `rule` for `subject`, throwing 429 once the limit is
 * passed. Counters live in Postgres so limits hold across server instances.
 */
export async function enforceRateLimit(rule: RateLimitRule, subject: string): Promise<void> {
  const key = `${rule.name}:${anonymise(subject)}`
  let count: number
  let resetAt: Date

  try {
    const prisma = getPrisma()
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO rate_limit_buckets (key, count, "resetAt")
      VALUES (${key}, 1, now() + (${rule.windowSeconds}::int * interval '1 second'))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limit_buckets."resetAt" <= now() THEN 1 ELSE rate_limit_buckets.count + 1 END,
        "resetAt" = CASE WHEN rate_limit_buckets."resetAt" <= now()
          THEN now() + (${rule.windowSeconds}::int * interval '1 second')
          ELSE rate_limit_buckets."resetAt" END
      RETURNING count, "resetAt"`
    count = rows[0].count
    resetAt = rows[0].resetAt

    // Occasionally clear out old counters
    if (Math.random() < 0.02) {
      await prisma.$executeRaw`DELETE FROM rate_limit_buckets WHERE "resetAt" < now() - interval '1 hour'`
    }
  } catch (error) {
    // Fail open: a limiter problem must not stop real customers reaching the business.
    logger.error("rate_limit_unavailable", { rule: rule.name, ...describeError(error) })
    return
  }

  if (count > rule.limit) throw tooManyRequests(rule, resetAt)
}
