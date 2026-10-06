import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { ADMIN, api, createAdmin, expiredToken, login, prisma, resetDatabase } from "./helpers"

describe("Admin authentication", () => {
  let adminId = ""

  before(async () => {
    await resetDatabase()
    adminId = (await createAdmin()).id
  })
  after(() => prisma.$disconnect())

  test("the stored password is a hash, never the raw password", async () => {
    const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } })
    assert.ok(admin.passwordHash.startsWith("scrypt$"))
    assert.ok(!admin.passwordHash.includes(ADMIN.password))
  })

  test("correct login sets a secure session cookie and returns no token", async () => {
    const response = await login()
    assert.equal(response.status, 200)
    assert.equal(response.json.success, true)
    assert.equal(response.json.admin.email, ADMIN.email)
    assert.equal(response.json.token, undefined, "the token is never exposed to page JavaScript")

    const setCookie = response.headers.get("set-cookie") ?? ""
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=strict/i)
    assert.match(setCookie, /Max-Age=7200/i)

    const me = await api("/api/admin/auth/me", { cookie: response.cookie })
    assert.equal(me.status, 200)
    assert.equal(me.json.admin.id, adminId)
  })

  test("email is case-insensitive", async () => {
    const response = await login(ADMIN.email.toUpperCase())
    assert.equal(response.status, 200)
  })

  test("incorrect password", async () => {
    const response = await login(ADMIN.email, "wrong-password")
    assert.equal(response.status, 401)
    assert.equal(response.json.message, "Incorrect email or password.")
    assert.equal(response.headers.get("set-cookie"), null)
  })

  test("unknown email gets the same answer as a wrong password", async () => {
    const response = await login("nobody@kalika.test", "whatever-password")
    assert.equal(response.status, 401)
    assert.equal(response.json.message, "Incorrect email or password.")
  })

  test("missing fields", async () => {
    const response = await api("/api/admin/auth/login", { body: {} })
    assert.equal(response.status, 422)
  })

  test("missing token", async () => {
    const response = await api("/api/admin/enquiries")
    assert.equal(response.status, 401)
    assert.equal(response.json.code, "UNAUTHENTICATED")
  })

  test("invalid token", async () => {
    const forged = await api("/api/admin/enquiries", { headers: { Authorization: "Bearer not.a.real.token" } })
    assert.equal(forged.status, 401)

    const badCookie = await api("/api/admin/enquiries", { cookie: "kalika_admin=eyJhbGciOiJIUzI1NiJ9.e30.tampered" })
    assert.equal(badCookie.status, 401)
  })

  test("token signed with a different secret is rejected", async () => {
    const { SignJWT } = await import("jose")
    const token = await new SignJWT({ ver: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(adminId)
      .setIssuer("kalika-tours")
      .setAudience("kalika-admin")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("some-other-secret-that-is-long-enough-123"))
    const response = await api("/api/admin/enquiries", { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(response.status, 401)
  })

  test("expired token", async () => {
    const response = await api("/api/admin/enquiries", { headers: { Authorization: `Bearer ${await expiredToken(adminId)}` } })
    assert.equal(response.status, 401)
    assert.equal(response.json.message, "Your session has expired. Please sign in again.")
  })

  test("bumping tokenVersion signs the admin out everywhere", async () => {
    const { cookie } = await login()
    await prisma.admin.update({ where: { id: adminId }, data: { tokenVersion: { increment: 1 } } })
    const response = await api("/api/admin/auth/me", { cookie })
    assert.equal(response.status, 401)
  })

  test("login from another site is refused", async () => {
    const response = await api("/api/admin/auth/login", { body: { email: ADMIN.email, password: ADMIN.password }, origin: "https://evil.example" })
    assert.equal(response.status, 403)
  })

  test("logout clears the cookie", async () => {
    const response = await api("/api/admin/auth/logout", { method: "POST", cookie: (await login()).cookie })
    assert.equal(response.status, 200)
    assert.match(response.headers.get("set-cookie") ?? "", /kalika_admin=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i)
  })

  test("repeated wrong passwords are rate limited", async () => {
    const email = "locked@kalika.test"
    await createAdmin({ email, password: "another-long-password-1", name: "Locked" })
    const statuses: number[] = []
    for (let attempt = 0; attempt < 6; attempt++) statuses.push((await login(email, "wrong")).status)
    assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429])

    // Even the right password is refused until the window passes
    const blocked = await login(email, "another-long-password-1")
    assert.equal(blocked.status, 429)
    assert.ok(Number(blocked.headers.get("retry-after")) > 0)
  })
})
