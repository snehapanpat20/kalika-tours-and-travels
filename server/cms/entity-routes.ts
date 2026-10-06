import "server-only"
import type { z } from "zod"
import type { Permission } from "@/lib/auth/permissions"
import { parseInput } from "@/lib/validation/parse"
import { readContentId, type IdRouteContext } from "@/server/admin/params"
import { searchParamsToObject } from "@/server/admin/schemas"
import { apiRoute, formFields, formFile, ok, preflight, readFormData, readJsonBody } from "@/server/api/http"
import { recordAudit, type AuditEntityType } from "@/server/audit/log"
import { requireAdmin } from "@/server/auth/admin-session"
import { IMAGE_MAX_BYTES } from "@/server/cms/entity-helpers"

type Published = { published: boolean }

/**
 * Route handlers for one kind of website content (offers, destinations, …).
 * Every handler checks the admin's permission first, validates the input with
 * the module's schema, and records the change in the audit log.
 * Multipart bodies carry an optional `image` file; JSON bodies have no file.
 */
export function contentRoutes<
  CreateSchema extends z.ZodType,
  UpdateSchema extends z.ZodType,
  ListSchema extends z.ZodType,
  Item extends Published & { id: string },
>(config: {
  label: string
  entityType: AuditEntityType
  /** Response key for one item, e.g. "offer". */
  key: string
  body: "multipart" | "json"
  permissions: { read: Permission; write: Permission; delete: Permission }
  summary: (item: Item) => string
  list: { schema: ListSchema; run: (query: z.infer<ListSchema>) => Promise<object> }
  create: { schema: CreateSchema; run: (input: z.infer<CreateSchema>, file: File | null) => Promise<Item> }
  update: { schema: UpdateSchema; run: (id: string, input: z.infer<UpdateSchema>, file: File | null) => Promise<{ before: Item; after: Item }> }
  remove: (id: string) => Promise<Item>
  get?: (id: string) => Promise<Item>
}) {
  const readBody = async (request: Request) => {
    if (config.body === "json") return { fields: await readJsonBody(request, 16 * 1024), file: null }
    const form = await readFormData(request, IMAGE_MAX_BYTES + 128 * 1024)
    return { fields: formFields(form), file: formFile(form, "image") }
  }

  const collection = {
    GET: apiRoute(
      async (request) => {
        await requireAdmin(request, config.permissions.read)
        const query = parseInput(config.list.schema as z.ZodType<z.output<ListSchema>>, searchParamsToObject(request.url), "Some filters are not valid.")
        return ok(await config.list.run(query))
      },
      { cors: true },
    ),
    POST: apiRoute(
      async (request) => {
        const admin = await requireAdmin(request, config.permissions.write)
        const { fields, file } = await readBody(request)
        const input = parseInput(config.create.schema as z.ZodType<z.output<CreateSchema>>, fields)
        const item = await config.create.run(input, file)
        await recordAudit(admin, { action: "create", entityType: config.entityType, entityId: item.id, summary: config.summary(item), metadata: { published: item.published } })
        return ok({ [config.key]: item }, { status: 201, message: `${config.label} added.` })
      },
      { cors: true },
    ),
    OPTIONS: preflight(["GET", "POST"]),
  }

  const single = {
    GET: apiRoute<IdRouteContext>(
      async (request, context) => {
        await requireAdmin(request, config.permissions.read)
        const id = await readContentId(context, config.label)
        if (!config.get) return ok({})
        return ok({ [config.key]: await config.get(id) })
      },
      { cors: true },
    ),
    PATCH: apiRoute<IdRouteContext>(
      async (request, context) => {
        const admin = await requireAdmin(request, config.permissions.write)
        const id = await readContentId(context, config.label)
        const { fields, file } = await readBody(request)
        const input = parseInput(config.update.schema as z.ZodType<z.output<UpdateSchema>>, fields)
        const { before, after } = await config.update.run(id, input, file)
        const action = before.published !== after.published ? (after.published ? "publish" : "unpublish") : "update"
        await recordAudit(admin, { action, entityType: config.entityType, entityId: id, summary: config.summary(after) })
        return ok({ [config.key]: after }, { message: `${config.label} saved.` })
      },
      { cors: true },
    ),
    DELETE: apiRoute<IdRouteContext>(
      async (request, context) => {
        const admin = await requireAdmin(request, config.permissions.delete)
        const id = await readContentId(context, config.label)
        const removed = await config.remove(id)
        await recordAudit(admin, { action: "delete", entityType: config.entityType, entityId: id, summary: config.summary(removed) })
        return ok({}, { message: `${config.label} deleted.` })
      },
      { cors: true },
    ),
    OPTIONS: preflight(["GET", "PATCH", "DELETE"]),
  }

  return { collection, single }
}
