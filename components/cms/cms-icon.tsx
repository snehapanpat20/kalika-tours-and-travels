import { Armchair, BriefcaseBusiness, Bus, Check, HeartHandshake, Landmark, Luggage, Music, Route, ShieldCheck, Snowflake, Sofa, Sparkles, UsersRound } from "lucide-react"
import type { Icon } from "@/components/home/home-content"
import { SteeringIcon, WindowIcon } from "@/components/ui/icons"
import { isCmsIcon, type CmsIconName } from "@/lib/cms/icons"

const icons: Record<CmsIconName, Icon> = {
  route: Route,
  heart: HeartHandshake,
  users: UsersRound,
  landmark: Landmark,
  briefcase: BriefcaseBusiness,
  bus: Bus,
  seats: Armchair,
  ac: Snowflake,
  legroom: Sofa,
  luggage: Luggage,
  audio: Music,
  clean: Sparkles,
  windows: WindowIcon,
  driver: SteeringIcon,
  shield: ShieldCheck,
  check: Check,
}

/** The drawing for a stored icon name; unknown names fall back to a tick. */
export function cmsIcon(name: string): Icon {
  return isCmsIcon(name) ? icons[name] : Check
}
