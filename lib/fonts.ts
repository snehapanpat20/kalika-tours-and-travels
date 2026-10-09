import { Kalam, Manrope, Noto_Sans_Devanagari } from "next/font/google"

export const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
})

export const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-devanagari",
})

/**
 * Handwritten accent for the hero tagline; covers English and Marathi.
 * Not preloaded: only the homepage uses it, so other pages don't download it early.
 */
export const script = Kalam({
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-kalam",
})

export const fontVariables = `${sans.variable} ${devanagari.variable} ${script.variable}`
