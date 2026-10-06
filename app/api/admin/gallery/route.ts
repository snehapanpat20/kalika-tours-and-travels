import { AppError } from "@/lib/errors/app-error"
import { parseInput } from "@/lib/validation/parse"
import { galleryFieldsSchema, galleryListSchema } from "@/server/admin/content-schemas"
import { searchParamsToObject } from "@/server/admin/schemas"
import { apiRoute, formFields, formFile, ok, preflight, readFormData } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { GALLERY_UPLOAD_MAX_BYTES, adminListGallery, createGalleryItem } from "@/server/content/gallery"

/** GET /api/admin/gallery?search=&visibility=published|draft&featured=yes&tripType=&sort=order|newest|tripDate&page= */
export const GET = apiRoute(
  async (request) => {
    await requireAdmin(request, "gallery.read")
    const query = parseInput(galleryListSchema, searchParamsToObject(request.url), "Some filters are not valid.")
    return ok(await adminListGallery(query))
  },
  { cors: true },
)

/** POST /api/admin/gallery (multipart): add a photo, either uploaded (`image`) or a website image (`imagePath`). */
export const POST = apiRoute(
  async (request) => {
    const admin = await requireAdmin(request, "gallery.write")
    const form = await readFormData(request, GALLERY_UPLOAD_MAX_BYTES + 64 * 1024)
    const fields = parseInput(galleryFieldsSchema, formFields(form))
    const file = formFile(form, "image")
    if (!file && !fields.imagePath) {
      throw new AppError("VALIDATION", "Add a photo: upload an image or choose a website image.", 422, [{ field: "image", message: "Add a photo: upload an image or choose a website image." }])
    }
    const item = await createGalleryItem(fields, file)
    await recordAudit(admin, { action: "create", entityType: "GalleryItem", entityId: item.id, summary: item.title, metadata: { published: item.published } })
    return ok({ item }, { status: 201, message: "Photo added." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["GET", "POST"])
