import type { CmsIconName } from "@/lib/cms/icons"

/** Text in both website languages. An empty string means "use the built-in text". */
export type LocalizedText = { en: string; mr: string }

export type ContentImage = { url: string; key: string | null; width: number; height: number }

export type TravellerFeature = { icon: CmsIconName; text: LocalizedText }

export type TravellerPhoto = ContentImage & { alt: LocalizedText; caption: LocalizedText }

/** What is stored for one website section (draft or published). */
export type SectionContent = {
  text: { en: Record<string, string>; mr: Record<string, string> }
  image: ContentImage | null
  links: Record<string, string>
  /** Traveller only. Empty means "show the built-in features". */
  features: TravellerFeature[]
  /** Traveller only. Empty means "show the built-in photos". */
  photos: TravellerPhoto[]
}

export const emptySectionContent = (): SectionContent => ({ text: { en: {}, mr: {} }, image: null, links: {}, features: [], photos: [] })

/** How an edited image arrives from the admin form. */
export type ImageChoice =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "upload"; file: string }
  | { kind: "website"; path: string }

/** One photo in the Traveller list as sent by the admin form. */
export type PhotoInput =
  | { kind: "existing"; url: string; alt: LocalizedText; caption: LocalizedText }
  | { kind: "upload"; file: string; alt: LocalizedText; caption: LocalizedText }
  | { kind: "website"; path: string; alt: LocalizedText; caption: LocalizedText }

/** The body of "Save draft" (sent as JSON in the `data` form field, files beside it). */
export type SectionDraftInput = {
  text: { en: Record<string, string>; mr: Record<string, string> }
  links: Record<string, string>
  image: ImageChoice
  features: TravellerFeature[]
  photos: PhotoInput[]
}

/** Admin view of a section: what is saved, what is live, and whether they differ. */
export type SectionState = {
  key: string
  draft: SectionContent
  published: SectionContent | null
  publishedAt: string | null
  updatedAt: string | null
  hasUnpublishedChanges: boolean
}
