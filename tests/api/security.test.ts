import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { api, freshPhone, prisma, resetDatabase, validEnquiry } from "./helpers"

describe("Security", () => {
  before(resetDatabase)
  after(() => prisma.$disconnect())

  test("enquiries are rate limited per visitor", async () => {
    const ip = "203.0.113.50"
    const statuses: number[] = []
    for (let attempt = 0; attempt < 6; attempt++) {
      statuses.push((await api("/api/enquiries", { body: validEnquiry(), ip })).status)
    }
    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429])

    const limited = await api("/api/enquiries", { body: validEnquiry(), ip })
    assert.equal(limited.json.code, "RATE_LIMITED")
    assert.ok(Number(limited.headers.get("retry-after")) > 0)
  })

  test("forged X-Forwarded-For entries do not get around the limit", async () => {
    // The hosting proxy appends the real address last; anything before it is ignored.
    const realIp = "203.0.113.77"
    const statuses: number[] = []
    for (let attempt = 0; attempt < 6; attempt++) {
      const forged = `10.0.0.${attempt}, 192.0.2.${attempt}`
      statuses.push((await api("/api/enquiries", { body: validEnquiry(), ip: `${forged}, ${realIp}` })).status)
    }
    assert.equal(statuses.at(-1), 429)
  })

  test("one phone number cannot flood enquiries from many addresses", async () => {
    const phone = freshPhone()
    const statuses: number[] = []
    for (let attempt = 0; attempt < 6; attempt++) {
      // Different destination each time so it is not treated as a double click
      statuses.push((await api("/api/enquiries", { body: validEnquiry({ phone, destination: `Place ${String.fromCharCode(65 + attempt)}` }) })).status)
    }
    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429])
  })

  test("errors never expose stack traces or database details", async () => {
    const response = await api("/api/enquiries", { rawBody: '{"fullName": ' })
    const text = JSON.stringify(response.json)
    assert.doesNotMatch(text, /at \w+ \(|node_modules|prisma|postgres|SELECT|\.ts:\d+/i)
    assert.deepEqual(Object.keys(response.json).sort(), ["code", "errors", "message", "success"])
  })

  test("API responses carry security headers and are never cached", async () => {
    const response = await api("/api/health")
    assert.equal(response.headers.get("cache-control"), "no-store")
    assert.equal(response.headers.get("x-content-type-options"), "nosniff")
    assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'none'/)
    assert.ok(response.headers.get("x-request-id"))
    assert.equal(response.headers.get("x-powered-by"), null)
  })

  test("CORS: allowed origin is echoed, others get no CORS headers, never *", async () => {
    const allowed = await api("/api/enquiries", { method: "OPTIONS" })
    assert.equal(allowed.status, 204)
    assert.equal(allowed.headers.get("access-control-allow-origin"), new URL(process.env.TEST_BASE_URL!).origin)
    assert.match(allowed.headers.get("access-control-allow-methods") ?? "", /POST/)

    const other = await api("/api/enquiries", { method: "OPTIONS", origin: "https://evil.example" })
    assert.equal(other.headers.get("access-control-allow-origin"), null)

    const actual = await api("/api/admin/enquiries", { origin: "https://evil.example" })
    assert.notEqual(actual.headers.get("access-control-allow-origin"), "*")
    assert.equal(actual.headers.get("access-control-allow-origin"), null)
  })

  test("enquiries are not readable without signing in", async () => {
    const response = await api("/api/enquiries")
    assert.equal(response.status, 405, "the public endpoint only accepts POST")
  })
})
