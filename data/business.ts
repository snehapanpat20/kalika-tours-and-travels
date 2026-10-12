import type { LocalizedText } from "@/lib/i18n/locales"

/**
 * The brand and the verified business facts. The brand name is defined here
 * only: page copy, metadata, structured data, emails and the admin panel all
 * read it from this file.
 */
export const business = {
  name: "Kalika Yatra",
  /** The brand name as written in each language. */
  localName: { en: "Kalika Yatra", mr: "कालिका यात्रा" },
  tagline: { en: "Travel Together. Travel Comfortably.", mr: "एकत्र प्रवास करा. आरामात प्रवास करा." },
  owner: "Umesh Panpat",
  phone: "8329042510",
  phoneE164: "+918329042510",
  /** Second line for phone calls only. It is not a WhatsApp number. */
  callOnlyPhone: "9561046539",
  callOnlyPhoneE164: "+919561046539",
  email: "kalikatourstravels15@gmail.com",
  whatsappUrl: "https://wa.me/918329042510",
  instagramUrl: "https://www.instagram.com/_kalika_tours_travels/",
  whatsappCommunityUrl: "https://chat.whatsapp.com/EkMI1s0lx067I2ZfN6kIIK",
  location: {
    area: { en: "Hadapsar", mr: "हडपसर" },
    city: { en: "Pune", mr: "पुणे" },
    state: { en: "Maharashtra", mr: "महाराष्ट्र" },
    country: { en: "India", mr: "भारत" },
  },
} as const satisfies {
  name: string
  localName: LocalizedText
  tagline: LocalizedText
  owner: string
  phone: string
  phoneE164: string
  callOnlyPhone: string
  callOnlyPhoneE164: string
  email: string
  whatsappUrl: string
  instagramUrl: string
  whatsappCommunityUrl: string
  location: {
    area: LocalizedText
    city: LocalizedText
    state: LocalizedText
    country: LocalizedText
  }
}

export function formatLocation(locale: keyof typeof business.location.city): string {
  const { area, city, state } = business.location
  return `${area[locale]}, ${city[locale]}, ${state[locale]}`
}

/** Numbers a visitor can call, main line first. WhatsApp uses only the main line. */
export const callNumbers = [
  { display: business.phone, e164: business.phoneE164 },
  { display: business.callOnlyPhone, e164: business.callOnlyPhoneE164 },
] as const
