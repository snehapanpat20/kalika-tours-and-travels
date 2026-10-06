/**
 * Icons an admin can pick for a service or a Traveller feature. Only these
 * names are stored; components/cms/cms-icon.tsx draws them.
 */
export const cmsIcons = {
  route: "Road / outstation",
  heart: "Family",
  users: "Group",
  landmark: "Temple / pilgrimage",
  briefcase: "Business / corporate",
  bus: "Vehicle",
  seats: "Seats",
  ac: "Air conditioning",
  legroom: "Legroom",
  luggage: "Luggage",
  audio: "Music / audio",
  clean: "Clean / sparkle",
  windows: "Windows",
  driver: "Driver / steering",
  shield: "Safety",
  check: "Tick",
} as const

export type CmsIconName = keyof typeof cmsIcons

export const cmsIconNames = Object.keys(cmsIcons) as CmsIconName[]

export function isCmsIcon(value: string): value is CmsIconName {
  return value in cmsIcons
}
