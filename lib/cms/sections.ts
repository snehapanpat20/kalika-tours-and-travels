import type { CmsLink } from "@/lib/cms/links"
import type { Permission } from "@/lib/auth/permissions"
import type { PageKey } from "@/lib/routes"

/**
 * The website text an admin may edit. Each field replaces one piece of the
 * built-in copy (its dictionary `path`) in English and/or Marathi. Anything
 * left empty keeps the built-in text, so an empty CMS shows the site exactly
 * as designed. Layout, styles and structure are not editable here.
 */
export type ContentField = {
  name: string
  label: string
  help?: string
  multiline?: boolean
  max: number
  /** Dictionary path this field overrides, e.g. "home.hero.titleLead". */
  path: string
}

export type ContentLinkDef = {
  name: string
  label: string
  /** Text field holding the button label. */
  textField: string
  /** Where the button goes when no link is chosen. */
  defaultLink: CmsLink
}

export type ContentSection = {
  key: SectionKey
  title: string
  description: string
  /** Where "Preview" opens. */
  previewPage: PageKey
  /** Hash on the preview page that scrolls to the section. */
  previewAnchor?: string
  /** Permission needed to edit (reading needs the matching .read). */
  permission: Extract<Permission, "content.write" | "traveller.write" | "settings.write">
  fields: ContentField[]
  image?: { label: string; help: string; minWidth: number }
  links?: ContentLinkDef[]
  /** The Traveller section also manages a feature list and photos. */
  features?: boolean
  photos?: boolean
}

export const sectionKeys = ["hero", "journeys", "why", "destinations", "gallery", "reviews", "cta", "traveller", "seo"] as const
export type SectionKey = (typeof sectionKeys)[number]

const intro = (base: string, labels: { eyebrow?: string; title?: string; description?: string } = {}): ContentField[] => [
  { name: "eyebrow", label: labels.eyebrow ?? "Small label above the heading", max: 60, path: `${base}.eyebrow` },
  { name: "title", label: labels.title ?? "Heading", max: 120, path: `${base}.title` },
  { name: "description", label: labels.description ?? "Text under the heading", multiline: true, max: 400, path: `${base}.description` },
]

export const contentSections: ContentSection[] = [
  {
    key: "hero",
    title: "Homepage hero",
    description: "The photo, headline and buttons at the top of the homepage. The business name above the headline is fixed.",
    previewPage: "home",
    permission: "content.write",
    fields: [
      { name: "eyebrow", label: "Small label above the headline", help: "Not shown at the moment: the homepage shows the location there.", max: 60, path: "home.hero.eyebrow" },
      { name: "titleLead", label: "Headline under the name, first part", max: 60, path: "home.hero.titleLead" },
      { name: "titleFollow", label: "Headline under the name, second part", max: 40, path: "home.hero.titleFollow" },
      { name: "description", label: "Short sentence", help: "Not shown at the moment: the homepage shows only the name and the headline.", multiline: true, max: 160, path: "home.hero.description" },
      { name: "searchPlaceholder", label: "Search box hint", help: "Not shown at the moment: the homepage has no search box.", max: 60, path: "home.hero.searchPlaceholder" },
      { name: "plan", label: "Button text", max: 30, path: "home.hero.plan" },
      { name: "imageAlt", label: "Photo description (for screen readers)", help: "Describe what the photo shows.", max: 300, path: "home.hero.imageAlt" },
    ],
    image: {
      label: "Background photo",
      help: "A wide landscape photo at least 1600 pixels wide. The name and headline sit centred over it under a dark tint.",
      minWidth: 1600,
    },
  },
  {
    key: "journeys",
    title: "Journey categories",
    description: "The heading above the five journey cards on the homepage.",
    previewPage: "home",
    previewAnchor: "journeys",
    permission: "content.write",
    fields: intro("home.journeys"),
  },
  {
    key: "why",
    title: "Why Kalika",
    description: "The four reasons to travel with Kalika on the homepage.",
    previewPage: "home",
    permission: "content.write",
    fields: [
      ...intro("home.why"),
      ...(["comfort", "together", "service", "flexible"] as const).flatMap((point, index): ContentField[] => [
        { name: `${point}Title`, label: `Reason ${index + 1}: title`, max: 60, path: `home.why.points.${point}.title` },
        { name: `${point}Body`, label: `Reason ${index + 1}: description`, multiline: true, max: 200, path: `home.why.points.${point}.body` },
      ]),
    ],
  },
  {
    key: "destinations",
    title: "Destinations introduction",
    description: "The heading of the destinations section on the homepage.",
    previewPage: "home",
    permission: "content.write",
    fields: intro("home.destinations"),
  },
  {
    key: "gallery",
    title: "Gallery introduction",
    description: "The heading of the gallery page and the homepage photo section.",
    previewPage: "gallery",
    permission: "content.write",
    fields: intro("pages.gallery"),
  },
  {
    key: "reviews",
    title: "Reviews introduction",
    description: "The heading of the reviews page and the homepage reviews section.",
    previewPage: "reviews",
    permission: "content.write",
    fields: intro("pages.reviews"),
  },
  {
    key: "cta",
    title: "Final call to action",
    description: "The closing section near the bottom of most pages.",
    previewPage: "home",
    permission: "content.write",
    fields: [...intro("home.cta"), { name: "plan", label: "Button text", max: 40, path: "home.cta.plan" }],
  },
  {
    key: "traveller",
    title: "Our Traveller",
    description: "The vehicle: its description, features and photos, on the homepage and the Our Traveller page.",
    previewPage: "traveller",
    permission: "traveller.write",
    fields: [
      { name: "homeEyebrow", label: "Homepage: small label", max: 60, path: "home.traveller.eyebrow" },
      { name: "homeTitle", label: "Homepage: heading", max: 120, path: "home.traveller.title" },
      { name: "homeDescription", label: "Homepage: description", multiline: true, max: 400, path: "home.traveller.description" },
      { name: "seater", label: "Vehicle name under 20+1", max: 60, path: "home.traveller.seater" },
      { name: "capacity", label: "Seating line", max: 80, path: "home.traveller.capacity" },
      { name: "pageTitleLead", label: "Traveller page: headline, first line", max: 80, path: "pages.traveller.titleLead" },
      { name: "pageTitleFollow", label: "Traveller page: headline, second line", max: 80, path: "pages.traveller.titleFollow" },
      { name: "pageDescription", label: "Traveller page: introduction", multiline: true, max: 400, path: "pages.traveller.description" },
      { name: "specsTitle", label: "Traveller page: features heading", max: 120, path: "pages.traveller.specsTitle" },
      { name: "specsBody", label: "Traveller page: features text", multiline: true, max: 300, path: "pages.traveller.specsBody" },
    ],
    features: true,
    photos: true,
  },
  {
    key: "seo",
    title: "Search engines (SEO)",
    description: "How each page appears in Google and when shared on WhatsApp or social media. Leave a box empty to keep the current wording.",
    previewPage: "home",
    permission: "settings.write",
    fields: (
      [
        ["home", "Home"],
        ["about", "About"],
        ["services", "Services"],
        ["destinations", "Destinations"],
        ["traveller", "Our Traveller"],
        ["gallery", "Gallery"],
        ["reviews", "Reviews"],
        ["contact", "Contact"],
        ["plan", "Plan Your Trip"],
      ] as const
    ).flatMap(([page, label]): ContentField[] => [
      { name: `${page}Title`, label: `${label}: page title in Google`, help: "Best under 60 characters.", max: 70, path: `pages.meta.${page}.title` },
      { name: `${page}Description`, label: `${label}: description in Google`, help: "Best between 120 and 160 characters.", multiline: true, max: 170, path: `pages.meta.${page}.description` },
    ]),
    image: {
      label: "Sharing image",
      help: "Shown when a page is shared on WhatsApp, Facebook or X. Use a wide image, 1200 × 630 pixels works best.",
      minWidth: 1200,
    },
  },
]

export function getSection(key: string): ContentSection | undefined {
  return contentSections.find((section) => section.key === key)
}

export const MAX_TRAVELLER_FEATURES = 16
export const MAX_TRAVELLER_PHOTOS = 12
