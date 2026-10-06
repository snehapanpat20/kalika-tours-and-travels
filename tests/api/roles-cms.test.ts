import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { ADMIN, BASE, CONTENT_ADMIN, ORIGIN, api, apiForm, createAdmin, login, page, prisma, resetDatabase } from "./helpers"

/** Super Admin and Content Admin: what each may do, enforced by the server. */
describe("Roles, permissions and the CMS", () => {
  let superCookie = ""
  let contentCookie = ""
  let superId = ""
  let contentId = ""

  before(async () => {
    await resetDatabase()
    superId = (await createAdmin(ADMIN)).id
    contentId = (await createAdmin(CONTENT_ADMIN)).id
    superCookie = (await login(ADMIN.email, ADMIN.password)).cookie
    contentCookie = (await login(CONTENT_ADMIN.email, CONTENT_ADMIN.password)).cookie
  })
  after(() => prisma.$disconnect())

  const iso = (offsetDays: number) => {
    const date = new Date(Date.now() + 5.5 * 3600_000 + offsetDays * 86_400_000)
    return date.toISOString().slice(0, 16)
  }

  // ─── Access control ──────────────────────────────────────

  test("signed-out requests to every new admin API get 401", async () => {
    const id = "00000000-0000-4000-8000-000000000000"
    const calls = [
      api("/api/admin/offers"),
      api("/api/admin/announcements"),
      api("/api/admin/destinations"),
      api("/api/admin/services"),
      api("/api/admin/content"),
      api("/api/admin/content/hero"),
      api("/api/admin/users"),
      api("/api/admin/audit-logs"),
      api("/api/admin/account"),
      api(`/api/admin/users/${id}`, { method: "PATCH", body: { role: "SUPER_ADMIN" } }),
      api("/api/admin/content/hero/publish", { method: "POST", body: {} }),
    ]
    for (const response of await Promise.all(calls)) assert.equal(response.status, 401)
  })

  test("a Content Admin can use business and content APIs", async () => {
    for (const path of ["/api/admin/dashboard", "/api/admin/enquiries", "/api/admin/gallery", "/api/admin/reviews", "/api/admin/offers", "/api/admin/announcements", "/api/admin/destinations", "/api/admin/services", "/api/admin/content", "/api/admin/content/traveller"]) {
      assert.equal((await api(path, { cookie: contentCookie })).status, 200, path)
    }
  })

  test("a Content Admin gets 403 from every Super Admin API", async () => {
    const calls = [
      api("/api/admin/users", { cookie: contentCookie }),
      api("/api/admin/audit-logs", { cookie: contentCookie }),
      api("/api/admin/users", { cookie: contentCookie, body: { name: "Sneaky", email: "x@kalika.test", role: "SUPER_ADMIN", password: "a-long-enough-password" } }),
      // Trying to promote themselves by editing the request
      api(`/api/admin/users/${contentId}`, { cookie: contentCookie, method: "PATCH", body: { role: "SUPER_ADMIN" } }),
      api(`/api/admin/users/${superId}/password`, { cookie: contentCookie, body: { password: "a-long-enough-password" } }),
    ]
    for (const response of await Promise.all(calls)) assert.equal(response.status, 403)
    const me = await prisma.admin.findUniqueOrThrow({ where: { id: contentId } })
    assert.equal(me.role, "CONTENT_ADMIN")
    assert.equal(await prisma.admin.count(), 2)
  })

  test("extra fields cannot grant access (role in the profile update is refused)", async () => {
    const response = await api("/api/admin/account", { cookie: contentCookie, method: "PATCH", body: { name: "Umesh", role: "SUPER_ADMIN" } })
    assert.equal(response.status, 422)
    assert.equal((await prisma.admin.findUniqueOrThrow({ where: { id: contentId } })).role, "CONTENT_ADMIN")
  })

  test("Super Admin pages answer 403 for a Content Admin and redirect when signed out", async () => {
    for (const path of ["/admin/users", "/admin/settings", "/admin/audit-logs"]) {
      const asContent = await fetch(`${BASE}${path}`, { headers: { Cookie: contentCookie }, redirect: "manual" })
      assert.equal(asContent.status, 403, path)
      const asSuper = await fetch(`${BASE}${path}`, { headers: { Cookie: superCookie }, redirect: "manual" })
      assert.equal(asSuper.status, 200, path)
    }
    const signedOut = await fetch(`${BASE}/admin/offers`, { redirect: "manual" })
    assert.ok([307, 308].includes(signedOut.status))
    assert.match(signedOut.headers.get("location") ?? "", /\/admin\/login/)
  })

  test("API responses never include password hashes or token versions", async () => {
    const lists = [await api("/api/admin/users", { cookie: superCookie }), await api("/api/admin/account", { cookie: contentCookie }), await api("/api/admin/auth/me", { cookie: contentCookie })]
    for (const response of lists) {
      const text = JSON.stringify(response.json)
      assert.ok(!/passwordHash|tokenVersion|scrypt/.test(text), text.slice(0, 200))
    }
  })

  // ─── Admin users ─────────────────────────────────────────

  test("Super Admin creates an admin who must choose a password at first sign-in", async () => {
    const created = await api("/api/admin/users", { cookie: superCookie, body: { name: "Umesh Panpat", email: "umesh@kalika.test", role: "CONTENT_ADMIN", password: "temporary-password-123" } })
    assert.equal(created.status, 201)
    assert.equal(created.json.user.mustChangePassword, true)

    const session = await login("umesh@kalika.test", "temporary-password-123")
    assert.equal(session.status, 200)
    // Until the password is changed, only their own account works
    assert.equal((await api("/api/admin/enquiries", { cookie: session.cookie })).status, 403)
    assert.equal((await api("/api/admin/account", { cookie: session.cookie })).status, 200)

    const wrong = await api("/api/admin/account/password", { cookie: session.cookie, body: { currentPassword: "not-it", newPassword: "my-own-new-password-1" } })
    assert.equal(wrong.status, 422)
    const changed = await api("/api/admin/account/password", { cookie: session.cookie, body: { currentPassword: "temporary-password-123", newPassword: "my-own-new-password-1" } })
    assert.equal(changed.status, 200)
    const fresh = changed.headers.get("set-cookie")?.split(";")[0] ?? ""
    assert.equal((await api("/api/admin/enquiries", { cookie: fresh })).status, 200)
    // The old session was signed out when the password changed
    assert.equal((await api("/api/admin/enquiries", { cookie: session.cookie })).status, 401)
    const stored = await prisma.admin.findUniqueOrThrow({ where: { email: "umesh@kalika.test" } })
    assert.notEqual(stored.passwordHash, "my-own-new-password-1")
    assert.equal(stored.mustChangePassword, false)
  })

  test("changing a role or disabling an admin takes effect immediately", async () => {
    const target = await prisma.admin.findUniqueOrThrow({ where: { email: "umesh@kalika.test" } })
    const session = await login("umesh@kalika.test", "my-own-new-password-1")

    const promoted = await api(`/api/admin/users/${target.id}`, { cookie: superCookie, method: "PATCH", body: { role: "SUPER_ADMIN" } })
    assert.equal(promoted.status, 200)
    assert.equal((await api("/api/admin/users", { cookie: session.cookie })).status, 401, "old session ends on role change")

    const disabled = await api(`/api/admin/users/${target.id}`, { cookie: superCookie, method: "PATCH", body: { isActive: false } })
    assert.equal(disabled.status, 200)
    const blocked = await login("umesh@kalika.test", "my-own-new-password-1")
    assert.equal(blocked.status, 403)
    // A wrong password still gets the usual answer, so disabled accounts are not revealed
    assert.equal((await login("umesh@kalika.test", "wrong-password")).status, 401)
  })

  test("admins can't demote or disable themselves; another Super Admin can change their role", async () => {
    assert.equal((await api(`/api/admin/users/${superId}`, { cookie: superCookie, method: "PATCH", body: { role: "CONTENT_ADMIN" } })).status, 403)
    assert.equal((await api(`/api/admin/users/${superId}`, { cookie: superCookie, method: "PATCH", body: { isActive: false } })).status, 403)
    assert.equal((await api(`/api/admin/users/${superId}/password`, { cookie: superCookie, body: { password: "a-long-enough-password" } })).status, 403)

    const other = await api("/api/admin/users", { cookie: superCookie, body: { name: "Second Super", email: "second@kalika.test", role: "SUPER_ADMIN", password: "second-super-password" } })
    await prisma.admin.update({ where: { id: other.json.user.id }, data: { mustChangePassword: false } })
    const secondCookie = (await login("second@kalika.test", "second-super-password")).cookie
    const demoted = await api(`/api/admin/users/${superId}`, { cookie: secondCookie, method: "PATCH", body: { role: "CONTENT_ADMIN" } })
    assert.equal(demoted.status, 200)
    assert.equal((await api("/api/admin/users", { cookie: superCookie })).status, 401, "the demoted admin's session ended")
    // Restore for the remaining tests
    assert.equal((await api(`/api/admin/users/${superId}`, { cookie: secondCookie, method: "PATCH", body: { role: "SUPER_ADMIN" } })).status, 200)
    superCookie = (await login(ADMIN.email, ADMIN.password)).cookie
  })

  test("new admin input is validated", async () => {
    const bad = await api("/api/admin/users", { cookie: superCookie, body: { name: "A", email: "not-an-email", role: "OWNER", password: "short" } })
    assert.equal(bad.status, 422)
    const fields = bad.json.errors.map((issue: { field: string }) => issue.field).sort()
    assert.deepEqual(fields, ["email", "name", "password", "role"])
    const duplicate = await api("/api/admin/users", { cookie: superCookie, body: { name: "Copy", email: ADMIN.email, role: "CONTENT_ADMIN", password: "a-long-enough-password" } })
    assert.equal(duplicate.status, 409)
  })

  // ─── Offers and announcements ────────────────────────────

  test("offers: drafts, scheduled and expired offers stay off the website; active ones show", async () => {
    const make = (title: string, extra: Record<string, string>) => apiForm("/api/admin/offers", { title, shortDescription: `${title} details`, ...extra }, { cookie: contentCookie })
    const draft = await make("Draft Offer Alpha", { published: "false" })
    const scheduled = await make("Scheduled Offer Beta", { published: "true", startsAt: iso(5) })
    const expired = await make("Expired Offer Gamma", { published: "true", startsAt: iso(-10), endsAt: iso(-1) })
    const active = await make("Active Offer Delta", { published: "true", startsAt: iso(-1), endsAt: iso(10), ctaLink: "page:plan" })
    assert.deepEqual([draft.json.offer.status, scheduled.json.offer.status, expired.json.offer.status, active.json.offer.status], ["DRAFT", "SCHEDULED", "EXPIRED", "ACTIVE"])

    const home = (await page("/en")).html
    assert.ok(home.includes("Active Offer Delta"))
    for (const hidden of ["Draft Offer Alpha", "Scheduled Offer Beta", "Expired Offer Gamma"]) assert.ok(!home.includes(hidden), hidden)

    const listed = await api("/api/admin/offers?status=SCHEDULED", { cookie: contentCookie })
    assert.deepEqual(listed.json.items.map((offer: { title: string }) => offer.title), ["Scheduled Offer Beta"])
  })

  test("offers: dates must be in order and links must be safe", async () => {
    const backwards = await apiForm("/api/admin/offers", { title: "Backwards", shortDescription: "x", startsAt: iso(5), endsAt: iso(1) }, { cookie: contentCookie })
    assert.equal(backwards.status, 422)
    assert.equal(backwards.json.errors[0].field, "endsAt")
    for (const ctaLink of ["javascript:alert(1)", "http://insecure.example", "page:doesnotexist", "data:text/html,hi"]) {
      const response = await apiForm("/api/admin/offers", { title: "Bad link", shortDescription: "x", ctaLink }, { cookie: contentCookie })
      assert.equal(response.status, 422, ctaLink)
    }
  })

  test("publishing and unpublishing an offer is logged with who did it", async () => {
    const created = await apiForm("/api/admin/offers", { title: "Logged Offer", shortDescription: "x", published: "false" }, { cookie: contentCookie })
    await apiForm(`/api/admin/offers/${created.json.offer.id}`, { published: "true" }, { method: "PATCH", cookie: contentCookie })
    await apiForm(`/api/admin/offers/${created.json.offer.id}`, { published: "false" }, { method: "PATCH", cookie: contentCookie })
    const logs = await prisma.auditLog.findMany({ where: { entityId: created.json.offer.id }, orderBy: { createdAt: "asc" } })
    assert.deepEqual(logs.map((log) => log.action), ["create", "publish", "unpublish"])
    assert.ok(logs.every((log) => log.actorRole === "CONTENT_ADMIN" && log.actorName === CONTENT_ADMIN.name))
  })

  test("announcements: only the active one shows in the bar, in the chosen language", async () => {
    await api("/api/admin/announcements", { cookie: contentCookie, body: { message: "Old notice text", messageMr: "जुनी सूचना", published: true, startsAt: iso(-3) } })
    await api("/api/admin/announcements", { cookie: contentCookie, body: { message: "Diwali bookings open", messageMr: "दिवाळी बुकिंग सुरू", type: "FESTIVE", published: true, startsAt: iso(-1) } })
    await api("/api/admin/announcements", { cookie: contentCookie, body: { message: "Unpublished notice", published: false } })
    const en = (await page("/en/about")).html
    const mr = (await page("/mr/about")).html
    assert.ok(en.includes("Diwali bookings open"))
    assert.ok(!en.includes("Old notice text") && !en.includes("Unpublished notice"))
    assert.ok(mr.includes("दिवाळी बुकिंग सुरू"))
  })

  // ─── Website content ─────────────────────────────────────

  const saveSection = (key: string, data: unknown, cookie = contentCookie, files: Record<string, { data: Buffer; type: string; name: string }> = {}) =>
    apiForm(`/api/admin/content/${key}`, { data: JSON.stringify(data), ...files }, { method: "PUT", cookie })

  const heroDraft = (titleLead: string) => ({ text: { en: { titleLead }, mr: {} }, links: {}, image: { kind: "keep" }, features: [], photos: [] })

  test("website content: a draft stays private until published", async () => {
    const saved = await saveSection("hero", heroDraft("A draft headline"))
    assert.equal(saved.status, 200)
    assert.ok(!(await page("/en")).html.includes("A draft headline"))

    // Draft Mode alone (without an admin session) shows nothing unpublished
    const preview = await fetch(`${BASE}/api/admin/preview?path=/en`, { headers: { Cookie: contentCookie }, redirect: "manual" })
    assert.equal(preview.status, 307)
    const draftCookie = (preview.headers.get("set-cookie") ?? "").split(";")[0]
    const asAdmin = await fetch(`${BASE}/en`, { headers: { Cookie: `${draftCookie}; ${contentCookie}` } }).then((r) => r.text())
    assert.ok(asAdmin.includes("A draft headline"))
    const asVisitor = await fetch(`${BASE}/en`, { headers: { Cookie: draftCookie } }).then((r) => r.text())
    assert.ok(!asVisitor.includes("A draft headline"), "a leftover preview cookie must not reveal drafts")

    const published = await api("/api/admin/content/hero/publish", { cookie: contentCookie, body: {} })
    assert.equal(published.status, 200)
    const home = (await page("/en")).html
    assert.ok(home.includes("A draft headline"))
    assert.ok(!(await page("/mr")).html.includes("A draft headline"), "Marathi keeps its own text")
  })

  test("website content: only known fields, safe links and sensible lengths are accepted", async () => {
    assert.equal((await saveSection("hero", { ...heroDraft("ok"), text: { en: { notAField: "x" }, mr: {} } })).status, 422)
    // The hero has no editable buttons (its search always opens the trip planner)
    assert.equal((await saveSection("hero", { ...heroDraft("ok"), links: { primary: "page:plan" } })).status, 422)
    assert.equal((await saveSection("cta", { ...heroDraft("ok"), text: { en: {}, mr: {} }, links: { primary: "javascript:alert(1)" } })).status, 422)
    assert.equal((await saveSection("hero", heroDraft("x".repeat(61)))).status, 422)
    assert.equal((await saveSection("nosuchsection", heroDraft("x"))).status, 404)
    // The Traveller's photo list only accepts photos the section already has
    const sneaky = { text: { en: {}, mr: {} }, links: {}, image: { kind: "keep" }, features: [], photos: [{ kind: "existing", url: "https://evil.example/x.jpg", alt: { en: "", mr: "" }, caption: { en: "", mr: "" } }] }
    assert.equal((await saveSection("traveller", sneaky)).status, 422)
  })

  test("website content: discarding a draft restores the live version", async () => {
    await saveSection("hero", heroDraft("Will be discarded"))
    const discarded = await api("/api/admin/content/hero/discard", { cookie: contentCookie, body: {} })
    assert.equal(discarded.status, 200)
    assert.equal(discarded.json.section.draft.text.en.titleLead, "A draft headline")
  })

  test("Traveller: features and photos replace the built-in ones only when published", async () => {
    const data = {
      text: { en: { homeTitle: "Our comfortable Traveller" }, mr: {} },
      links: {},
      image: { kind: "keep" },
      features: [{ icon: "ac", text: { en: "Air conditioning", mr: "वातानुकूलित" } }],
      photos: [{ kind: "website", path: "/images/traveller/front.jpg", alt: { en: "Front of the Traveller", mr: "" }, caption: { en: "Unique test caption", mr: "" } }],
    }
    assert.equal((await saveSection("traveller", data)).status, 200)
    assert.ok(!(await page("/en/traveller")).html.includes("Unique test caption"))
    assert.equal((await api("/api/admin/content/traveller/publish", { cookie: contentCookie, body: {} })).status, 200)
    const traveller = (await page("/en/traveller")).html
    assert.ok(traveller.includes("Unique test caption"))
    assert.ok((await page("/en")).html.includes("Our comfortable Traveller"))
  })

  // ─── Destinations and services ───────────────────────────

  test("destinations: import once, publish/unpublish, delete", async () => {
    const imported = await api("/api/admin/destinations/import", { cookie: contentCookie, body: {} })
    assert.equal(imported.status, 201)
    assert.equal((await api("/api/admin/destinations/import", { cookie: contentCookie, body: {} })).status, 409)

    const created = await apiForm("/api/admin/destinations", { name: "Malshej Ghat", shortDescription: "Monsoon waterfalls", category: "MAHARASHTRA", state: "Maharashtra", published: "false" }, { cookie: contentCookie })
    assert.equal(created.status, 201)
    assert.ok(!(await page("/en/destinations")).html.includes("Malshej Ghat"))
    await apiForm(`/api/admin/destinations/${created.json.destination.id}`, { published: "true" }, { method: "PATCH", cookie: contentCookie })
    assert.ok((await page("/en/destinations")).html.includes("Malshej Ghat"))
    assert.equal((await api(`/api/admin/destinations/${created.json.destination.id}`, { cookie: contentCookie, method: "DELETE" })).status, 200)
    assert.ok(!(await page("/en/destinations")).html.includes("Malshej Ghat"))
    assert.equal((await apiForm("/api/admin/destinations", { name: "No category", shortDescription: "x", category: "MOON" }, { cookie: contentCookie })).status, 422)
  })

  test("services: CRUD, and Plan This Trip keeps a valid enquiry type", async () => {
    const created = await apiForm(
      "/api/admin/services",
      { title: "School Trips", shortDescription: "Trips for school groups", enquiryType: "GROUP", icon: "users", published: "true", suitableFor: "School picnics\nEducational tours" },
      { cookie: contentCookie },
    )
    assert.equal(created.status, 201)
    const services = (await page("/en/services")).html
    assert.ok(services.includes("School Trips") && services.includes("Educational tours"))
    assert.ok(services.includes("plan-your-trip?service=group"))
    assert.equal((await apiForm("/api/admin/services", { title: "Bad", shortDescription: "x", enquiryType: "SPACE" }, { cookie: contentCookie })).status, 422)
    assert.equal((await api(`/api/admin/services/${created.json.service.id}`, { cookie: contentCookie, method: "DELETE" })).status, 200)
  })

  // ─── Audit log ───────────────────────────────────────────

  test("the audit log records actions without secrets and only Super Admins can read it", async () => {
    const logs = await api("/api/admin/audit-logs?pageSize=100", { cookie: superCookie })
    assert.equal(logs.status, 200)
    const text = JSON.stringify(logs.json.items)
    assert.ok(!/password-123|my-own-new-password|second-super-password|passwordHash/.test(text), "no passwords in the audit log")
    const actions = new Set(logs.json.items.map((item: { action: string }) => item.action))
    for (const action of ["create", "publish", "unpublish", "role_change", "disable", "password_change", "import", "delete"]) assert.ok(actions.has(action), action)
    const filtered = await api("/api/admin/audit-logs?entityType=Admin", { cookie: superCookie })
    assert.ok(filtered.json.items.every((item: { entityType: string }) => item.entityType === "Admin"))
  })

  test("cross-site content changes with the admin cookie are refused", async () => {
    const response = await apiForm("/api/admin/offers", { title: "CSRF", shortDescription: "x" }, { cookie: contentCookie, origin: "https://evil.example" })
    assert.equal(response.status, 403)
    assert.equal(ORIGIN, new URL(BASE).origin)
  })

  test("logging out ends the session", async () => {
    const session = await login(CONTENT_ADMIN.email, CONTENT_ADMIN.password)
    const cleared = await fetch(`${BASE}/api/admin/auth/logout`, { method: "POST", headers: { Cookie: session.cookie, Origin: ORIGIN, "Content-Type": "application/json" }, body: "{}" })
    assert.match(cleared.headers.get("set-cookie") ?? "", /kalika_admin=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i)
  })
})
