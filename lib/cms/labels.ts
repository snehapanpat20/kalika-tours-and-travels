import type { DestinationCategory } from "@/generated/prisma/enums"

export const destinationCategoryLabels: Record<DestinationCategory, string> = {
  MAHARASHTRA: "Maharashtra",
  OTHER_STATES: "Other states",
  PILGRIMAGE: "Pilgrimage",
  FAMILY: "Family",
  GROUP: "Group",
  CORPORATE: "Corporate",
  OUTSTATION: "Outstation",
}
