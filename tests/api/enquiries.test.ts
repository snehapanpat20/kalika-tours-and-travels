import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { api, isoDay, prisma, resetDatabase, validEnquiry } from "./helpers"

const fieldsOf = (json: { errors?: { field: string }[] }) => (json.errors ?? []).map((issue) => issue.field)

describe("POST /api/enquiries", () => {
  before(resetDatabase)
  after(() => prisma.$disconnect())

  test("valid submission is stored and returns the enquiry id", async () => {
    const body = validEnquiry({ phone: "+91 98765-43210", email: "Example@Email.COM" })
    const response = await api("/api/enquiries", { body })

    assert.equal(response.status, 201)
    assert.equal(response.json.success, true)
    assert.equal(response.json.message, "Your enquiry has been submitted successfully.")
    assert.match(response.json.enquiryId, /^[0-9a-f-]{36}$/)

    const stored = await prisma.enquiry.findUniqueOrThrow({ where: { id: response.json.enquiryId } })
    assert.equal(stored.phone, "+919876543210", "phone is normalised to E.164")
    assert.equal(stored.email, "example@email.com", "email is lower-cased")
    assert.equal(stored.status, "NEW")
    assert.equal(stored.source, "WEBSITE")
    assert.equal(stored.travelDate.toISOString().slice(0, 10), body.travelDate)
  })

  test("business notification is recorded after the response", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry() })
    // The email runs after the response; give it a moment
    let status = "PENDING"
    for (let attempt = 0; attempt < 20 && status === "PENDING"; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      status = (await prisma.enquiry.findUniqueOrThrow({ where: { id: response.json.enquiryId } })).notificationStatus
    }
    assert.equal(status, "SENT")
  })

  test("a double submission returns the same enquiry instead of a duplicate", async () => {
    const body = validEnquiry()
    const first = await api("/api/enquiries", { body })
    const second = await api("/api/enquiries", { body })
    assert.equal(first.status, 201)
    assert.equal(second.status, 200)
    assert.equal(second.json.enquiryId, first.json.enquiryId)
  })

  test("email and message are optional", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ email: "", message: undefined }) })
    assert.equal(response.status, 201)
  })

  test("the vehicle chosen on the website reaches the stored enquiry", async () => {
    // The trip form puts the chosen vehicle at the start of the message (there is no vehicle column)
    const message = "[Vehicle: 34-Seater AC Sleeper Bus] [One-way trip] Pickup from Hadapsar."
    const response = await api("/api/enquiries", { body: validEnquiry({ message }) })
    assert.equal(response.status, 201)
    const stored = await prisma.enquiry.findUniqueOrThrow({ where: { id: response.json.enquiryId } })
    assert.equal(stored.message, message)
  })

  test("missing name", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ fullName: undefined }) })
    assert.equal(response.status, 422)
    assert.equal(response.json.success, false)
    assert.equal(response.json.code, "VALIDATION")
    assert.deepEqual(fieldsOf(response.json), ["fullName"])
  })

  test("name with digits or links is rejected", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ fullName: "http://spam.example" }) })
    assert.equal(response.status, 422)
    assert.deepEqual(fieldsOf(response.json), ["fullName"])
  })

  test("invalid phone", async () => {
    for (const phone of ["12345", "5876543210", "+1 202 555 0100", "98765432101"]) {
      const response = await api("/api/enquiries", { body: validEnquiry({ phone }) })
      assert.equal(response.status, 422, phone)
      assert.deepEqual(fieldsOf(response.json), ["phone"], phone)
    }
  })

  test("invalid email", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ email: "not-an-email" }) })
    assert.equal(response.status, 422)
    assert.deepEqual(fieldsOf(response.json), ["email"])
  })

  test("invalid travel type", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ travelType: "SPACE_TRIP" }) })
    assert.equal(response.status, 422)
    assert.deepEqual(fieldsOf(response.json), ["travelType"])
  })

  test("invalid and impossible dates", async () => {
    for (const travelDate of ["15-11-2026", "2026-02-30", "tomorrow"]) {
      const response = await api("/api/enquiries", { body: validEnquiry({ travelDate }) })
      assert.equal(response.status, 422, travelDate)
      assert.ok(fieldsOf(response.json).includes("travelDate"), travelDate)
    }
  })

  test("travel date in the past", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ travelDate: isoDay(-1), returnDate: isoDay(2) }) })
    assert.equal(response.status, 422)
    assert.deepEqual(response.json.errors, [{ field: "travelDate", message: "Travel date cannot be in the past." }])
  })

  test("travel date more than two years away", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ travelDate: isoDay(800), returnDate: isoDay(802) }) })
    assert.equal(response.status, 422)
    assert.deepEqual(fieldsOf(response.json), ["travelDate"])
  })

  test("return date before travel date", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ travelDate: isoDay(20), returnDate: isoDay(18) }) })
    assert.equal(response.status, 422)
    assert.deepEqual(response.json.errors, [{ field: "returnDate", message: "Return date cannot be before the travel date." }])
  })

  test("same-day return is allowed", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ travelDate: isoDay(10), returnDate: isoDay(10) }) })
    assert.equal(response.status, 201)
  })

  test("groups of up to 60 are accepted", async () => {
    for (const passengerCount of [1, 21, 45, 60]) {
      const response = await api("/api/enquiries", { body: validEnquiry({ passengerCount }) })
      assert.equal(response.status, 201, String(passengerCount))
    }
  })

  test("invalid passenger count", async () => {
    for (const passengerCount of [0, -3, 61, 2.5, "lots"]) {
      const response = await api("/api/enquiries", { body: validEnquiry({ passengerCount }) })
      assert.equal(response.status, 422, String(passengerCount))
      assert.deepEqual(fieldsOf(response.json), ["passengerCount"], String(passengerCount))
    }
  })

  test("very long message", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ message: "a".repeat(1001) }) })
    assert.equal(response.status, 422)
    assert.deepEqual(fieldsOf(response.json), ["message"])
  })

  test("message containing links is rejected", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ message: "cheap deals at https://spam.example" }) })
    assert.equal(response.status, 422)
    assert.deepEqual(fieldsOf(response.json), ["message"])
  })

  test("markup in the message is stored as plain text, control characters removed", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ message: "<script>alert(1)</script>\u0000 Pickup at <b>Hadapsar</b>" }) })
    assert.equal(response.status, 201)
    const stored = await prisma.enquiry.findUniqueOrThrow({ where: { id: response.json.enquiryId } })
    assert.equal(stored.message, "<script>alert(1)</script> Pickup at <b>Hadapsar</b>")
  })

  test("empty request", async () => {
    const empty = await api("/api/enquiries", { rawBody: "" })
    assert.equal(empty.status, 400)
    assert.equal(empty.json.success, false)

    const emptyObject = await api("/api/enquiries", { body: {} })
    assert.equal(emptyObject.status, 422)
    assert.deepEqual(fieldsOf(emptyObject.json).sort(), ["destination", "fullName", "passengerCount", "phone", "returnDate", "travelDate", "travelType"])
  })

  test("malformed JSON and wrong content type", async () => {
    const malformed = await api("/api/enquiries", { rawBody: "{not json" })
    assert.equal(malformed.status, 400)
    assert.equal(malformed.json.message, "The request body is not valid JSON.")

    const notJson = await api("/api/enquiries", { method: "POST", rawBody: "fullName=x", headers: { "Content-Type": "application/x-www-form-urlencoded" } })
    assert.equal(notJson.status, 415)

    const array = await api("/api/enquiries", { rawBody: "[1,2]" })
    assert.equal(array.status, 400)
  })

  test("request body over the size limit is refused", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ message: "x".repeat(20_000) }) })
    assert.equal(response.status, 413)
    assert.equal(response.json.code, "PAYLOAD_TOO_LARGE")
  })

  test("honeypot submissions look successful but are not stored", async () => {
    const before = await prisma.enquiry.count()
    const response = await api("/api/enquiries", { body: validEnquiry({ website: "http://bot.example" }) })
    assert.equal(response.status, 201)
    assert.equal(response.json.success, true)
    assert.equal(await prisma.enquiry.count(), before)
  })

  test("unknown fields are ignored, status and source cannot be set by the visitor", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ status: "CONFIRMED", source: "INSTAGRAM", deletedAt: "2020-01-01" }) })
    assert.equal(response.status, 201)
    const stored = await prisma.enquiry.findUniqueOrThrow({ where: { id: response.json.enquiryId } })
    assert.equal(stored.status, "NEW")
    assert.equal(stored.source, "WEBSITE")
    assert.equal(stored.deletedAt, null)
  })

  test("Marathi names and destinations are accepted", async () => {
    const response = await api("/api/enquiries", { body: validEnquiry({ fullName: "उमेश पानपट", destination: "महाबळेश्वर", locale: "mr" }) })
    assert.equal(response.status, 201)
  })
})
