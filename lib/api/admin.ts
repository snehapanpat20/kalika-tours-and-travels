import { apiRequest } from "@/lib/api/client"
import type { EnquiryStatus, ReviewStatus, TravelType } from "@/generated/prisma/enums"
import type { SerializedGalleryItem } from "@/server/content/gallery"
import type { SerializedReview } from "@/server/content/reviews"
import type { SerializedEnquiry } from "@/server/enquiries/service"

/**
 * Admin calls from the browser. The session lives in an HttpOnly cookie the
 * browser sends automatically; nothing here reads or stores credentials.
 */

export type AdminEnquiry = SerializedEnquiry

export async function signIn(email: string, password: string) {
  return apiRequest<{ admin: { id: string; email: string; name: string }; expiresAt: string }>("/api/admin/auth/login", {
    method: "POST",
    body: { email, password },
  })
}

export async function signOut() {
  return apiRequest<object>("/api/admin/auth/logout", { method: "POST", body: {} })
}

export async function setEnquiryStatus(id: string, status: EnquiryStatus): Promise<AdminEnquiry> {
  const response = await apiRequest<{ enquiry: AdminEnquiry }>(`/api/admin/enquiries/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  })
  return response.enquiry
}

export async function deleteEnquiry(id: string) {
  return apiRequest<object>(`/api/admin/enquiries/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// ─── Gallery ──────────────────────────────────────────────────

export type AdminGalleryItem = SerializedGalleryItem

/** Adds a photo. `form` carries the fields plus either `image` (file) or `imagePath`. */
export async function createGalleryItem(form: FormData) {
  return apiRequest<{ item: AdminGalleryItem }>("/api/admin/gallery", { method: "POST", body: form })
}

export async function updateGalleryItem(id: string, form: FormData) {
  return apiRequest<{ item: AdminGalleryItem }>(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: "PATCH", body: form })
}

export async function deleteGalleryItem(id: string) {
  return apiRequest<object>(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// ─── Reviews ──────────────────────────────────────────────────

export type AdminReview = SerializedReview

export type ReviewChanges = {
  status?: ReviewStatus
  customerName?: string
  destination?: string
  tripType?: TravelType | null
  removePhoto?: boolean
}

export async function updateReview(id: string, changes: ReviewChanges) {
  return apiRequest<{ review: AdminReview }>(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "PATCH", body: changes })
}

export async function deleteReview(id: string) {
  return apiRequest<object>(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "DELETE" })
}

// ─── Website content items (offers, announcements, destinations, services) ───

export type ContentKind = "offers" | "announcements" | "destinations" | "services" | "vehicles"

/** Creates (id null) or updates an item. Multipart when it can carry an image, JSON otherwise. */
export async function saveContentItem<T extends object>(kind: ContentKind, id: string | null, body: FormData | Record<string, unknown>) {
  const path = id ? `/api/admin/${kind}/${encodeURIComponent(id)}` : `/api/admin/${kind}`
  return apiRequest<T>(path, { method: id ? "PATCH" : "POST", body })
}

export async function deleteContentItem(kind: ContentKind, id: string) {
  return apiRequest<object>(`/api/admin/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" })
}

/** Copies what the website shows today into the admin panel (destinations or services). */
export async function importBuiltIn(kind: "destinations" | "services" | "vehicles") {
  return apiRequest<{ count: number }>(`/api/admin/${kind}/import`, { method: "POST", body: {} })
}

// ─── Fleet: vehicle order and photos ──────────────────────────

const vehiclePath = (id: string) => `/api/admin/vehicles/${encodeURIComponent(id)}`

/** Saves the order of every vehicle, first to last. */
export async function reorderVehicles(ids: string[]) {
  return apiRequest<{ count: number }>("/api/admin/vehicles/order", { method: "PUT", body: { ids } })
}

/** Adds one photo: an `image` upload or the `imagePath` of a photo already on the website. */
export async function addVehiclePhoto<T extends object>(vehicleId: string, form: FormData) {
  return apiRequest<T>(`${vehiclePath(vehicleId)}/photos`, { method: "POST", body: form })
}

/** Replaces a photo and/or changes its descriptions. */
export async function updateVehiclePhoto<T extends object>(vehicleId: string, photoId: string, form: FormData) {
  return apiRequest<T>(`${vehiclePath(vehicleId)}/photos/${encodeURIComponent(photoId)}`, { method: "PATCH", body: form })
}

export async function deleteVehiclePhoto<T extends object>(vehicleId: string, photoId: string) {
  return apiRequest<T>(`${vehiclePath(vehicleId)}/photos/${encodeURIComponent(photoId)}`, { method: "DELETE" })
}

/** Saves the photo order and the cover. */
export async function arrangeVehiclePhotos<T extends object>(vehicleId: string, ids: string[], coverId: string) {
  return apiRequest<T>(`${vehiclePath(vehicleId)}/photos`, { method: "PUT", body: { ids, coverId } })
}

// ─── Website sections (hero, why Kalika, Traveller, …) ─────────

export async function saveSectionDraft(key: string, form: FormData) {
  return apiRequest<{ section: unknown }>(`/api/admin/content/${encodeURIComponent(key)}`, { method: "PUT", body: form })
}

export async function publishSection(key: string) {
  return apiRequest<{ section: unknown }>(`/api/admin/content/${encodeURIComponent(key)}/publish`, { method: "POST", body: {} })
}

export async function discardSection(key: string) {
  return apiRequest<{ section: unknown }>(`/api/admin/content/${encodeURIComponent(key)}/discard`, { method: "POST", body: {} })
}

// ─── Admin users (Super Admin) and own account ────────────────

export async function createAdminUser(body: { name: string; email: string; role: string; password: string }) {
  return apiRequest<{ user: unknown }>("/api/admin/users", { method: "POST", body })
}

export async function updateAdminUser(id: string, body: { name?: string; email?: string; role?: string; isActive?: boolean }) {
  return apiRequest<{ user: unknown }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body })
}

export async function resetAdminUserPassword(id: string, password: string) {
  return apiRequest<{ user: unknown }>(`/api/admin/users/${encodeURIComponent(id)}/password`, { method: "POST", body: { password } })
}

export async function updateOwnProfile(name: string) {
  return apiRequest<{ account: unknown }>("/api/admin/account", { method: "PATCH", body: { name } })
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ account: unknown }>("/api/admin/account/password", { method: "POST", body: { currentPassword, newPassword } })
}

/** Opens the website with unpublished changes visible (for the signed-in admin only). */
export function previewHref(path: string) {
  return `/api/admin/preview?path=${encodeURIComponent(path)}`
}
