import "server-only"
import type { ImageStorage } from "@/server/storage"
import { assertStorageKey } from "@/server/storage/keys"

/**
 * Supabase Storage driver, using its REST API (the same endpoints and headers
 * as the official client, without the extra dependency).
 *
 * - Objects are stored in one bucket under the same key as everywhere else,
 *   e.g. "fleet/<uuid>.webp", so database keys and /media URLs never change.
 * - Files are served through /media (see readStoredFile), so the bucket can
 *   stay private and the secret key never leaves the server.
 * - Errors carry the HTTP status and Supabase's short error text for the server
 *   log, passed through redact(): never the secret, the project address, the
 *   file's key or anything shaped like a token.
 */

export type SupabaseStorageConfig = {
  /** Project URL, e.g. https://<project>.supabase.co */
  url: string
  /** Server-only secret (or legacy service_role) key. */
  secretKey: string
  bucket: string
}

/** Largest file read back for /media; uploads are re-encoded and far smaller. */
const MAX_READ_BYTES = 20 * 1024 * 1024
const TIMEOUT_MS = 20_000

/** A failed storage call. `status` is the HTTP status (0 when Supabase could not be reached). */
export class StorageRequestError extends Error {
  readonly status: number
  /** Redacted detail, safe for the server log (never shown to visitors). */
  readonly detail?: string
  constructor(operation: "upload" | "remove" | "read" | "check", status: number, detail?: string) {
    super(`Supabase Storage ${operation} failed (${status ? `HTTP ${status}` : "not reachable"}${detail ? `, ${detail}` : ""}).`)
    this.name = "StorageRequestError"
    this.status = status
    this.detail = detail
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Patterns that are never logged, whoever's they are. */
const sensitivePatterns = [
  /bearer\s+\S+/gi,
  /eyJ[\w-]{4,}(?:\.[\w-]+){0,2}/g, // JWTs (legacy keys, session tokens)
  /sb_(?:secret|publishable)_[\w-]+/gi, // Supabase API keys
  /[a-z][a-z0-9+.-]*:\/\/\S+/gi, // URLs
  /\b[\w-]+\.supabase\.(?:co|in|net|com)\b/gi, // project hosts
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, // ids and file names
  /[^\s@]+@[^\s@]+\.[^\s@]+/g, // email addresses
  /[A-Za-z0-9+/_=-]{32,}/g, // any other long token-like run
]

/**
 * Makes Supabase's error text safe for the server log: the given values (and
 * their URL-encoded forms) and every token-like pattern become "[redacted]",
 * other characters outside a plain set are dropped, and the length is capped.
 */
export function redact(value: unknown, maxLength: number, known: string[]): string | undefined {
  if (typeof value !== "string") return undefined
  let text = value
  for (const item of known) {
    if (!item || item.length < 4) continue
    for (const form of new Set([item, encodeURIComponent(item)])) text = text.replace(new RegExp(escapeRegExp(form), "gi"), "[redacted]")
  }
  for (const pattern of sensitivePatterns) text = text.replace(pattern, "[redacted]")
  text = text
    .replace(/[^\w .,:;'"()/[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text ? text.slice(0, maxLength) : undefined
}

/** Why a request never got an answer, as a fixed phrase (the original error can name the host). */
function unreachableReason(error: unknown): string {
  const name = error instanceof Error ? error.name : ""
  const cause = error instanceof Error ? (error.cause as { code?: unknown; message?: unknown } | undefined) : undefined
  const code = typeof cause?.code === "string" ? cause.code : ""
  const text = `${error instanceof Error ? error.message : ""} ${typeof cause?.message === "string" ? cause.message : ""}`.toLowerCase()
  if (name === "TimeoutError" || name === "AbortError") return "timed out"
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "address not found (check SUPABASE_URL)"
  if (text.includes("redirect")) return "redirected (check SUPABASE_URL is the project URL)"
  if (code === "ECONNREFUSED" || code === "ECONNRESET") return "connection refused"
  if (code.startsWith("ERR_TLS") || code.includes("CERT") || text.includes("certificate")) return "TLS problem"
  return "network error"
}

/** Legacy service_role keys are JWTs; the newer sb_secret_ keys are not. */
const isJwt = (key: string) => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(key)

function connect(config: SupabaseStorageConfig, fetchImpl: typeof fetch) {
  const root = `${config.url.replace(/\/+$/, "")}/storage/v1`
  const bucket = encodeURIComponent(config.bucket)
  // Supabase recommends sending secret keys on the apikey header only (they are not JWTs).
  // A legacy service_role key (a JWT) also goes on Authorization, as the official client does.
  const auth: Record<string, string> = isJwt(config.secretKey) ? { apikey: config.secretKey, Authorization: `Bearer ${config.secretKey}` } : { apikey: config.secretKey }
  let host = config.url
  try {
    host = new URL(config.url).hostname
  } catch {}
  const known = (extra: string[] = []) => [config.secretKey, config.url, host, host.split(".")[0], ...extra]

  /** Supabase answers some errors with HTTP 400 and the real status in the body. */
  async function failure(response: Response, extra: string[]): Promise<{ status: number; detail?: string }> {
    try {
      const body = (await response.json()) as { statusCode?: string | number; error?: string; message?: string }
      const status = Number(body.statusCode)
      const detail = [redact(body.error, 40, known(extra)), redact(body.message, 160, known(extra))].filter(Boolean).join(": ")
      return { status: Number.isInteger(status) && status > 0 ? status : response.status, detail: detail || undefined }
    } catch {
      return { status: response.status }
    }
  }

  async function call(operation: "upload" | "remove" | "read" | "check", url: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
    try {
      return await fetchImpl(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      throw new StorageRequestError(operation, 0, unreachableReason(error))
    }
  }

  return { root, bucket, auth, failure, call }
}

export function createSupabaseStorage(config: SupabaseStorageConfig, fetchImpl: typeof fetch = fetch): ImageStorage {
  const { root, bucket, auth, failure, call } = connect(config, fetchImpl)
  const objectUrl = (key: string) => `${root}/object/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`

  return {
    driver: "supabase",
    persistent: true,

    async put(key, data) {
      assertStorageKey(key)
      const response = await call("upload", objectUrl(key), {
        method: "POST",
        headers: {
          ...auth,
          "Content-Type": "image/webp",
          "Cache-Control": "max-age=31536000",
          // Never replace an existing object (keys are random, so a clash means something is wrong)
          "x-upsert": "false",
        },
        body: new Uint8Array(data),
      })
      if (!response.ok) {
        const { status, detail } = await failure(response, [key])
        throw new StorageRequestError("upload", status, status === 409 ? "the file already exists" : detail)
      }
      return { url: `/media/${key}` }
    },

    async remove(key) {
      assertStorageKey(key)
      // The bulk endpoint answers 200 with the removed objects, so a missing file is simply not listed
      const response = await call("remove", `${root}/object/${bucket}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
      })
      if (!response.ok) {
        const { status, detail } = await failure(response, [key])
        throw new StorageRequestError("remove", status, detail)
      }
    },

    async read(key) {
      assertStorageKey(key)
      const response = await call("read", objectUrl(key), { method: "GET", headers: auth })
      if (!response.ok) {
        const { status, detail } = await failure(response, [key])
        if (status === 404 || detail?.startsWith("not_found")) return null
        throw new StorageRequestError("read", status, detail)
      }
      const declared = Number(response.headers.get("content-length"))
      if (declared > MAX_READ_BYTES) throw new StorageRequestError("read", response.status, "file too large")
      const data = Buffer.from(await response.arrayBuffer())
      if (data.byteLength > MAX_READ_BYTES) throw new StorageRequestError("read", response.status, "file too large")
      return data
    },
  }
}

/** What admin Settings shows about the Supabase bucket. */
export type BucketCheck =
  | { ok: true; public: boolean; acceptsWebp: boolean; allowedMimeTypes: string[] | null; fileSizeLimit: number | null }
  | { ok: false; status: number; detail?: string; hint: string }

/**
 * Read-only check of the configured bucket (GET /storage/v1/bucket/<name>): proves the
 * address, the key and the bucket name, and reports the bucket's own upload limits.
 * Uploads nothing and changes nothing.
 */
export async function checkSupabaseBucket(config: SupabaseStorageConfig, fetchImpl: typeof fetch = fetch): Promise<BucketCheck> {
  const { root, bucket, auth, failure, call } = connect(config, fetchImpl)
  let response: Response
  try {
    response = await call("check", `${root}/bucket/${bucket}`, { method: "GET", headers: auth }, 8_000)
  } catch (error) {
    const detail = error instanceof StorageRequestError ? error.detail : undefined
    return { ok: false, status: 0, detail, hint: "Supabase could not be reached. SUPABASE_URL must be the project URL, https://<project>.supabase.co, with nothing after it." }
  }
  if (!response.ok) {
    const { status, detail } = await failure(response, [])
    const notFound = status === 404 || /not.?found/i.test(detail ?? "")
    const hint = notFound
      ? `There is no bucket named "${config.bucket}" in this Supabase project. Check SUPABASE_STORAGE_BUCKET, and that the bucket was created in the same project as SUPABASE_URL.`
      : status === 401 || status === 403 || /unauthori[sz]ed|jws|jwt|signature|invalid api key/i.test(detail ?? "")
        ? "Supabase refused the key. SUPABASE_SECRET_KEY must be a secret key (sb_secret_…) or the legacy service_role key from the same project as SUPABASE_URL, pasted without quotes or spaces. A publishable or anon key cannot upload."
        : "Supabase answered with an error; the details are above."
    return { ok: false, status, detail, hint }
  }
  try {
    const body = (await response.json()) as { public?: unknown; allowed_mime_types?: unknown; file_size_limit?: unknown }
    const allowed = Array.isArray(body.allowed_mime_types) && body.allowed_mime_types.length ? body.allowed_mime_types.filter((item): item is string => typeof item === "string") : null
    const acceptsWebp = !allowed || allowed.some((type) => ["image/webp", "image/*", "*/*"].includes(type.toLowerCase()))
    const limit = Number(body.file_size_limit)
    return { ok: true, public: body.public === true, acceptsWebp, allowedMimeTypes: allowed, fileSizeLimit: Number.isFinite(limit) && limit > 0 ? limit : null }
  } catch {
    return { ok: false, status: response.status, hint: "Supabase answered, but not with bucket details. SUPABASE_URL must be the project URL, https://<project>.supabase.co." }
  }
}
