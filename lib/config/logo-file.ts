import "server-only"
import fs from "node:fs"
import path from "node:path"
import { imageDirectories } from "@/lib/config/assets"

const logoFileNames = ["logo.svg", "logo.png", "logo.webp", "logo.jpg", "logo.jpeg"] as const

export function getBrandLogoPath(): string | null {
  const brandDir = path.join(process.cwd(), "public", "images", "brand")

  for (const fileName of logoFileNames) {
    if (fs.existsSync(path.join(brandDir, fileName))) {
      return `${imageDirectories.brand}/${fileName}`
    }
  }

  return null
}
