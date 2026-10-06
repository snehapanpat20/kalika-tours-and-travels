import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { api, createAdmin, isoDay, login, prisma, resetDatabase, validEnquiry } from "./helpers"

describe("Admin enquiry API", () => {
  let cookie = ""
  const ids: Record<string, string> = {}

  before(async () => {
    await resetDatabase()
    await createAdmin()
    cookie = (await login()).cookie

    const samples = [
      { key: "goa", fullName: "Asha Patil", destination: "Goa", phone: "9822000001" },
      { key: "shirdi", fullName: "Ravi Kulkarni", destination: "Shirdi", phone: "9822000002", travelType: "PILGRIMAGE" },
      { key: "lonavala", fullName: "Meera Joshi", destination: "Lonavala", phone: "9822000003", travelType: "CORPORATE" },
      { key: "goa2", fullName: "Kiran Shah", destination: "North Goa", phone: "9822000004", travelDate: isoDay(5), returnDate: isoDay(6) },
    ]
    for (const { key, ...sample } of samples) {
      const response = await api("/api/enquiries", { body: validEnquiry(sample) })
      assert.equal(response.status, 201)
      ids[key] = response.json.enquiryId
    }
  })
  after(() => prisma.$disconnect())

  test("unauthorized access is refused on every admin endpoint", async () => {
    const id = ids.goa
    const calls = [
      api("/api/admin/dashboard"),
      api("/api/admin/enquiries"),
      api(`/api/admin/enquiries/${id}`),
      api(`/api/admin/enquiries/${id}/status`, { method: "PATCH", body: { status: "CONTACTED" } }),
      api(`/api/admin/enquiries/${id}`, { method: "DELETE" }),
    ]
    for (const response of await Promise.all(calls)) {
      assert.equal(response.status, 401)
      assert.equal(response.json.success, false)
    }
  })

  test("get enquiries, newest first, with pagination details", async () => {
    const response = await api("/api/admin/enquiries", { cookie })
    assert.equal(response.status, 200)
    assert.equal(response.json.enquiries.length, 4)
    assert.equal(response.json.enquiries[0].id, ids.goa2)
    assert.deepEqual(response.json.pagination, { page: 1, pageSize: 20, total: 4, totalPages: 1 })
  })

  test("pagination", async () => {
    const first = await api("/api/admin/enquiries?pageSize=3&page=1", { cookie })
    const second = await api("/api/admin/enquiries?pageSize=3&page=2", { cookie })
    assert.equal(first.json.enquiries.length, 3)
    assert.equal(second.json.enquiries.length, 1)
    assert.equal(second.json.pagination.totalPages, 2)
    const all = [...first.json.enquiries, ...second.json.enquiries].map((row: { id: string }) => row.id)
    assert.equal(new Set(all).size, 4)
  })

  test("invalid query parameters are rejected", async () => {
    for (const query of ["page=0", "pageSize=500", "status=WHATEVER", "from=yesterday", "from=2026-10-10&to=2026-10-01", "sort=random"]) {
      const response = await api(`/api/admin/enquiries?${query}`, { cookie })
      assert.equal(response.status, 422, query)
    }
  })

  test("search by name, destination and phone", async () => {
    const byName = await api("/api/admin/enquiries?search=asha", { cookie })
    assert.deepEqual(byName.json.enquiries.map((row: { id: string }) => row.id), [ids.goa])

    const byDestination = await api("/api/admin/enquiries?search=goa", { cookie })
    assert.equal(byDestination.json.enquiries.length, 2)

    const byPhone = await api(`/api/admin/enquiries?search=${encodeURIComponent("98220 00002")}`, { cookie })
    assert.deepEqual(byPhone.json.enquiries.map((row: { id: string }) => row.id), [ids.shirdi])
  })

  test("update status, then filter by status", async () => {
    const updated = await api(`/api/admin/enquiries/${ids.shirdi}/status`, { method: "PATCH", body: { status: "CONTACTED" }, cookie })
    assert.equal(updated.status, 200)
    assert.equal(updated.json.enquiry.status, "CONTACTED")

    const contacted = await api("/api/admin/enquiries?status=CONTACTED", { cookie })
    assert.deepEqual(contacted.json.enquiries.map((row: { id: string }) => row.id), [ids.shirdi])
    const fresh = await api("/api/admin/enquiries?status=NEW", { cookie })
    assert.equal(fresh.json.enquiries.length, 3)
  })

  test("filter by travel type, alone and with other filters", async () => {
    const pilgrimage = await api("/api/admin/enquiries?travelType=PILGRIMAGE", { cookie })
    assert.deepEqual(pilgrimage.json.enquiries.map((row: { id: string }) => row.id), [ids.shirdi])

    const family = await api("/api/admin/enquiries?travelType=FAMILY&search=goa", { cookie })
    assert.equal(family.json.enquiries.length, 2)

    const invalid = await api("/api/admin/enquiries?travelType=BUS", { cookie })
    assert.equal(invalid.status, 422)
  })

  test("invalid status is rejected", async () => {
    const response = await api(`/api/admin/enquiries/${ids.goa}/status`, { method: "PATCH", body: { status: "BOOKED" }, cookie })
    assert.equal(response.status, 422)
    assert.equal(response.json.errors[0].field, "status")
  })

  test("filter by date received", async () => {
    await prisma.enquiry.update({ where: { id: ids.lonavala }, data: { createdAt: new Date("2026-01-15T10:00:00+05:30") } })
    const january = await api("/api/admin/enquiries?from=2026-01-01&to=2026-01-31", { cookie })
    assert.deepEqual(january.json.enquiries.map((row: { id: string }) => row.id), [ids.lonavala])
    const sameDay = await api("/api/admin/enquiries?from=2026-01-15&to=2026-01-15", { cookie })
    assert.equal(sameDay.json.enquiries.length, 1, "'to' includes the whole day")
  })

  test("get a single enquiry with complete details", async () => {
    const response = await api(`/api/admin/enquiries/${ids.goa}`, { cookie })
    assert.equal(response.status, 200)
    const enquiry = response.json.enquiry
    for (const key of ["id", "fullName", "phone", "email", "travelType", "destination", "travelDate", "returnDate", "passengerCount", "message", "status", "source", "createdAt", "updatedAt"]) {
      assert.ok(key in enquiry, key)
    }
    assert.equal(enquiry.fullName, "Asha Patil")
    assert.match(enquiry.travelDate, /^\d{4}-\d{2}-\d{2}$/)
  })

  test("unknown or malformed id returns 404", async () => {
    assert.equal((await api("/api/admin/enquiries/00000000-0000-4000-8000-000000000000", { cookie })).status, 404)
    assert.equal((await api("/api/admin/enquiries/not-a-uuid", { cookie })).status, 404)
    assert.equal((await api("/api/admin/enquiries/'; DROP TABLE enquiries;--", { cookie })).status, 404)
  })

  test("dashboard statistics", async () => {
    const response = await api("/api/admin/dashboard", { cookie })
    assert.equal(response.status, 200)
    assert.equal(response.json.totalEnquiries, 4)
    assert.equal(response.json.newEnquiries, 3)
    assert.equal(response.json.contactedEnquiries, 1)
    assert.equal(response.json.confirmedEnquiries, 0)
    assert.equal(response.json.completedEnquiries, 0)
    assert.equal(response.json.recentEnquiries.length, 4)
  })

  test("state-changing requests from another site are refused even with the cookie", async () => {
    const response = await api(`/api/admin/enquiries/${ids.goa}/status`, { method: "PATCH", body: { status: "CONFIRMED" }, cookie, origin: "https://evil.example" })
    assert.equal(response.status, 403)
    const unchanged = await prisma.enquiry.findUniqueOrThrow({ where: { id: ids.goa } })
    assert.equal(unchanged.status, "NEW")
  })

  test("soft delete hides the enquiry but keeps the record", async () => {
    const response = await api(`/api/admin/enquiries/${ids.goa2}`, { method: "DELETE", cookie })
    assert.equal(response.status, 200)

    assert.equal((await api(`/api/admin/enquiries/${ids.goa2}`, { cookie })).status, 404)
    const list = await api("/api/admin/enquiries", { cookie })
    assert.ok(!list.json.enquiries.some((row: { id: string }) => row.id === ids.goa2))
    assert.equal((await api("/api/admin/dashboard", { cookie })).json.totalEnquiries, 3)

    const row = await prisma.enquiry.findUniqueOrThrow({ where: { id: ids.goa2 } })
    assert.ok(row.deletedAt instanceof Date, "record still exists with deletedAt set")

    assert.equal((await api(`/api/admin/enquiries/${ids.goa2}`, { method: "DELETE", cookie })).status, 404, "deleting twice is 404")
  })
})
