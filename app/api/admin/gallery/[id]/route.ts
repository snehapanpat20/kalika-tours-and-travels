import { parseInput } from "@/lib/validation/parse"
import { galleryUpdateSchema } from "@/server/admin/content-schemas"
import { readContentId, type IdRouteContext as Context } from "@/server/admin/params"
import { apiRoute, formFields, formFile, ok, preflight, readFormData } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { GALLERY_UPLOAD_MAX_BYTES, deleteGalleryItem, getGalleryItem, updateGalleryItem } from "@/server/content/gallery"

/** GET /api/admin/gallery/:id */
export const GET = apiRoute<Context>(
  async (request, context) => {
    await requireAdmin(request, "gallery.read")
    return ok({ item: await getGalleryItem(await readContentId(context, "Gallery item")) })
  },
  { cors: true },
)

/** PATCH /api/admin/gallery/:id (multipart): update any fields, optionally replace the image. */
export const PATCH = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "gallery.write")
    const id = await readContentId(context, "Gallery item")
    const form = await readFormData(request, GALLERY_UPLOAD_MAX_BYTES + 64 * 1024)
    const fields = parseInput(galleryUpdateSchema, formFields(form))
    const before = await getGalleryItem(id)
    const item = await updateGalleryItem(id, fields, formFile(form, "image"))
    const action = before.published !== item.published ? (item.published ? "publish" : "unpublish") : "update"
    await recordAudit(admin, { action, entityType: "GalleryItem", entityId: id, summary: item.title })
    return ok({ item }, { message: "Photo updated." })
  },
  { cors: true },
)

/** DELETE /api/admin/gallery/:id: removes the item and its uploaded file. */
export const DELETE = apiRoute<Context>(
  async (request, context) => {
    const admin = await requireAdmin(request, "gallery.delete")
    const id = await readContentId(context, "Gallery item")
    const before = await getGalleryItem(id)
    await deleteGalleryItem(id)
    await recordAudit(admin, { action: "delete", entityType: "GalleryItem", entityId: id, summary: before.title })
    return ok({}, { message: "Photo deleted." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET", "PATCH", "DELETE"])
