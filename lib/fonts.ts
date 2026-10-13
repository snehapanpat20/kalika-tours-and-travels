import { Cormorant_Garamond, DM_Sans, Kalam, Manrope, Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google"

export const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
})

/** Customer website: headings. The admin panel keeps Manrope (see the themes in globals.css). */
export const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
})

/** Customer website: body text. */
export const body = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

/** Marathi headings on the website: a serif to sit with Cormorant Garamond, which has no Devanagari. */
export const devanagariSerif = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-noto-serif-devanagari",
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

export const fontVariables = `${sans.variable} ${display.variable} ${body.variable} ${devanagari.variable} ${devanagariSerif.variable} ${script.variable}`
