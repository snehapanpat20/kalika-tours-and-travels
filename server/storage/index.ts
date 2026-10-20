import "server-only"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getServerEnv, type ServerEnv } from "@/lib/config/env"
import { describeError, logger } from "@/server/api/logger"
import { assertStorageKey, storageKeyPattern } from "@/server/storage/keys"
import { checkSupabaseBucket, createSupabaseStorage, type BucketCheck, type SupabaseStorageConfig } from "@/server/storage/supabase"

export { storageKeyPattern } from "@/server/storage/keys"

/**
 * Image storage. Everything that saves or removes an uploaded file goes
 * through this interface, so the gallery, review and content code never
 * depends on where files live.
 *
 * Drivers:
 * - local:    files on this server's disk (development, or a host with a persistent disk)
 * - supabase: Supabase Storage (for Vercel, which has no lasting disk)
 * Either way a file is stored under its key (e.g. "fleet/<uuid>.webp") and served at /media/<key>.
 */
export interface ImageStorage {
  readonly driver: "local" | "supabase"
  /** False when files could disappear on redeploy; shown as a warning in admin settings. */
  readonly persistent: boolean
  /** Saves `data` under `key` (e.g. "gallery/<uuid>.webp") and returns its public URL. Never overwrites. */
  put(key: string, data: Buffer): Promise<{ url: string }>
  /** Removes a stored file. Missing files are ignored. */
  remove(key: string): Promise<void>
  /** Reads a stored file, or null if it does not exist. */
  read(key: string): Promise<Buffer | null>
}

export type StorageStatus =
  | { enabled: true; driver: "local"; persistent: boolean; reason?: undefined }
  | { enabled: true; driver: "supabase"; persistent: true; bucket: string; reason?: undefined }
  | { enabled: false; driver: "none"; persistent: false; reason: string }

// The upload folder is runtime data, so it is left out of build-time file tracing.
export function uploadRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), getServerEnv().UPLOAD_DIR ?? "storage/uploads")
}

function resolveKey(key: string): string {
  assertStorageKey(key)
  return path.join(/*turbopackIgnore: true*/ uploadRoot(), ...key.split("/"))
}

/** Where the site is running: Vercel loses files between requests, Netlify between deployments. */
const currentHost = () => ({ vercel: Boolean(process.env.VERCEL), netlify: Boolean(process.env.NETLIFY) })

const localStorage: ImageStorage = {
  driver: "local",
  // Serverless hosts (Vercel, Netlify) have no lasting disk; a VPS or a Render/Railway disk does.
  get persistent() {
    const host = currentHost()
    return !host.vercel && !host.netlify
  },
  async put(key, data) {
    const file = resolveKey(key)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, data, { flag: "wx" })
    return { url: `/media/${key}` }
  },
  async remove(key) {
    try {
      await unlink(resolveKey(key))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  },
  async read(key) {
    try {
      return await readFile(resolveKey(key))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
      throw error
    }
  },
}

type StorageChoice = { status: StorageStatus; supabase?: SupabaseStorageConfig }

/**
 * Which storage to use, from the environment alone (exported for tests).
 * Never throws: a missing setting switches uploads off with a reason that
 * names the variable, never its value.
 */
export function chooseStorage(
  env: Pick<ServerEnv, "NODE_ENV" | "STORAGE_DRIVER" | "SUPABASE_URL" | "SUPABASE_SECRET_KEY" | "SUPABASE_STORAGE_BUCKET">,
  host: { vercel: boolean; netlify: boolean },
): StorageChoice {
  const driver = env.STORAGE_DRIVER ?? (env.NODE_ENV === "production" ? "none" : "local")
  if (driver === "none") {
    return { status: { enabled: false, driver: "none", persistent: false, reason: "Image uploads are switched off (STORAGE_DRIVER=none)." } }
  }
  if (driver === "supabase") {
    const missing = (["SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_STORAGE_BUCKET"] as const).filter((name) => !env[name])
    if (missing.length) {
      return { status: { enabled: false, driver: "none", persistent: false, reason: `Supabase storage is selected but ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set.` } }
    }
    const config = { url: env.SUPABASE_URL!, secretKey: env.SUPABASE_SECRET_KEY!, bucket: env.SUPABASE_STORAGE_BUCKET! }
    return { status: { enabled: true, driver: "supabase", persistent: true, bucket: config.bucket }, supabase: config }
  }
  if (host.vercel) {
    // Files written on Vercel vanish between requests; refuse rather than lose photos silently.
    return { status: { enabled: false, driver: "none", persistent: false, reason: "Local storage cannot keep files on Vercel. Set STORAGE_DRIVER=supabase." } }
  }
  return { status: { enabled: true, driver: "local", persistent: !host.netlify } }
}

let supabaseStorage: { config: SupabaseStorageConfig; storage: ImageStorage } | undefined

function currentChoice(): StorageChoice {
  return chooseStorage(getServerEnv(), currentHost())
}

export function getStorageStatus(): StorageStatus {
  return currentChoice().status
}

function storageFor(choice: StorageChoice): ImageStorage | null {
  if (!choice.status.enabled) return null
  if (choice.status.driver === "local") return localStorage
  const config = choice.supabase!
  if (supabaseStorage?.config !== config) supabaseStorage = { config, storage: createSupabaseStorage(config) }
  return supabaseStorage.storage
}

/**
 * For admin Settings: a read-only check that the Supabase address, key and bucket
 * work (no upload). Null when Supabase is not the active driver.
 */
export async function checkStorageConnection(): Promise<BucketCheck | null> {
  const choice = currentChoice()
  return choice.status.enabled && choice.supabase ? checkSupabaseBucket(choice.supabase) : null
}

/** The configured storage, or null when uploads are switched off. */
export function getImageStorage(): ImageStorage | null {
  return storageFor(currentChoice())
}

/**
 * Reads a stored file for the /media route. Returns null if it is missing or the key is invalid.
 * With Supabase, files uploaded to this server's disk earlier (local development) are still
 * found there, so switching drivers does not break existing /media links.
 */
export async function readStoredFile(key: string): Promise<Buffer | null> {
  if (!storageKeyPattern.test(key)) return null
  const storage = getImageStorage()
  try {
    if (storage?.driver === "supabase") {
      const file = await storage.read(key)
      // Vercel has no local files to fall back to
      if (file || currentHost().vercel) return file
    }
    return await localStorage.read(key)
  } catch (error) {
    logger.error("storage_read_failed", { key, error: describeError(error) })
    return null
  }
}
