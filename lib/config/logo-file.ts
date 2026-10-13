import "server-only"
import fs from "node:fs"
import path from "node:path"
import { imageDirectories } from "@/lib/config/assets"

/**
 * The three cuts of the official logo, written to `public/images/brand` by
 * `scripts/build-brand-images.mjs`. Sizes are the files' own pixel dimensions.
 * The brand is part of each file name on purpose: browsers and the image
 * optimizer cache by address, so a new logo under an old name keeps showing the old one.
 */
export const logoVariants = {
  /** Emblem, name and tagline. */
  full: { baseName: "kalika-yatra-maroon-logo", width: 811, height: 557 },
  /** Emblem and name, without the tagline: for the header and other short spaces. */
  compact: { baseName: "kalika-yatra-maroon-logo-compact", width: 811, height: 494 },
  /** Emblem only. */
  mark: { baseName: "kalika-yatra-maroon-logo-mark", width: 676, height: 384 },
} as const

export type LogoVariant = keyof typeof logoVariants

const logoExtensions = ["svg", "png", "webp", "jpg", "jpeg"] as const

export function getBrandLogoPath(variant: LogoVariant = "full"): string | null {
  const brandDir = path.join(process.cwd(), "public", "images", "brand")

  for (const extension of logoExtensions) {
    const fileName = `${logoVariants[variant].baseName}.${extension}`
    if (fs.existsSync(path.join(brandDir, fileName))) {
      return `${imageDirectories.brand}/${fileName}`
    }
  }

  return null
}
