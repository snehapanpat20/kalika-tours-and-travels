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
 * - Error messages carry the HTTP status only: never the key, URL or response body.
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

/** Supabase answers some errors with HTTP 400 and the real status in the body. */
async function bodyStatus(response: Response): Promise<{ status: number; error?: string }> {
  try {
    const body = (await response.json()) as { statusCode?: string | number; error?: string }
    const status = Number(body.statusCode)
    // Only short, known-shaped error names are kept (e.g. "Duplicate", "not_found")
    const error = typeof body.error === "string" && /^[\w -]{1,40}$/.test(body.error) ? body.error : undefined
    return { status: Number.isInteger(status) && status > 0 ? status : response.status, error }
  } catch {
    return { status: response.status }
  }
}

export function createSupabaseStorage(config: SupabaseStorageConfig, fetchImpl: typeof fetch = fetch): ImageStorage {
  const base = `${config.url.replace(/\/+$/, "")}/storage/v1/object`
  const bucket = encodeURIComponent(config.bucket)
  const objectUrl = (key: string) => `${base}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`
  const auth = { apikey: config.secretKey, Authorization: `Bearer ${config.secretKey}` }

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
        const { status, error } = await bodyStatus(response)
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
        const { status, error } = await bodyStatus(response)
        throw new StorageRequestError("remove", status, error)
      }
    },

    async read(key) {
      assertStorageKey(key)
      const response = await call("read", objectUrl(key), { method: "GET", headers: auth })
      if (!response.ok) {
        const { status, error } = await bodyStatus(response)
        if (status === 404 || error === "not_found") return null
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
