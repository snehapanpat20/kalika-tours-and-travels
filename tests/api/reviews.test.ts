import assert from "node:assert/strict"
import { after, before, beforeEach, describe, test } from "node:test"
import sharp from "sharp"
import { BASE, api, apiForm, createAdmin, freshIp, login, page, prisma, resetDatabase } from "./helpers"

const validReview = (overrides: Record<string, string> = {}) => ({
  customerName: "Sunita Deshmukh",
  destination: "Mahabaleshwar",
  tripType: "FAMILY",
  rating: "5",
  reviewText: "Comfortable seats and a careful driver. The whole family enjoyed the trip.",
  locale: "en",
  website: "",
  ...overrides,
})

/** A JPEG carrying GPS coordinates in its EXIF data, like a phone photo. */
async function phonePhoto() {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 30, g: 120, b: 110 } } })
    .jpeg()
    .withExif({ IFD0: { Make: "TestPhone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "18/1 30/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "73/1 56/1 0/1" } })
    .toBuffer()
}

describe("Customer reviews", () => {
  let cookie = ""

  before(async () => {
    await resetDatabase()
    await createAdmin()
    cookie = (await login()).cookie
  })
  beforeEach(() => prisma.review.deleteMany())
  after(() => prisma.$disconnect())

  test("a valid review is stored as PENDING with the promised message", async () => {
    const response = await apiForm("/api/reviews", validReview())
    assert.equal(response.status, 201)
    assert.equal(response.json.success, true)
    assert.equal(response.json.status, "PENDING")
    assert.equal(
      response.json.message,
      "Thank you for sharing your experience. Your review has been received and will be reviewed before being published.",
    )
    const rows = await prisma.review.findMany()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].status, "PENDING")
    assert.equal(rows[0].customerName, "Sunita Deshmukh")
  })

  test("the client cannot publish its own review", async () => {
    const response = await apiForm("/api/reviews", { ...validReview(), status: "APPROVED" })
    assert.equal(response.status, 201)
    const row = await prisma.review.findFirstOrThrow()
    assert.equal(row.status, "PENDING")
  })

  test("pending reviews are not shown on the website", async () => {
    await apiForm("/api/reviews", validReview({ customerName: "Pending Person" }))
    const reviewsPage = await page("/en/reviews")
    assert.equal(reviewsPage.status, 200)
    assert.ok(!reviewsPage.html.includes("Pending Person"))
    assert.ok(reviewsPage.html.includes("Your journey could be our next story."))
  })

  test("required fields and limits are validated", async () => {
    const response = await apiForm("/api/reviews", validReview({ customerName: "", destination: "", rating: "6", reviewText: "Too short" }))
    assert.equal(response.status, 422)
    const fields = response.json.errors.map((issue: { field: string }) => issue.field).sort()
    assert.deepEqual(fields, ["customerName", "destination", "rating", "reviewText"])
    assert.equal(await prisma.review.count(), 0)
  })

  test("links in the review text are refused", async () => {
    const response = await apiForm("/api/reviews", validReview({ reviewText: "Great trip, also visit https://spam.example for deals" }))
    assert.equal(response.status, 422)
    assert.equal(response.json.errors[0].field, "reviewText")
  })

  test("a filled honeypot looks successful but stores nothing", async () => {
    const response = await apiForm("/api/reviews", validReview({ website: "http://bot.example" }))
    assert.equal(response.status, 201)
    assert.equal(await prisma.review.count(), 0)
  })

  test("JSON bodies are refused: the endpoint takes multipart form data", async () => {
    const response = await api("/api/reviews", { body: validReview() })
    assert.equal(response.status, 415)
  })

  test("a photo is re-encoded to WebP with location data removed", async () => {
    const response = await apiForm("/api/reviews", { ...validReview(), photo: { data: await phonePhoto(), type: "image/jpeg", name: "trip.jpg" } })
    assert.equal(response.status, 201)
    const row = await prisma.review.findFirstOrThrow()
    assert.match(row.photoUrl ?? "", /^\/media\/reviews\/[0-9a-f-]{36}\.webp$/)
    const image = await fetch(`${BASE}${row.photoUrl}`)
    assert.equal(image.status, 200)
    assert.equal(image.headers.get("content-type"), "image/webp")
    assert.equal(image.headers.get("x-content-type-options"), "nosniff")
    const meta = await sharp(Buffer.from(await image.arrayBuffer())).metadata()
    assert.equal(meta.format, "webp")
    assert.equal(meta.exif, undefined, "EXIF (including GPS) must be stripped")
  })

  test("a file that is not an image is refused", async () => {
    const response = await apiForm("/api/reviews", {
      ...validReview(),
      photo: { data: Buffer.from("<script>alert(1)</script>"), type: "image/jpeg", name: "evil.jpg" },
    })
    assert.equal(response.status, 422)
    assert.equal(response.json.errors[0].field, "photo")
    assert.equal(await prisma.review.count(), 0)
  })

  test("a photo over 5 MB is refused", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 1)
    const response = await apiForm("/api/reviews", { ...validReview(), photo: { data: big, type: "image/jpeg", name: "big.jpg" } })
    assert.ok([413, 422].includes(response.status), `expected 413 or 422, got ${response.status}`)
    assert.equal(await prisma.review.count(), 0)
  })

  test("submissions are rate limited per visitor", async () => {
    const ip = freshIp()
    const statuses = []
    for (const name of ["Asha Patil", "Bina Shah", "Chitra Rao", "Deepa Nair"]) statuses.push((await apiForm("/api/reviews", validReview({ customerName: name }), { ip })).status)
    assert.deepEqual(statuses, [201, 201, 201, 429])
  })

  describe("moderation", () => {
    test("admin endpoints refuse requests without a session", async () => {
      await apiForm("/api/reviews", validReview())
      const id = (await prisma.review.findFirstOrThrow()).id
      const responses = await Promise.all([
        api("/api/admin/reviews"),
        api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { status: "APPROVED" } }),
        api(`/api/admin/reviews/${id}`, { method: "DELETE" }),
      ])
      for (const response of responses) assert.equal(response.status, 401)
      assert.equal((await prisma.review.findUniqueOrThrow({ where: { id } })).status, "PENDING")
    })

    test("a cross-site request with the admin cookie is refused", async () => {
      await apiForm("/api/reviews", validReview())
      const id = (await prisma.review.findFirstOrThrow()).id
      const response = await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { status: "APPROVED" }, cookie, origin: "https://evil.example" })
      assert.equal(response.status, 403)
    })

    test("list with counts per status", async () => {
      await apiForm("/api/reviews", validReview({ customerName: "First Person" }))
      await apiForm("/api/reviews", validReview({ customerName: "Second Person" }))
      const response = await api("/api/admin/reviews?status=PENDING", { cookie })
      assert.equal(response.status, 200)
      assert.equal(response.json.reviews.length, 2)
      assert.deepEqual(response.json.counts, { PENDING: 2, APPROVED: 0, REJECTED: 0 })
    })

    test("approving publishes the review; rejecting hides it again", async () => {
      await apiForm("/api/reviews", validReview({ customerName: "Approved Person" }))
      const id = (await prisma.review.findFirstOrThrow()).id

      const approve = await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { status: "APPROVED" }, cookie })
      assert.equal(approve.status, 200)
      assert.equal(approve.json.review.status, "APPROVED")
      assert.ok(approve.json.review.moderatedAt)
      assert.ok((await page("/en/reviews")).html.includes("Approved Person"))

      const reject = await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { status: "REJECTED" }, cookie })
      assert.equal(reject.status, 200)
      assert.ok(!(await page("/en/reviews")).html.includes("Approved Person"))
    })

    test("no average rating is shown for fewer than five reviews", async () => {
      await apiForm("/api/reviews", validReview())
      const id = (await prisma.review.findFirstOrThrow()).id
      await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { status: "APPROVED" }, cookie })
      const html = (await page("/en/reviews")).html
      assert.ok(!/out of 5, from \d+ reviews/.test(html))
    })

    test("details can be corrected, but not the customer's words", async () => {
      await apiForm("/api/reviews", validReview())
      const id = (await prisma.review.findFirstOrThrow()).id
      const edit = await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { customerName: "Sunita D.", destination: "Panchgani" }, cookie })
      assert.equal(edit.status, 200)
      assert.equal(edit.json.review.customerName, "Sunita D.")
      assert.equal(edit.json.review.destination, "Panchgani")

      const textOnly = await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { reviewText: "Rewritten by someone else" }, cookie })
      assert.equal(textOnly.status, 422)
      assert.match((await prisma.review.findUniqueOrThrow({ where: { id } })).reviewText, /^Comfortable seats/)
    })

    test("an invalid status is refused", async () => {
      await apiForm("/api/reviews", validReview())
      const id = (await prisma.review.findFirstOrThrow()).id
      const response = await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { status: "PUBLISHED" }, cookie })
      assert.equal(response.status, 422)
    })

    test("deleting removes the review and its photo file", async () => {
      await apiForm("/api/reviews", { ...validReview(), photo: { data: await phonePhoto(), type: "image/jpeg", name: "trip.jpg" } })
      const row = await prisma.review.findFirstOrThrow()
      assert.equal((await fetch(`${BASE}${row.photoUrl}`)).status, 200)

      const response = await api(`/api/admin/reviews/${row.id}`, { method: "DELETE", cookie })
      assert.equal(response.status, 200)
      assert.equal(await prisma.review.count(), 0)
      assert.equal((await fetch(`${BASE}${row.photoUrl}`)).status, 404)
    })

    test("an unknown review id gives 404", async () => {
      const response = await api("/api/admin/reviews/00000000-0000-4000-8000-000000000000", { method: "DELETE", cookie })
      assert.equal(response.status, 404)
    })
  })
})
