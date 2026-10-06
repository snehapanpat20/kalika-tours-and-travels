import { seedTimestamp } from "@/data/seed"
import type { ServiceRecord } from "@/types/catalog"

export const services: ServiceRecord[] = [
  {
    id: "outstation",
    sortOrder: 1,
    active: true,
    name: { en: "Outstation Trips", mr: "आउटस्टेशन ट्रिप्स" },
    summary: { en: "Travel outside the city in the company vehicle.", mr: "शहराबाहेरील प्रवासासाठी कंपनीच्या वाहनाने सहल." },
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "family",
    sortOrder: 2,
    active: true,
    name: { en: "Family Tours", mr: "कौटुंबिक पर्यटन" },
    summary: { en: "Trips arranged for families.", mr: "कुटुंबांसाठी आयोजित प्रवास." },
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "group",
    sortOrder: 3,
    active: true,
    name: { en: "Group Tours", mr: "ग्रुप टूर्स" },
    summary: { en: "Trips arranged for groups.", mr: "समूहांसाठी आयोजित प्रवास." },
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "pilgrimage",
    sortOrder: 4,
    active: true,
    name: { en: "Pilgrimage Tours", mr: "तीर्थयात्रा" },
    summary: { en: "Travel to places of worship.", mr: "धार्मिक स्थळांसाठी प्रवास." },
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
  {
    id: "corporate",
    sortOrder: 5,
    active: true,
    name: { en: "Corporate Trips", mr: "कॉर्पोरेट ट्रिप्स" },
    summary: { en: "Travel arranged for organisations.", mr: "संस्थांसाठी आयोजित प्रवास." },
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
]

/** Active services as enquiry-form options, in display order. */
export function serviceOptions(locale: "en" | "mr"): { id: ServiceRecord["id"]; name: string }[] {
  return services
    .filter((service) => service.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((service) => ({ id: service.id, name: service.name[locale] }))
}
