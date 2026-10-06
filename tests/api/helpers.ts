/**
 * Shared helpers for the API tests. They talk to a running test server
 * (npm run test:server) over HTTP, exactly like a browser or client would.
 */
import { config } from "dotenv"
import { randomInt } from "node:crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import { SignJWT } from "jose"
import { PrismaClient } from "../../generated/prisma/client"
import { hashPassword } from "../../server/auth/password"

config({ path: ".env.test", quiet: true })

export const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3200"
export const ORIGIN = new URL(BASE).origin

const databaseName = new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname.slice(1)
if (!databaseName.endsWith("_test")) {
  throw new Error(`Refusing to run: DATABASE_URL points at "${databaseName}". Tests empty the tables, so the name must end in _test.`)
}

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

/** Empties every table. Only ever runs against a *_test database (checked above). */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE enquiries, admins, rate_limit_buckets, gallery_items, reviews, offers, announcements, site_content, destinations, services, audit_logs`)
}

/** Test-only credentials for the *_test database. Never real accounts. */
export const ADMIN = { email: "owner@kalika.test", password: "correct-horse-battery-staple", name: "Test Owner", role: "SUPER_ADMIN" as const }
export const CONTENT_ADMIN = { email: "content@kalika.test", password: "content-admin-test-password", name: "Test Content Admin", role: "CONTENT_ADMIN" as const }

export async function createAdmin(admin: { email: string; password: string; name: string; role?: "SUPER_ADMIN" | "CONTENT_ADMIN" } = ADMIN) {
  return prisma.admin.create({
    data: { email: admin.email, name: admin.name, role: admin.role ?? "SUPER_ADMIN", passwordHash: await hashPassword(admin.password) },
  })
}

/** Each call looks like a different visitor arriving through the hosting proxy. */
export function freshIp() {
  return `198.51.${randomInt(0, 255)}.${randomInt(1, 254)}`
}

/** A unique valid Indian mobile number, so per-phone limits do not interfere between tests. */
export function freshPhone() {
  return `9${String(randomInt(0, 999_999_999)).padStart(9, "0")}`
}

export function isoDay(offset: number) {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000) // India time
  now.setUTCDate(now.getUTCDate() + offset)
  return now.toISOString().slice(0, 10)
}

export function validEnquiry(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Example User",
    phone: freshPhone(),
    email: "example@email.com",
    travelType: "FAMILY",
    destination: "Goa",
    travelDate: isoDay(30),
    returnDate: isoDay(35),
    passengerCount: 8,
    message: "Need a comfortable Traveller for family trip.",
    ...overrides,
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  rawBody?: string
  headers?: Record<string, string>
  cookie?: string
  ip?: string
  origin?: string | null
}

export async function api(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = {
    "X-Forwarded-For": options.ip ?? freshIp(),
    ...(options.body !== undefined || options.rawBody !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...(options.origin === null ? {} : { Origin: options.origin ?? ORIGIN }),
    ...options.headers,
  }
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? (options.body !== undefined || options.rawBody !== undefined ? "POST" : "GET"),
    headers,
    body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  })
  const text = await response.text()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests read arbitrary response shapes
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: response.status, headers: response.headers, json }
}

/** Signs in and returns the Cookie header value to send on later requests. */
export async function login(email = ADMIN.email, password = ADMIN.password) {
  const response = await api("/api/admin/auth/login", { body: { email, password } })
  const setCookie = response.headers.get("set-cookie") ?? ""
  return { ...response, cookie: setCookie.split(";")[0] }
}

/** A correctly signed token that has already expired. */
export async function expiredToken(adminId: string) {
  const past = Math.floor(Date.now() / 1000) - 60
  return new SignJWT({ ver: 0 })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(adminId)
    .setIssuer("kalika-tours")
    .setAudience("kalika-admin")
    .setIssuedAt(past - 3600)
    .setExpirationTime(past)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET!))
}

/** Sends multipart/form-data, like the review form or the admin gallery editor. */
export async function apiForm(
  path: string,
  fields: Record<string, string | Blob | { data: Buffer; type: string; name: string }>,
  options: { method?: string; cookie?: string; ip?: string; origin?: string | null } = {},
) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" || value instanceof Blob) form.set(key, value)
    else form.set(key, new Blob([new Uint8Array(value.data)], { type: value.type }), value.name)
  }
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? "POST",
    headers: {
      "X-Forwarded-For": options.ip ?? freshIp(),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.origin === null ? {} : { Origin: options.origin ?? ORIGIN }),
    },
    body: form,
  })
  const text = await response.text()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests read arbitrary response shapes
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: response.status, headers: response.headers, json }
}

/** The HTML of a public page, fetched fresh. */
export async function page(path: string) {
  const response = await fetch(`${BASE}${path}`, { headers: { "Cache-Control": "no-cache" } })
  return { status: response.status, html: await response.text() }
}
