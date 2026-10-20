import { z } from "zod"
import { AppError } from "@/lib/errors/app-error"
import { parseInput } from "@/lib/validation/parse"
import { apiRoute, formFields, formFile, ok, preflight, readFormData } from "@/server/api/http"
import { recordAudit } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { IMAGE_MAX_BYTES } from "@/server/cms/entity-helpers"
import { deleteVehiclePhoto, photoAddSchema, updateVehiclePhoto } from "@/server/cms/vehicles"

type PhotoRouteContext = { params: Promise<{ id: string; photoId: string }> }

/** A malformed id can never exist, so it is reported as not found. */
async function readIds(context: PhotoRouteContext) {
  const { id, photoId } = await context.params
  const vehicleId = z.uuid().safeParse(id)
  const photo = z.uuid().safeParse(photoId)
  if (!vehicleId.success || !photo.success) throw new AppError("NOT_FOUND", "Photo not found.", 404)
  return { vehicleId: vehicleId.data, photoId: photo.data }
}

/** PATCH: replace the photo (multipart `image` or `imagePath`) and/or change its descriptions. */
export const PATCH = apiRoute<PhotoRouteContext>(
  async (request, context) => {
    const admin = await requireAdmin(request, "fleet.write")
    const { vehicleId, photoId } = await readIds(context)
    const form = await readFormData(request, IMAGE_MAX_BYTES + 128 * 1024)
    const input = parseInput(photoAddSchema, formFields(form))
    const vehicle = await updateVehiclePhoto(vehicleId, photoId, input, formFile(form, "image"))
    await recordAudit(admin, { action: "photo_update", entityType: "Vehicle", entityId: vehicleId, summary: vehicle.name })
    return ok({ vehicle }, { message: "Photo saved." })
  },
  { cors: true },
)

/** DELETE: remove one photo (its uploaded file is deleted too). */
export const DELETE = apiRoute<PhotoRouteContext>(
  async (request, context) => {
    const admin = await requireAdmin(request, "fleet.delete")
    const { vehicleId, photoId } = await readIds(context)
    const vehicle = await deleteVehiclePhoto(vehicleId, photoId)
    await recordAudit(admin, { action: "photo_delete", entityType: "Vehicle", entityId: vehicleId, summary: vehicle.name })
    return ok({ vehicle }, { message: "Photo removed." })
  },
  { cors: true },
)

export const OPTIONS = preflight(["PATCH", "DELETE"])
