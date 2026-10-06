import "server-only"
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getServerEnv } from "@/lib/config/env"
import { logger } from "@/server/api/logger"

/**
 * Image storage. Everything that saves or removes an uploaded file goes
 * through this interface, so a cloud provider (for example Cloudinary or
 * Supabase Storage, both with free tiers) can be added as another driver
 * later without touching the gallery or review code.
 */
export interface ImageStorage {
  readonly driver: "local"
  /** False when files could disappear on redeploy; shown as a warning in admin settings. */
  readonly persistent: boolean
  /** Saves `data` under `key` (e.g. "gallery/<uuid>.webp") and returns its public URL. */
  put(key: string, data: Buffer): Promise<{ url: string }>
  /** Removes a stored file. Missing files are ignored. */
  remove(key: string): Promise<void>
}

export type StorageStatus =
  | { enabled: true; driver: "local"; persistent: boolean; reason?: undefined }
  | { enabled: false; driver: "none"; persistent: false; reason: string }

/** Keys are always a known folder plus a random UUID file name: nothing user-controlled. */
export const storageKeyPattern = /^(gallery|reviews|offers|destinations|services|content)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

// The upload folder is runtime data, so it is left out of build-time file tracing.
export function uploadRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), getServerEnv().UPLOAD_DIR ?? "storage/uploads")
}

function resolveKey(key: string): string {
  if (!storageKeyPattern.test(key)) throw new Error("Invalid storage key")
  return path.join(/*turbopackIgnore: true*/ uploadRoot(), ...key.split("/"))
}

const localStorage: ImageStorage = {
  driver: "local",
  // Serverless hosts (Vercel, Netlify) have no lasting disk; a VPS or a Render/Railway disk does.
  persistent: !process.env.VERCEL && !process.env.NETLIFY,
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
}

export function getStorageStatus(): StorageStatus {
  const env = getServerEnv()
  const driver = env.STORAGE_DRIVER ?? (env.NODE_ENV === "production" ? "none" : "local")
  if (driver === "none") {
    return { enabled: false, driver: "none", persistent: false, reason: "Image uploads are switched off (STORAGE_DRIVER=none)." }
  }
  if (process.env.VERCEL) {
    // Files written on Vercel vanish between requests; refuse rather than lose photos silently.
    return { enabled: false, driver: "none", persistent: false, reason: "Local storage cannot keep files on Vercel. Connect a cloud storage driver." }
  }
  return { enabled: true, driver: "local", persistent: localStorage.persistent }
}

/** The configured storage, or null when uploads are switched off. */
export function getImageStorage(): ImageStorage | null {
  return getStorageStatus().enabled ? localStorage : null
}

/** Reads a stored file for the /media route. Returns null if it is missing or the key is invalid. */
export async function readStoredFile(key: string): Promise<Buffer | null> {
  if (!storageKeyPattern.test(key)) return null
  try {
    return await readFile(resolveKey(key))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") logger.error("storage_read_failed", { key })
    return null
  }
}
