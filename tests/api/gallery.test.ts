import assert from "node:assert/strict"
import { after, before, beforeEach, describe, test } from "node:test"
import sharp from "sharp"
import { BASE, api, apiForm, createAdmin, login, page, prisma, resetDatabase } from "./helpers"

async function photo(width = 1200, height = 800) {
  return {
    data: await sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } } }).png().toBuffer(),
    type: "image/png",
    name: "trip.png",
  }
}

const fields = (overrides: Record<string, string> = {}) => ({
  title: "Sunrise at Mahabaleshwar",
  caption: "The group at Arthur's Seat before breakfast.",
  destination: "Mahabaleshwar",
  tripType: "GROUP",
  tripDate: "2026-05-14",
  sortOrder: "1",
  published: "true",
  featured: "false",
  ...overrides,
})

describe("Admin gallery", () => {
  let cookie = ""

  before(async () => {
    await resetDatabase()
    await createAdmin()
    cookie = (await login()).cookie
  })
  beforeEach(() => prisma.galleryItem.deleteMany())
  after(() => prisma.$disconnect())

  test("every gallery endpoint requires an admin session", async () => {
    const id = "00000000-0000-4000-8000-000000000000"
    const responses = await Promise.all([
      api("/api/admin/gallery"),
      apiForm("/api/admin/gallery", { ...fields(), image: await photo() }),
      api(`/api/admin/gallery/${id}`),
      apiForm(`/api/admin/gallery/${id}`, { published: "true" }, { method: "PATCH" }),
      api(`/api/admin/gallery/${id}`, { method: "DELETE" }),
    ])
    for (const response of responses) assert.equal(response.status, 401)
    assert.equal(await prisma.galleryItem.count(), 0)
  })

  test("a cross-site upload with the admin cookie is refused", async () => {
    const response = await apiForm("/api/admin/gallery", { ...fields(), image: await photo() }, { cookie, origin: "https://evil.example" })
    assert.equal(response.status, 403)
    assert.equal(await prisma.galleryItem.count(), 0)
  })

  test("upload a photo: stored as WebP, resized, served from /media", async () => {
    const response = await apiForm("/api/admin/gallery", { ...fields(), image: await photo(4000, 3000) }, { cookie })
    assert.equal(response.status, 201)
    const item = response.json.item
    assert.match(item.imageUrl, /^\/media\/gallery\/[0-9a-f-]{36}\.webp$/)
    assert.equal(item.uploaded, true)
    assert.equal(item.width, 2400)
    assert.equal(item.height, 1800)
    assert.equal(item.tripDate, "2026-05-14")
    const image = await fetch(`${BASE}${item.imageUrl}`)
    assert.equal(image.status, 200)
    assert.equal(image.headers.get("content-type"), "image/webp")
  })

  test("use a photo already on the website", async () => {
    const response = await apiForm("/api/admin/gallery", { ...fields(), imagePath: "/images/gallery/road.jpg" }, { cookie })
    assert.equal(response.status, 201)
    assert.equal(response.json.item.imageUrl, "/images/gallery/road.jpg")
    assert.equal(response.json.item.uploaded, false)
    assert.ok(response.json.item.width > 0)
  })

  test("website image paths outside public/images are refused", async () => {
    for (const imagePath of ["/images/../../.env.local", "/etc/passwd", "https://evil.example/x.jpg", "/images/missing/nope.jpg"]) {
      const response = await apiForm("/api/admin/gallery", { ...fields(), imagePath }, { cookie })
      assert.equal(response.status, 422, imagePath)
    }
    assert.equal(await prisma.galleryItem.count(), 0)
  })

  test("a photo is required, and the title", async () => {
    const noImage = await apiForm("/api/admin/gallery", fields(), { cookie })
    assert.equal(noImage.status, 422)
    assert.equal(noImage.json.errors[0].field, "image")

    const noTitle = await apiForm("/api/admin/gallery", { ...fields({ title: "" }), image: await photo() }, { cookie })
    assert.equal(noTitle.status, 422)
    assert.equal(noTitle.json.errors[0].field, "title")
  })

  test("a file that is not an image is refused", async () => {
    const response = await apiForm("/api/admin/gallery", { ...fields(), image: { data: Buffer.from("not an image"), type: "image/png", name: "x.png" } }, { cookie })
    assert.equal(response.status, 422)
    assert.equal(await prisma.galleryItem.count(), 0)
  })

  test("published photos appear on the website; drafts do not", async () => {
    await apiForm("/api/admin/gallery", { ...fields({ title: "Visible Photo Title" }), imagePath: "/images/gallery/road.jpg" }, { cookie })
    await apiForm("/api/admin/gallery", { ...fields({ title: "Draft Photo Title", published: "false" }), imagePath: "/images/gallery/place.jpg" }, { cookie })
    const html = (await page("/en/gallery")).html
    assert.ok(html.includes("Visible Photo Title"))
    assert.ok(!html.includes("Draft Photo Title"))
  })

  test("photos appear on the gallery page, featured or not; the homepage does not preview them", async () => {
    await apiForm("/api/admin/gallery", { ...fields({ title: "Featured Home Photo", featured: "true" }), imagePath: "/images/gallery/road.jpg" }, { cookie })
    await apiForm("/api/admin/gallery", { ...fields({ title: "Plain Gallery Photo" }), imagePath: "/images/gallery/place.jpg" }, { cookie })
    const gallery = (await page("/en/gallery")).html
    assert.ok(gallery.includes("Featured Home Photo"))
    assert.ok(gallery.includes("Plain Gallery Photo"))
    const home = (await page("/en")).html
    assert.ok(!home.includes("Featured Home Photo"))
    assert.ok(!home.includes("Plain Gallery Photo"))
  })

  test("a partial update changes only the fields sent", async () => {
    const created = await apiForm("/api/admin/gallery", { ...fields({ featured: "true", sortOrder: "7" }), imagePath: "/images/gallery/road.jpg" }, { cookie })
    const id = created.json.item.id
    const response = await apiForm(`/api/admin/gallery/${id}`, { published: "false" }, { method: "PATCH", cookie })
    assert.equal(response.status, 200)
    const item = response.json.item
    assert.equal(item.published, false)
    assert.equal(item.featured, true)
    assert.equal(item.sortOrder, 7)
    assert.equal(item.caption, "The group at Arthur's Seat before breakfast.")
    assert.equal(item.destination, "Mahabaleshwar")
    assert.equal(item.tripDate, "2026-05-14")
  })

  test("replacing an uploaded image deletes the old file", async () => {
    const created = await apiForm("/api/admin/gallery", { ...fields(), image: await photo() }, { cookie })
    const oldUrl = created.json.item.imageUrl
    const updated = await apiForm(`/api/admin/gallery/${created.json.item.id}`, { image: await photo(900, 900) }, { method: "PATCH", cookie })
    assert.equal(updated.status, 200)
    assert.notEqual(updated.json.item.imageUrl, oldUrl)
    assert.equal((await fetch(`${BASE}${oldUrl}`)).status, 404)
    assert.equal((await fetch(`${BASE}${updated.json.item.imageUrl}`)).status, 200)
  })

  test("search, filter and paginate", async () => {
    for (let i = 0; i < 5; i++) {
      await apiForm("/api/admin/gallery", { ...fields({ title: `Konkan beach ${i}`, destination: "Konkan", published: i < 2 ? "true" : "false" }), imagePath: "/images/gallery/road.jpg" }, { cookie })
    }
    await apiForm("/api/admin/gallery", { ...fields({ title: "Shirdi darshan", destination: "Shirdi", tripType: "PILGRIMAGE" }), imagePath: "/images/gallery/place.jpg" }, { cookie })

    const search = await api("/api/admin/gallery?search=konkan", { cookie })
    assert.equal(search.json.pagination.total, 5)
    const drafts = await api("/api/admin/gallery?visibility=draft", { cookie })
    assert.equal(drafts.json.pagination.total, 3)
    const pilgrimage = await api("/api/admin/gallery?tripType=PILGRIMAGE", { cookie })
    assert.equal(pilgrimage.json.items[0].title, "Shirdi darshan")
    const paged = await api("/api/admin/gallery?pageSize=4&page=2", { cookie })
    assert.equal(paged.json.items.length, 2)
    assert.equal(paged.json.counts.published, 3)
    const bad = await api("/api/admin/gallery?visibility=everything", { cookie })
    assert.equal(bad.status, 422)
  })

  test("deleting removes the item and its uploaded file", async () => {
    const created = await apiForm("/api/admin/gallery", { ...fields(), image: await photo() }, { cookie })
    const response = await api(`/api/admin/gallery/${created.json.item.id}`, { method: "DELETE", cookie })
    assert.equal(response.status, 200)
    assert.equal(await prisma.galleryItem.count(), 0)
    assert.equal((await fetch(`${BASE}${created.json.item.imageUrl}`)).status, 404)
  })

  test("the media route only serves stored uploads", async () => {
    for (const path of ["/media/..%2F..%2F.env.local", "/media/gallery/not-a-uuid.webp", "/media/other/00000000-0000-4000-8000-000000000000.webp"]) {
      const response = await fetch(`${BASE}${path}`)
      // 404 from the route, or 400 when Next.js rejects the encoded path first
      assert.ok([400, 404].includes(response.status), `${path}: ${response.status}`)
      assert.notEqual(response.headers.get("content-type"), "image/webp")
    }
  })
})
