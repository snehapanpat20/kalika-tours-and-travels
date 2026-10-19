import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import sharp from "sharp"
import { BASE, CONTENT_ADMIN, api, apiForm, createAdmin, login, page, prisma, resetDatabase } from "./helpers"

async function photo(color = { r: 200, g: 120, b: 60 }) {
  return {
    data: await sharp({ create: { width: 1200, height: 800, channels: 3, background: color } }).png().toBuffer(),
    type: "image/png",
    name: "vehicle.png",
  }
}

const fileStatus = async (url: string) => (await fetch(`${BASE}${url}`)).status

describe("Admin › Fleet", () => {
  let cookie = ""

  before(async () => {
    await resetDatabase()
    await createAdmin(CONTENT_ADMIN)
    cookie = (await login(CONTENT_ADMIN.email, CONTENT_ADMIN.password)).cookie
  })
  after(() => prisma.$disconnect())

  test("every fleet endpoint refuses visitors who are not signed in", async () => {
    const id = "00000000-0000-4000-8000-000000000000"
    const responses = await Promise.all([
      api("/api/admin/vehicles"),
      api("/api/admin/vehicles", { body: { name: "Sneaky", category: "BUS" } }),
      api(`/api/admin/vehicles/${id}`, { method: "PATCH", body: { published: true } }),
      api(`/api/admin/vehicles/${id}`, { method: "DELETE" }),
      api("/api/admin/vehicles/order", { method: "PUT", body: { ids: [id] } }),
      api("/api/admin/vehicles/import", { body: {} }),
      apiForm(`/api/admin/vehicles/${id}/photos`, { image: await photo() }),
      api(`/api/admin/vehicles/${id}/photos/${id}`, { method: "DELETE" }),
    ])
    for (const response of responses) assert.equal(response.status, 401)
    assert.equal(await prisma.vehicle.count(), 0)
  })

  test("before anything is added, Our Fleet shows the built-in list, including the new vehicles", async () => {
    const html = (await page("/en/traveller")).html
    for (const name of ["20 Seater Traveller", "17 Seater AC Traveller", "17 Seater Non-AC Traveller", "Innova Crysta — 7 Seater", "Ertiga — 6 Seater", "45 Seater Bus"]) {
      assert.ok(html.includes(name), name)
    }
  })

  test("importing copies the website's vehicles once, with a draft push-back vehicle, and never duplicates", async () => {
    const first = await api("/api/admin/vehicles/import", { cookie, body: {} })
    assert.equal(first.status, 201)
    assert.equal(first.json.count, 10)
    const again = await api("/api/admin/vehicles/import", { cookie, body: {} })
    assert.equal(again.status, 200)
    assert.equal(again.json.count, 0)
    assert.equal(await prisma.vehicle.count(), 10)

    const pushBack = await prisma.vehicle.findUniqueOrThrow({ where: { key: "pushBackVehicle" } })
    assert.equal(pushBack.published, false)
    assert.equal(pushBack.capacity, null)
    const traveller = await prisma.vehicle.findUniqueOrThrow({ where: { key: "traveller" }, include: { photos: true } })
    assert.equal(traveller.photos.length, 2)
    assert.equal(traveller.photos.filter((item) => item.isCover).length, 1)

    const html = (await page("/en/traveller")).html
    assert.ok(html.includes("Innova Crysta — 7 Seater") && html.includes("17 Seater AC Traveller"))
    assert.ok(!html.includes("Push-Back Seat Vehicle"), "drafts stay off the website")
    assert.ok((await page("/mr/traveller")).html.includes("इनोव्हा क्रिस्टा — 7 आसनी"), "Marathi names")
  })

  test("create, validate, publish, unpublish and delete a vehicle", async () => {
    const bad = await api("/api/admin/vehicles", { cookie, body: { name: "", category: "SPACESHIP", capacity: "0" } })
    assert.equal(bad.status, 422)
    const fields = new Set(bad.json.errors.map((issue: { field: string }) => issue.field))
    for (const field of ["name", "category", "capacity"]) assert.ok(fields.has(field), field)

    const created = await api("/api/admin/vehicles", { cookie, body: { name: "Test Mini Coach", nameMr: "चाचणी मिनी कोच", capacity: "15", ac: "AC", category: "BUS" } })
    assert.equal(created.status, 201)
    const id = created.json.vehicle.id
    assert.equal(created.json.vehicle.published, false, "new vehicles start as drafts")
    assert.ok(!(await page("/en/traveller")).html.includes("Test Mini Coach"))

    assert.equal((await api(`/api/admin/vehicles/${id}`, { cookie, method: "PATCH", body: { published: true } })).status, 200)
    const published = (await page("/en/traveller")).html
    assert.ok(published.includes("Test Mini Coach") && published.includes("15 seats"))

    assert.equal((await api(`/api/admin/vehicles/${id}`, { cookie, method: "PATCH", body: { published: false } })).status, 200)
    assert.ok(!(await page("/en/traveller")).html.includes("Test Mini Coach"))

    assert.equal((await api(`/api/admin/vehicles/${id}`, { cookie, method: "DELETE" })).status, 200)
    assert.equal((await api(`/api/admin/vehicles/${id}`, { cookie })).status, 404)
  })

  test("reorder saves the new order, and a stale list is refused", async () => {
    const list = await api("/api/admin/vehicles", { cookie })
    const ids: string[] = list.json.items.map((item: { id: string }) => item.id)
    const reversed = [...ids].reverse()
    assert.equal((await api("/api/admin/vehicles/order", { cookie, method: "PUT", body: { ids: reversed } })).status, 200)
    const after = await api("/api/admin/vehicles", { cookie })
    assert.deepEqual(
      after.json.items.map((item: { id: string }) => item.id),
      reversed,
    )
    assert.equal((await api("/api/admin/vehicles/order", { cookie, method: "PUT", body: { ids: reversed.slice(1) } })).status, 409)
  })

  test("photos: upload, website photo, cover, order, replace, remove", async () => {
    const id = (await api("/api/admin/vehicles", { cookie, body: { name: "Photo Test Bus", capacity: "32", ac: "BOTH", category: "BUS", published: true } })).json.vehicle.id

    const first = await apiForm(`/api/admin/vehicles/${id}/photos`, { image: await photo(), alt: "Front of the bus" }, { cookie })
    assert.equal(first.status, 201)
    const uploaded = first.json.vehicle.photos[0]
    assert.match(uploaded.url, /^\/media\/fleet\/[0-9a-f-]{36}\.webp$/, "uploads are re-encoded as WebP under a random name")
    assert.equal(uploaded.isCover, true, "the first photo becomes the cover")
    assert.equal(await fileStatus(uploaded.url), 200)

    const second = await apiForm(`/api/admin/vehicles/${id}/photos`, { imagePath: "/images/fleet/traveller-interior.jpg" }, { cookie })
    assert.equal(second.status, 201)
    const website = second.json.vehicle.photos[1]

    // A file that is not an image, a path outside public/images, and a cross-site request are refused
    assert.equal((await apiForm(`/api/admin/vehicles/${id}/photos`, { image: { data: Buffer.from("not an image"), type: "image/png", name: "x.png" } }, { cookie })).status, 422)
    assert.equal((await apiForm(`/api/admin/vehicles/${id}/photos`, { imagePath: "/images/../../.env.local" }, { cookie })).status, 422)
    assert.equal((await apiForm(`/api/admin/vehicles/${id}/photos`, { image: await photo() }, { cookie, origin: "https://evil.example" })).status, 403)

    // Website photo first, and make it the cover
    const arranged = await api(`/api/admin/vehicles/${id}/photos`, { cookie, method: "PUT", body: { ids: [website.id, uploaded.id], coverId: website.id } })
    assert.equal(arranged.status, 200)
    assert.deepEqual(
      arranged.json.vehicle.photos.map((item: { id: string; isCover: boolean }) => [item.id, item.isCover]),
      [
        [website.id, true],
        [uploaded.id, false],
      ],
    )

    // Replace the upload: the new file is served, the old one is deleted
    const replaced = await apiForm(`/api/admin/vehicles/${id}/photos/${uploaded.id}`, { image: await photo({ r: 20, g: 90, b: 160 }), alt: "Side of the bus" }, { cookie, method: "PATCH" })
    assert.equal(replaced.status, 200)
    const newUrl = replaced.json.vehicle.photos.find((item: { id: string }) => item.id === uploaded.id).url
    assert.notEqual(newUrl, uploaded.url)
    assert.equal(await fileStatus(newUrl), 200)
    assert.equal(await fileStatus(uploaded.url), 404, "the replaced file is removed")

    const html = (await page("/en/traveller")).html
    assert.ok(html.includes("Photo Test Bus") && html.includes("AC / Non-AC"))

    // Remove the cover: the other photo becomes the cover
    const removed = await api(`/api/admin/vehicles/${id}/photos/${website.id}`, { cookie, method: "DELETE" })
    assert.equal(removed.status, 200)
    assert.equal(removed.json.vehicle.photos.length, 1)
    assert.equal(removed.json.vehicle.photos[0].isCover, true)

    // Deleting the vehicle removes its photos and their files
    assert.equal((await api(`/api/admin/vehicles/${id}`, { cookie, method: "DELETE" })).status, 200)
    assert.equal(await prisma.vehiclePhoto.count({ where: { vehicleId: id } }), 0)
    assert.equal(await fileStatus(newUrl), 404)
  })

  test("fleet changes are recorded in the activity log", async () => {
    const actions = new Set((await prisma.auditLog.findMany({ where: { entityType: "Vehicle" } })).map((row) => row.action))
    for (const action of ["import", "create", "publish", "unpublish", "delete", "reorder", "photo_add", "photo_arrange", "photo_update", "photo_delete"]) assert.ok(actions.has(action), action)
  })
})
