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

/** Handwritten accent for the hero tagline; covers English and Marathi. */
export const script = Kalam({
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-kalam",
})

export const fontVariables = `${sans.variable} ${devanagari.variable} ${script.variable}`
