import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { chooseStorage } from "@/server/storage"
import { StorageRequestError, checkSupabaseBucket, createSupabaseStorage, redact } from "@/server/storage/supabase"

/**
 * Storage driver selection and the Supabase driver, with a mocked fetch:
 * nothing here reaches the network or a real bucket.
 * Run with: npm run test:unit
 */

// A made-up value that does not look like a real Supabase key (so secret scanners stay quiet)
const SECRET = "fake-storage-key-for-unit-tests-only-0000"
const config = { url: "https://example-project.supabase.co", secretKey: SECRET, bucket: "fleet-photos" }
const key = "fleet/2f1b8c4e-9a7d-4c3e-8b21-5d6f7a8b9c0d.webp"
const objectUrl = `https://example-project.supabase.co/storage/v1/object/fleet-photos/${key}`

type Call = { url: string; init: RequestInit }

/** A fetch that records each call and answers with the given responses, in order. */
function mockFetch(...responses: (Response | Error)[]) {
  const calls: Call[] = []
  const fetchImpl = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init })
    const next = responses.shift() ?? new Response(null, { status: 500 })
    if (next instanceof Error) throw next
    return next
  }) as typeof fetch
  return { calls, fetchImpl }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
const headersOf = (call: Call) => new Headers(call.init.headers)

/** Error messages may name the status, never the secret, the key or the project address. */
function assertSanitized(error: unknown) {
  assert.ok(error instanceof StorageRequestError)
  for (const leak of [SECRET, key, "example-project", "supabase.co"]) assert.ok(!error.message.includes(leak), `message leaks ${leak}`)
  return true
}

const baseEnv = { NODE_ENV: "development" as const, STORAGE_DRIVER: undefined, SUPABASE_URL: undefined, SUPABASE_SECRET_KEY: undefined, SUPABASE_STORAGE_BUCKET: undefined }
const nowhere = { vercel: false, netlify: false }

describe("Storage › driver selection", () => {
  test("local in development, off in production unless chosen", () => {
    assert.deepEqual(chooseStorage(baseEnv, nowhere).status, { enabled: true, driver: "local", persistent: true })
    const production = chooseStorage({ ...baseEnv, NODE_ENV: "production" }, nowhere).status
    assert.equal(production.enabled, false)
    assert.equal(chooseStorage({ ...baseEnv, STORAGE_DRIVER: "none" }, nowhere).status.enabled, false)
  })

  test("local storage is refused on Vercel and flagged as temporary on Netlify", () => {
    const vercel = chooseStorage({ ...baseEnv, STORAGE_DRIVER: "local" }, { vercel: true, netlify: false }).status
    assert.equal(vercel.enabled, false)
    assert.match(vercel.reason ?? "", /Vercel/)
    assert.deepEqual(chooseStorage({ ...baseEnv, STORAGE_DRIVER: "local" }, { vercel: false, netlify: true }).status, { enabled: true, driver: "local", persistent: false })
  })

  test("supabase with every setting is enabled, persistent, and works on Vercel", () => {
    const choice = chooseStorage(
      { ...baseEnv, NODE_ENV: "production", STORAGE_DRIVER: "supabase", SUPABASE_URL: config.url, SUPABASE_SECRET_KEY: SECRET, SUPABASE_STORAGE_BUCKET: "fleet-photos" },
      { vercel: true, netlify: false },
    )
    assert.deepEqual(choice.status, { enabled: true, driver: "supabase", persistent: true, bucket: "fleet-photos" })
    assert.deepEqual(choice.supabase, config)
    assert.ok(!JSON.stringify(choice.status).includes(SECRET), "the status shown in admin never carries the secret")
  })

  test("missing supabase settings switch uploads off and name only the missing variables", () => {
    const none = chooseStorage({ ...baseEnv, STORAGE_DRIVER: "supabase" }, nowhere).status
    assert.equal(none.enabled, false)
    assert.match(none.reason ?? "", /SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_STORAGE_BUCKET are not set/)

    const partial = chooseStorage({ ...baseEnv, STORAGE_DRIVER: "supabase", SUPABASE_URL: config.url, SUPABASE_SECRET_KEY: SECRET }, nowhere)
    assert.equal(partial.status.enabled, false)
    assert.equal(partial.supabase, undefined)
    assert.equal(partial.status.reason, "Supabase storage is selected but SUPABASE_STORAGE_BUCKET is not set.")
    assert.ok(!(partial.status.reason ?? "").includes(SECRET) && !(partial.status.reason ?? "").includes(config.url))
  })
})

describe("Storage › Supabase driver", () => {
  test("upload sends the WebP to the bucket under its key, never overwriting, and returns the /media URL", async () => {
    const { calls, fetchImpl } = mockFetch(json({ Key: `fleet-photos/${key}` }))
    const storage = createSupabaseStorage({ ...config, url: `${config.url}/` }, fetchImpl)
    const data = Buffer.from("webp-bytes")

    assert.deepEqual(await storage.put(key, data), { url: `/media/${key}` })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, objectUrl)
    assert.equal(calls[0].init.method, "POST")
    assert.equal(calls[0].init.redirect, "error")
    const headers = headersOf(calls[0])
    assert.equal(headers.get("content-type"), "image/webp")
    assert.equal(headers.get("x-upsert"), "false")
    assert.equal(headers.get("apikey"), SECRET)
    assert.equal(headers.get("authorization"), null, "a secret key is not a JWT, so it is never sent as a Bearer token")
    assert.deepEqual(Buffer.from(calls[0].init.body as Uint8Array), data)
    assert.equal(storage.driver, "supabase")
    assert.equal(storage.persistent, true)
  })

  test("a legacy service_role key (a JWT) is sent on both headers", async () => {
    // A made-up JWT-shaped value ({"alg":"none"} / {"test":true}), not a real key
    const legacy = "eyJhbGciOiJub25lIn0.eyJ0ZXN0Ijp0cnVlfQ.ZmFrZS1zaWduYXR1cmU"
    const { calls, fetchImpl } = mockFetch(json({ Key: `fleet-photos/${key}` }))
    await createSupabaseStorage({ ...config, secretKey: legacy }, fetchImpl).put(key, Buffer.from("x"))
    assert.equal(headersOf(calls[0]).get("apikey"), legacy)
    assert.equal(headersOf(calls[0]).get("authorization"), `Bearer ${legacy}`)
  })

  test("Supabase's own error text reaches the server log, unless it repeats the secret, address or key", async () => {
    const jws = createSupabaseStorage(config, mockFetch(json({ statusCode: "403", error: "Unauthorized", message: "Invalid Compact JWS" }, 400)).fetchImpl)
    await assert.rejects(jws.put(key, Buffer.from("x")), (error) => assertSanitized(error) && /HTTP 403, Unauthorized: Invalid Compact JWS/.test((error as Error).message))

    const mime = createSupabaseStorage(config, mockFetch(json({ statusCode: "415", error: "invalid_mime_type", message: "mime type image/webp is not supported" }, 400)).fetchImpl)
    await assert.rejects(mime.put(key, Buffer.from("x")), (error) => assertSanitized(error) && /HTTP 415, invalid_mime_type: mime type image\/webp is not supported/.test((error as Error).message))

    const leaky = createSupabaseStorage(config, mockFetch(json({ statusCode: "404", error: "Bucket not found", message: `no bucket at example-project.supabase.co for ${key}` }, 400)).fetchImpl)
    await assert.rejects(leaky.put(key, Buffer.from("x")), (error) => assertSanitized(error) && /HTTP 404, Bucket not found: no bucket at \[redacted\] for \[redacted\]/.test((error as Error).message))
  })

  test("an existing object is never replaced (409, or 400 with a Duplicate body)", async () => {
    for (const response of [json({ statusCode: "409", error: "Duplicate", message: "The resource already exists" }, 409), json({ statusCode: "409", error: "Duplicate" }, 400)]) {
      const storage = createSupabaseStorage(config, mockFetch(response).fetchImpl)
      await assert.rejects(storage.put(key, Buffer.from("x")), (error) => assertSanitized(error) && (error as StorageRequestError).status === 409)
    }
  })

  test("upload failures are reported without the secret, key or address", async () => {
    const denied = createSupabaseStorage(config, mockFetch(json({ statusCode: "403", error: "Unauthorized", message: `bad key ${SECRET}` }, 403)).fetchImpl)
    await assert.rejects(denied.put(key, Buffer.from("x")), (error) => assertSanitized(error) && (error as StorageRequestError).status === 403)

    const offline = createSupabaseStorage(config, mockFetch(new TypeError(`fetch failed: getaddrinfo ENOTFOUND example-project.supabase.co`)).fetchImpl)
    await assert.rejects(offline.put(key, Buffer.from("x")), (error) => assertSanitized(error) && (error as StorageRequestError).status === 0)
  })

  test("invalid keys are refused before any request: no traversal, other folders, other buckets or file types", async () => {
    const { calls, fetchImpl } = mockFetch()
    const storage = createSupabaseStorage(config, fetchImpl)
    const uuid = "2f1b8c4e-9a7d-4c3e-8b21-5d6f7a8b9c0d"
    const bad = [
      "",
      "../.env.local",
      `fleet/../../${uuid}.webp`,
      `../other-bucket/fleet/${uuid}.webp`,
      `fleet-photos/fleet/${uuid}.webp`,
      `private/${uuid}.webp`,
      `fleet/${uuid}.png`,
      `fleet/${uuid}.webp/../x`,
      `/fleet/${uuid}.webp`,
      `fleet/${uuid.toUpperCase()}.webp`,
      `https://evil.example/fleet/${uuid}.webp`,
      `fleet/${uuid}.webp?download`,
      `fleet%2F${uuid}.webp`,
    ]
    for (const candidate of bad) {
      await assert.rejects(storage.put(candidate, Buffer.from("x")), /Invalid storage key/, candidate)
      await assert.rejects(storage.remove(candidate), /Invalid storage key/, candidate)
      await assert.rejects(storage.read(candidate), /Invalid storage key/, candidate)
    }
    assert.equal(calls.length, 0, "no request was made")
  })

  test("delete removes exactly one object from the configured bucket; a missing object is fine", async () => {
    const { calls, fetchImpl } = mockFetch(json([{ name: key }]), json([]))
    const storage = createSupabaseStorage(config, fetchImpl)
    await storage.remove(key)
    await storage.remove(key) // already gone: Supabase answers 200 with an empty list

    assert.equal(calls.length, 2)
    assert.equal(calls[0].url, "https://example-project.supabase.co/storage/v1/object/fleet-photos")
    assert.equal(calls[0].init.method, "DELETE")
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { prefixes: [key] })
  })

  test("a failed delete is an error (the caller logs it and carries on)", async () => {
    const storage = createSupabaseStorage(config, mockFetch(json({ statusCode: "404", error: "Bucket not found" }, 404)).fetchImpl)
    await assert.rejects(storage.remove(key), (error) => assertSanitized(error) && (error as StorageRequestError).status === 404)
  })

  test("read returns the file, null when it does not exist, and fails loudly otherwise", async () => {
    const { calls, fetchImpl } = mockFetch(
      new Response(Buffer.from("image-data"), { status: 200, headers: { "Content-Type": "image/webp" } }),
      json({ statusCode: "404", error: "not_found", message: "Object not found" }, 400),
      json({ statusCode: "404", error: "not_found" }, 404),
      json({ statusCode: "500", error: "internal" }, 500),
    )
    const storage = createSupabaseStorage(config, fetchImpl)
    assert.deepEqual(await storage.read(key), Buffer.from("image-data"))
    assert.equal(await storage.read(key), null)
    assert.equal(await storage.read(key), null)
    await assert.rejects(storage.read(key), (error) => assertSanitized(error))
    assert.equal(calls[0].url, objectUrl)
    assert.equal(calls[0].init.method, "GET")
    assert.equal(headersOf(calls[0]).get("apikey"), SECRET)
  })

  test("read refuses oversized responses", async () => {
    const big = new Response("x", { status: 200, headers: { "Content-Length": String(50 * 1024 * 1024) } })
    const storage = createSupabaseStorage(config, mockFetch(big).fetchImpl)
    await assert.rejects(storage.read(key), (error) => assertSanitized(error))
  })
})

describe("Storage › redaction and diagnostics", () => {
  // Made-up samples, assembled here so no whole key-shaped string sits in the source (secret scanners)
  const fakeJwt = ["eyJhbGciOiJub25lIn0", "eyJ0ZXN0Ijp0cnVlfQ", "c2lnbmF0dXJl"].join(".")
  const fakeSecretKey = ["sb", "secret", "AbCdEf123456"].join("_")
  const fakePublishableKey = ["sb", "publishable", "XyZ789"].join("_")

  test("redaction removes the given values, their encoded forms and every token-like pattern", () => {
    const known = [SECRET, config.url, "example-project.supabase.co", "example-project", key]
    const samples = [
      `bad key ${SECRET}`,
      `bad key ${encodeURIComponent(SECRET)}`,
      `BAD KEY ${SECRET.toUpperCase()}`,
      "Authorization: Bearer abc.def.ghi rejected",
      `token ${fakeJwt} expired`,
      `key ${fakeSecretKey} and ${fakePublishableKey} refused`,
      "see https://other-project.supabase.co/storage/v1/object/x for details",
      "host other-project.supabase.co refused",
      `object ${key} and ${encodeURIComponent(key)} missing`,
      "id 9d3c1f2e-4b5a-4c6d-8e7f-0a1b2c3d4e5f missing",
      "owner owner@example.com",
      "blob QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9w",
    ]
    for (const sample of samples) {
      const out = redact(sample, 200, known) ?? ""
      assert.match(out, /\[redacted\]/, sample)
      for (const leak of [SECRET.toLowerCase(), "abc.def.ghi", "eyj", "sb_secret_", "sb_publishable_", "supabase.co", "example-project", "other-project", "9d3c1f2e", "2f1b8c4e", "@example.com", "QUJDREVG"]) {
        assert.ok(!out.toLowerCase().includes(leak.toLowerCase()), `${sample} -> ${out}`)
      }
    }
    assert.equal(redact("mime type image/webp is not supported", 200, known), "mime type image/webp is not supported", "plain text is kept")
    assert.equal(redact("x".repeat(500).replace(/x/g, "ab "), 30, known)?.length, 30, "length is capped")
    assert.equal(redact(42, 30, known), undefined)
  })

  test("an unreachable Supabase is reported with a fixed reason, never the original error text", async () => {
    const cases: [Error, RegExp][] = [
      [Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }), /timed out/],
      [new TypeError("fetch failed", { cause: Object.assign(new Error("getaddrinfo ENOTFOUND example-project.supabase.co"), { code: "ENOTFOUND" }) }), /address not found/],
      [new TypeError("fetch failed", { cause: new Error("unexpected redirect") }), /redirected/],
      [new TypeError("fetch failed", { cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }) }), /connection refused/],
    ]
    for (const [failure, reason] of cases) {
      const storage = createSupabaseStorage(config, mockFetch(failure).fetchImpl)
      await assert.rejects(storage.put(key, Buffer.from("x")), (error) => assertSanitized(error) && (error as StorageRequestError).status === 0 && reason.test((error as Error).message))
    }
  })

  test("the bucket check reads the bucket's settings without uploading anything", async () => {
    const { calls, fetchImpl } = mockFetch(json({ id: "fleet-photos", name: "fleet-photos", public: false, allowed_mime_types: ["image/jpeg", "image/png"], file_size_limit: 5242880 }))
    const result = await checkSupabaseBucket(config, fetchImpl)
    assert.deepEqual(result, { ok: true, public: false, acceptsWebp: false, allowedMimeTypes: ["image/jpeg", "image/png"], fileSizeLimit: 5242880 })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, "https://example-project.supabase.co/storage/v1/bucket/fleet-photos")
    assert.equal(calls[0].init.method, "GET")
    assert.equal(headersOf(calls[0]).get("apikey"), SECRET)

    const open = await checkSupabaseBucket(config, mockFetch(json({ public: false, allowed_mime_types: null, file_size_limit: null })).fetchImpl)
    assert.deepEqual(open, { ok: true, public: false, acceptsWebp: true, allowedMimeTypes: null, fileSizeLimit: null })
    const wildcard = await checkSupabaseBucket(config, mockFetch(json({ allowed_mime_types: ["image/*"] })).fetchImpl)
    assert.equal(wildcard.ok && wildcard.acceptsWebp, true)
  })

  test("the bucket check names the likely cause, without the secret or address", async () => {
    const missing = await checkSupabaseBucket(config, mockFetch(json({ statusCode: "404", error: "Bucket not found", message: "Bucket not found" }, 400)).fetchImpl)
    assert.equal(missing.ok, false)
    assert.ok(!missing.ok && missing.status === 404 && /no bucket named "fleet-photos"/.test(missing.hint))

    const refused = await checkSupabaseBucket(config, mockFetch(json({ statusCode: "403", error: "Unauthorized", message: `Invalid API key ${SECRET}` }, 400)).fetchImpl)
    assert.ok(!refused.ok && refused.status === 403 && /refused the key/.test(refused.hint))
    assert.ok(!JSON.stringify(refused).includes(SECRET))

    const offline = await checkSupabaseBucket(config, mockFetch(new TypeError("fetch failed", { cause: Object.assign(new Error("getaddrinfo ENOTFOUND example-project.supabase.co"), { code: "ENOTFOUND" }) })).fetchImpl)
    assert.ok(!offline.ok && offline.status === 0 && /could not be reached/.test(offline.hint))
    // The hints may show the generic form https://<project>.supabase.co, never this project or the secret
    for (const leak of [SECRET, "example-project", config.url]) assert.ok(!JSON.stringify([missing, refused, offline]).includes(leak), leak)
  })
})
