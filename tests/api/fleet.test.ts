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

  /** What a public page offers of a vehicle: its "Enquire Now" link, or its trip-form option. */
  const listed = (html: string, key: string) => html.includes(`vehicle=${key}`) || html.includes(`value="${key}"`)
  const publicPages = async () => ({
    home: (await page("/en")).html,
    fleet: (await page("/en/traveller")).html,
    form: (await page("/en/plan-your-trip")).html,
  })

  test("before any vehicle is published, no page shows a built-in list", async () => {
    const pages = await publicPages()
    assert.ok(pages.fleet.includes("Our vehicles will be listed here soon."), "Our Fleet shows the empty state")
    assert.ok(!pages.home.includes('id="explore-fleet-title"'), "the homepage fleet section is left out")
    for (const key of ["traveller", "ertiga", "innova", "bus45", "sleeper34"]) {
      for (const [name, html] of Object.entries(pages)) assert.ok(!listed(html, key), `${name} lists ${key}`)
    }
  })

  test("importing copies only the Traveller, Ertiga and Innova Crysta, once, and they appear everywhere", async () => {
    const first = await api("/api/admin/vehicles/import", { cookie, body: {} })
    assert.equal(first.status, 201)
    assert.equal(first.json.count, 3)
    const again = await api("/api/admin/vehicles/import", { cookie, body: {} })
    assert.equal(again.status, 200)
    assert.equal(again.json.count, 0)
    assert.deepEqual((await prisma.vehicle.findMany({ orderBy: { sortOrder: "asc" } })).map((row) => [row.key, row.name, row.published]), [
      ["traveller", "20-Seater Traveller", true],
      ["ertiga", "Maruti Suzuki Ertiga", true],
      ["innova", "Toyota Innova Crysta", true],
    ])
    const traveller = await prisma.vehicle.findUniqueOrThrow({ where: { key: "traveller" }, include: { photos: true } })
    assert.equal(traveller.photos.length, 2)
    assert.equal(traveller.photos.filter((item) => item.isCover).length, 1)

    const pages = await publicPages()
    for (const key of ["traveller", "ertiga", "innova"]) {
      for (const [name, html] of Object.entries(pages)) assert.ok(listed(html, key), `${name} lists ${key}`)
    }
    assert.ok(pages.fleet.includes("Travel together comfortably in our 20-passenger Traveller"), "the Traveller's longer description is under View details")
    assert.ok((await page("/mr/traveller")).html.includes("टोयोटा इनोव्हा क्रिस्टा"), "Marathi names")
  })

  test("editing a listed vehicle's name and description updates the public pages in both languages", async () => {
    const innova = await prisma.vehicle.findUniqueOrThrow({ where: { key: "innova" } })
    const body = { name: "Innova Crysta Test Name", nameMr: "इनोव्हा चाचणी नाव", description: "Edited test description.", descriptionMr: "बदललेले चाचणी वर्णन." }
    assert.equal((await api(`/api/admin/vehicles/${innova.id}`, { cookie, method: "PATCH", body })).status, 200)
    const [home, fleet, mr] = [(await page("/en")).html, (await page("/en/traveller")).html, (await page("/mr/traveller")).html]
    assert.ok(home.includes("Innova Crysta Test Name") && fleet.includes("Innova Crysta Test Name"))
    assert.ok(fleet.includes("Edited test description."))
    assert.ok(mr.includes("इनोव्हा चाचणी नाव") && mr.includes("बदललेले चाचणी वर्णन."))
    // The longer description under "View details" is the site's own text for the Innova
    assert.ok(fleet.includes("Its spacious MPV layout and comfortable cabin"))
    // Put the original wording back
    const original = { name: innova.name, nameMr: innova.nameMr, description: innova.description, descriptionMr: innova.descriptionMr }
    assert.equal((await api(`/api/admin/vehicles/${innova.id}`, { cookie, method: "PATCH", body: original })).status, 200)
  })

  test("a deleted or unpublished vehicle leaves every public page, and nothing built-in replaces it", async () => {
    const ertiga = await prisma.vehicle.findUniqueOrThrow({ where: { key: "ertiga" } })
    assert.equal((await api(`/api/admin/vehicles/${ertiga.id}`, { cookie, method: "DELETE" })).status, 200)
    let pages = await publicPages()
    for (const [name, html] of Object.entries(pages)) {
      assert.ok(!listed(html, "ertiga"), `${name} still lists the deleted Ertiga`)
      assert.ok(listed(html, "innova"), `${name} lost the Innova`)
    }

    const innova = await prisma.vehicle.findUniqueOrThrow({ where: { key: "innova" } })
    assert.equal((await api(`/api/admin/vehicles/${innova.id}`, { cookie, method: "PATCH", body: { published: false } })).status, 200)
    pages = await publicPages()
    for (const [name, html] of Object.entries(pages)) assert.ok(!listed(html, "innova"), `${name} still lists the unpublished Innova`)

    // With nothing published, the pages are empty rather than falling back to an old list
    const traveller = await prisma.vehicle.findUniqueOrThrow({ where: { key: "traveller" } })
    assert.equal((await api(`/api/admin/vehicles/${traveller.id}`, { cookie, method: "PATCH", body: { published: false } })).status, 200)
    pages = await publicPages()
    assert.ok(pages.fleet.includes("Our vehicles will be listed here soon."))
    for (const [name, html] of Object.entries(pages)) assert.ok(!listed(html, "traveller") && !listed(html, "ertiga"), `${name} shows a vehicle`)

    // Put the Innova and the Traveller back for the tests that follow (re-import brings the Ertiga back)
    for (const id of [innova.id, traveller.id]) await api(`/api/admin/vehicles/${id}`, { cookie, method: "PATCH", body: { published: true } })
    assert.equal((await api("/api/admin/vehicles/import", { cookie, body: {} })).json.count, 1)
  })

  test("create, validate, publish, unpublish and delete a vehicle (other vehicles stay off the website)", async () => {
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
    // Only the Traveller, Ertiga and Innova Crysta are listed, even when another vehicle is published
    for (const path of ["/en", "/en/traveller", "/en/plan-your-trip"]) assert.ok(!(await page(path)).html.includes("Test Mini Coach"), path)
    assert.equal((await api(`/api/admin/vehicles/${id}`, { cookie })).json.vehicle.published, true, "it is still published in Admin › Fleet")

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

    assert.ok(!(await page("/en/traveller")).html.includes("Photo Test Bus"), "not one of the three listed vehicles")

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
