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
 * - Error messages carry the HTTP status and Supabase's short error text for the
 *   server log: never the secret, the project address or the file's key.
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
  constructor(operation: "upload" | "remove" | "read", status: number, detail?: string) {
    super(`Supabase Storage ${operation} failed (${status ? `HTTP ${status}` : "not reachable"}${detail ? `, ${detail}` : ""}).`)
    this.name = "StorageRequestError"
    this.status = status
  }
}

/** Supabase's short error text, kept only if it is plain and repeats none of `hidden`. */
function safeText(value: unknown, maxLength: number, hidden: string[]): string | undefined {
  if (typeof value !== "string") return undefined
  const text = value.trim().slice(0, maxLength)
  if (!text || !/^[\w .,:;'"()/-]+$/.test(text)) return undefined
  return hidden.some((item) => item && text.toLowerCase().includes(item.toLowerCase())) ? undefined : text
}

/**
 * Supabase answers some errors with HTTP 400 and the real status in the body.
 * The error name and message (e.g. "Unauthorized: Invalid Compact JWS") are kept
 * for the server log, unless they contain the key, the project address or the file name.
 */
async function bodyStatus(response: Response, hidden: string[]): Promise<{ status: number; error?: string }> {
  try {
    const body = (await response.json()) as { statusCode?: string | number; error?: string; message?: string }
    const status = Number(body.statusCode)
    const detail = [safeText(body.error, 40, hidden), safeText(body.message, 160, hidden)].filter(Boolean).join(": ")
    return { status: Number.isInteger(status) && status > 0 ? status : response.status, error: detail || undefined }
  } catch {
    return { status: response.status }
  }
}

/** Legacy service_role keys are JWTs; the newer sb_secret_ keys are not. */
const isJwt = (key: string) => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(key)

export function createSupabaseStorage(config: SupabaseStorageConfig, fetchImpl: typeof fetch = fetch): ImageStorage {
  const base = `${config.url.replace(/\/+$/, "")}/storage/v1/object`
  const bucket = encodeURIComponent(config.bucket)
  const objectUrl = (key: string) => `${base}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`
  // Supabase: send secret keys on the apikey header, not as a Bearer token, because they are
  // not JWTs and Storage rejects them there. A legacy service_role key (a JWT) goes on both.
  const auth: Record<string, string> = isJwt(config.secretKey) ? { apikey: config.secretKey, Authorization: `Bearer ${config.secretKey}` } : { apikey: config.secretKey }
  const host = (() => {
    try {
      return new URL(config.url).hostname
    } catch {
      return config.url
    }
  })()
  const hiddenFor = (key: string) => [config.secretKey, host, host.split(".")[0], key]

  async function call(operation: "upload" | "remove" | "read", url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetchImpl(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) })
    } catch {
      // The original error can name the host; it is not passed on
      throw new StorageRequestError(operation, 0)
    }
  }

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
        const { status, error } = await bodyStatus(response, hiddenFor(key))
        throw new StorageRequestError("upload", status, status === 409 ? "the file already exists" : error)
      }
      return { url: `/media/${key}` }
    },

    async remove(key) {
      assertStorageKey(key)
      // The bulk endpoint answers 200 with the removed objects, so a missing file is simply not listed
      const response = await call("remove", `${base}/${bucket}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
      })
      if (!response.ok) {
        const { status, error } = await bodyStatus(response, hiddenFor(key))
        throw new StorageRequestError("remove", status, error)
      }
    },

    async read(key) {
      assertStorageKey(key)
      const response = await call("read", objectUrl(key), { method: "GET", headers: auth })
      if (!response.ok) {
        const { status, error } = await bodyStatus(response, hiddenFor(key))
        if (status === 404 || error?.startsWith("not_found")) return null
        throw new StorageRequestError("read", status, error)
      }
      const declared = Number(response.headers.get("content-length"))
      if (declared > MAX_READ_BYTES) throw new StorageRequestError("read", response.status, "file too large")
      const data = Buffer.from(await response.arrayBuffer())
      if (data.byteLength > MAX_READ_BYTES) throw new StorageRequestError("read", response.status, "file too large")
      return data
    },
  }
}
