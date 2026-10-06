import { destinationImages, type ImageRef } from "@/components/home/home-content"
import type { DestinationPlaceId } from "@/types/home"

export type BuiltInGroupId = "maharashtra" | "beyond" | "pilgrimage"

/** The destinations the website shows when none are managed in the admin panel. */
export const builtInDestinationGroups: { id: BuiltInGroupId; image?: ImageRef; places: DestinationPlaceId[] }[] = [
  {
    id: "maharashtra",
    image: destinationImages.maharashtra,
    places: ["mahabaleshwar", "panchgani", "lonavala", "konkan", "mumbai", "shirdi", "nashik"],
  },
  { id: "beyond", places: ["goa", "karnataka", "gujarat", "rajasthan", "madhyaPradesh", "northIndia", "kerala"] },
  {
    id: "pilgrimage",
    image: destinationImages.pilgrimage,
    places: ["ujjain", "vrindavan", "varanasi", "tirupati", "ashtavinayak", "jyotirlinga"],
  },
]

/** Each place's own photograph (credits for photos by others: data/photo-credits.ts). */
export const builtInPlaceImages: Partial<Record<DestinationPlaceId, ImageRef>> = {
  lonavala: { category: "destinations", name: "lonavala-tiger-point" },
  panchgani: { category: "destinations", name: "panchgani-valley" },
  mahabaleshwar: { category: "destinations", name: "place-mahabaleshwar" },
  konkan: { category: "destinations", name: "place-konkan" },
  mumbai: { category: "destinations", name: "place-mumbai" },
  shirdi: { category: "destinations", name: "place-shirdi", position: "50% 30%" },
  nashik: { category: "destinations", name: "place-nashik" },
  ujjain: destinationImages.pilgrimage,
  vrindavan: { category: "destinations", name: "place-vrindavan" },
  varanasi: { category: "destinations", name: "place-varanasi" },
  tirupati: { category: "destinations", name: "place-tirupati" },
  ashtavinayak: { category: "destinations", name: "place-ashtavinayak" },
  jyotirlinga: { category: "destinations", name: "place-jyotirlinga" },
  goa: destinationImages.goa,
  karnataka: destinationImages.karnataka,
  gujarat: destinationImages.gujarat,
  rajasthan: destinationImages.rajasthan,
  madhyaPradesh: destinationImages["madhya-pradesh"],
  northIndia: destinationImages["north-india"],
  kerala: { category: "destinations", name: "kerala-boat" },
}
