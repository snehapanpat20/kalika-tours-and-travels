import { parseInput } from "@/lib/validation/parse"
import { readContentId, type IdRouteContext } from "@/server/admin/params"
import { apiRoute, formFields, formFile, ok, preflight, readFormData, readJsonBody } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { IMAGE_MAX_BYTES } from "@/server/cms/entity-helpers"
import { addVehiclePhoto, arrangeVehiclePhotos, photoAddSchema, photoArrangeSchema } from "@/server/cms/vehicles"

/**
 * POST: add one photo (multipart: an `image` upload, or `imagePath` of a photo
 * already on the website, plus optional descriptions).
 * PUT: save the photo order and the cover (JSON: { ids, coverId }).
 */
export const POST = apiRoute<IdRouteContext>(
  async (request, context) => {
    const admin = await requireAdmin(request, "fleet.write")
    const id = await readContentId(context, "Vehicle")
    const form = await readFormData(request, IMAGE_MAX_BYTES + 128 * 1024)
    const input = parseInput(photoAddSchema, formFields(form))
    const vehicle = await addVehiclePhoto(id, input, formFile(form, "image"))
    await recordAudit(admin, { action: "photo_add", entityType: "Vehicle", entityId: id, summary: vehicle.name })
    return ok({ vehicle }, { status: 201, message: "Photo added." })
  },
  { cors: true },
)

export const PUT = apiRoute<IdRouteContext>(
  async (request, context) => {
    const admin = await requireAdmin(request, "fleet.write")
    const id = await readContentId(context, "Vehicle")
    const input = parseInput(photoArrangeSchema, await readJsonBody(request, 16 * 1024))
    const vehicle = await arrangeVehiclePhotos(id, input)
    await recordAudit(admin, { action: "photo_arrange", entityType: "Vehicle", entityId: id, summary: vehicle.name })
    return ok({ vehicle }, { message: "Photos saved." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["POST", "PUT"])
