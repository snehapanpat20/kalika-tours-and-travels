import { business } from "@/data/business"
import { seedTimestamp } from "@/data/seed"
import type { SiteSetting } from "@/types/domain"

function setting(id: string, text: string): SiteSetting {
  return { id, value: { text }, updatedAt: seedTimestamp }
}

export const siteSettings: SiteSetting[] = [
  setting("business_name", business.name),
  setting("owner_name", business.owner),
  setting("phone", business.phone),
  setting("phone_e164", business.phoneE164),
  setting("phone_call_only", business.callOnlyPhone),
  setting("phone_call_only_e164", business.callOnlyPhoneE164),
  setting("email", business.email),
  setting("whatsapp_url", business.whatsappUrl),
  setting("instagram_url", business.instagramUrl),
  setting("whatsapp_community_url", business.whatsappCommunityUrl),
  setting("tagline_en", business.tagline.en),
  setting("tagline_mr", business.tagline.mr),
  setting("location_area_en", business.location.area.en),
  setting("location_area_mr", business.location.area.mr),
  setting("location_city_en", business.location.city.en),
  setting("location_city_mr", business.location.city.mr),
  setting("location_state_en", business.location.state.en),
  setting("location_state_mr", business.location.state.mr),
  setting("location_country_en", business.location.country.en),
  setting("location_country_mr", business.location.country.mr),
]
