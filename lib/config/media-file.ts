import "server-only"
import fs from "node:fs"
import path from "node:path"
import { imageDirectories } from "@/lib/config/assets"

const imageExtensions = ["webp", "avif", "jpg", "jpeg", "png"] as const

export type ContentImageCategory = "hero" | "traveller" | "services" | "destinations" | "gallery" | "about"

function categoryDir(category: ContentImageCategory) {
  return path.join(process.cwd(), "public", "images", category)
}

function isImageFile(fileName: string) {
  const lower = fileName.toLowerCase()
  return imageExtensions.some((extension) => lower.endsWith(`.${extension}`))
}

export function findNamedImage(category: ContentImageCategory, baseName: string): string | null {
  const directory = categoryDir(category)

  for (const extension of imageExtensions) {
    const fileName = `${baseName}.${extension}`
    if (fs.existsSync(path.join(directory, fileName))) {
      return `${imageDirectories[category]}/${fileName}`
    }
  }

  return null
}

export function listCategoryImages(category: ContentImageCategory): string[] {
  const directory = categoryDir(category)
  if (!fs.existsSync(directory)) return []

  return fs
    .readdirSync(directory)
    .filter((fileName) => isImageFile(fileName) && !fileName.startsWith("."))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => `${imageDirectories[category]}/${fileName}`)
}

export function isGalleryPhotograph(src: string) {
  return src.startsWith(`${imageDirectories.gallery}/`)
}
