import "server-only"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { AppError } from "@/lib/errors/app-error"
import { describeError, logger } from "@/server/api/logger"
import { getImageStorage } from "@/server/storage"

export const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const

type ProcessOptions = {
  /** Largest accepted upload, in bytes. */
  maxBytes: number
  /** Longest side after resizing, in pixels. */
  maxDimension: number
  /** Field name for error messages. */
  field: string
  /** Smallest accepted width, in pixels (e.g. a hero image must be wide enough to look sharp). */
  minWidth?: number
}

/**
 * Checks and re-encodes an uploaded image:
 * - refuses wrong types and oversized files before decoding;
 * - decodes it for real (a renamed non-image fails here);
 * - applies camera rotation, resizes, and re-encodes as WebP, which drops all
 *   metadata, including GPS location from phone photos.
 */
export async function processImageUpload(file: File, options: ProcessOptions) {
  if (file.size === 0) throw new AppError("VALIDATION", "The image file is empty.", 422, [{ field: options.field, message: "The image file is empty." }])
  if (file.size > options.maxBytes) {
    const megabytes = Math.round(options.maxBytes / 1024 / 1024)
    throw new AppError("PAYLOAD_TOO_LARGE", `Images must be ${megabytes} MB or smaller.`, 413, [
      { field: options.field, message: `Images must be ${megabytes} MB or smaller.` },
    ])
  }
  if (!(acceptedImageTypes as readonly string[]).includes(file.type)) {
    throw new AppError("VALIDATION", "Upload a JPG, PNG, WebP or AVIF image.", 422, [{ field: options.field, message: "Upload a JPG, PNG, WebP or AVIF image." }])
  }

  const input = Buffer.from(await file.arrayBuffer())
  if (options.minWidth) {
    const meta = await sharp(input, { limitInputPixels: 50_000_000 })
      .metadata()
      .catch(() => null)
    // Phone photos may be stored sideways; the shorter side is not the "width" then
    const width = meta?.width && meta.height ? ((meta.orientation ?? 1) >= 5 ? meta.height : meta.width) : 0
    if (meta && width < options.minWidth) {
      const message = `This image is too small (${width}px wide). Use one at least ${options.minWidth}px wide so it looks sharp.`
      throw new AppError("VALIDATION", message, 422, [{ field: options.field, message }])
    }
  }

  try {
    const { data, info } = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate()
      .resize({ width: options.maxDimension, height: options.maxDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
    return { data, width: info.width, height: info.height }
  } catch {
    throw new AppError("VALIDATION", "That file could not be read as an image.", 422, [{ field: options.field, message: "That file could not be read as an image." }])
  }
}

/** Processes and stores an upload. Throws 503 when image storage is not configured. */
/** Folders uploads may be stored in; keep in step with storageKeyPattern in ./keys.ts. */
export type ImageFolder = "gallery" | "reviews" | "offers" | "destinations" | "services" | "content" | "fleet"

export async function storeImageUpload(file: File, folder: ImageFolder, options: ProcessOptions) {
  const storage = getImageStorage()
  if (!storage) {
    throw new AppError("SERVICE_UNAVAILABLE", "Photo uploads are not available right now.", 503, [
      { field: options.field, message: "Photo uploads are not available right now." },
    ])
  }
  const image = await processImageUpload(file, options)
  const key = `${folder}/${crypto.randomUUID()}.webp`
  let url: string
  try {
    ;({ url } = await storage.put(key, image.data))
  } catch (error) {
    // The cause (status only, never the key or secret) goes to the server log
    logger.error("storage_upload_failed", { driver: storage.driver, error: describeError(error) })
    throw new AppError("SERVICE_UNAVAILABLE", "The photo could not be saved. Please try again.", 503, [
      { field: options.field, message: "The photo could not be saved. Please try again." },
    ])
  }
  return { url, key, width: image.width, height: image.height }
}

/**
 * Deletes an uploaded file once nothing uses it. Best effort: the content change
 * is already saved, so a failed delete (e.g. cloud storage briefly unreachable)
 * is logged and leaves an unused file rather than failing the request.
 */
export async function removeStoredImage(key: string | null | undefined) {
  if (!key) return
  try {
    await getImageStorage()?.remove(key)
  } catch (error) {
    logger.warn("storage_remove_failed", { key, error: describeError(error) })
  }
}

export type StoredImage = { url: string; key: string | null; width: number; height: number }

/**
 * The image for a piece of content: a new upload (stored now), or a path to an
 * image already bundled with the website. Returns null when neither was given.
 */
export async function resolveImageInput(
  input: { file: File | null; imagePath: string | null | undefined },
  folder: ImageFolder,
  options: ProcessOptions,
): Promise<StoredImage | null> {
  if (input.file && input.file.size > 0) {
    const stored = await storeImageUpload(input.file, folder, options)
    return { url: stored.url, key: stored.key, width: stored.width, height: stored.height }
  }
  if (input.imagePath) {
    const size = await bundledImageSize(input.imagePath, options.field)
    return { url: input.imagePath, key: null, ...size }
  }
  return null
}

/** Paths to images already bundled with the website, e.g. /images/gallery/road.jpg */
export const bundledImagePattern = /^\/images\/[a-z0-9][a-z0-9/_-]*\.(jpe?g|png|webp|avif)$/i

/** Size of a bundled website image, or a validation error if it does not exist. */
export async function bundledImageSize(urlPath: string, field = "imagePath"): Promise<{ width: number; height: number }> {
  const invalid = new AppError("VALIDATION", "That website image was not found.", 422, [{ field, message: "That website image was not found." }])
  if (!bundledImagePattern.test(urlPath) || urlPath.includes("..")) throw invalid
  const publicDir = path.resolve(process.cwd(), "public")
  const file = path.resolve(publicDir, `.${urlPath}`)
  if (!file.startsWith(path.join(publicDir, "images"))) throw invalid
  try {
    const meta = await sharp(await readFile(file)).metadata()
    if (!meta.width || !meta.height) throw invalid
    return { width: meta.width, height: meta.height }
  } catch {
    throw invalid
  }
}

/** Photos bundled with the website that admins may reuse in the gallery (logos excluded). */
export async function listBundledImages(): Promise<string[]> {
  const root = path.resolve(process.cwd(), "public", "images")
  try {
    const entries = await readdir(root, { recursive: true, withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => `/images/${path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join("/")}`)
      .filter((url) => bundledImagePattern.test(url) && !url.startsWith("/images/brand/"))
      .sort()
  } catch {
    return []
  }
}
