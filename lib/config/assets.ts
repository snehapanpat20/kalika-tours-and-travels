/**
 * Brand files live only in `public/images/brand`.
 * Content photographs use their own folders and are never filled with the logo.
 */
export const imageDirectories = {
  brand: "/images/brand",
  hero: "/images/hero",
  traveller: "/images/traveller",
  services: "/images/services",
  destinations: "/images/destinations",
  gallery: "/images/gallery",
  about: "/images/about",
} as const

export const brandAssets = {
  logoDirectory: imageDirectories.brand,
} as const
