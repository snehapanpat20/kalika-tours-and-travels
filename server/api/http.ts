import "server-only"
import { getAllowedOrigins } from "@/lib/config/env"
import { AppError } from "@/lib/errors/app-error"
import { describeError, logger } from "@/server/api/logger"
import type { ApiFailure, ApiSuccess } from "@/types/api"

/** Default limit for JSON bodies. Enquiries are well under 4 KB. */
export const DEFAULT_BODY_LIMIT = 16 * 1024

type RouteHandler<C> = (request: Request, context: C) => Promise<Response>

type RouteOptions = {
  /** Answer cross-origin browser requests from ALLOWED_ORIGINS. */
  cors?: boolean
}

// ─── Responses ────────────────────────────────────────────────

export function ok<T extends object>(payload: T, init: { status?: number; message?: string } = {}): Response {
  const body: ApiSuccess<T> = { success: true, ...(init.message ? { message: init.message } : {}), ...payload }
  return Response.json(body, { status: init.status ?? 200 })
}

function failure(error: AppError): Response {
  const body: ApiFailure = { success: false, code: error.code, message: error.message, errors: error.errors }
  return Response.json(body, { status: error.status, headers: error.headers })
}

/**
 * Turns any thrown value into a safe response. Only AppError messages reach the
 * client; everything else is logged in full and reported as a generic 500.
 */
export function toErrorResponse(error: unknown, requestId: string): Response {
  if (error instanceof AppError) {
    if (error.status >= 500) logger.error("request_failed", { requestId, code: error.code, message: error.message })
    return failure(error)
  }

  logger.error("unhandled_error", { requestId, ...describeError(error), stack: error instanceof Error ? error.stack : undefined })
  return failure(new AppError("INTERNAL", "Something went wrong. Please try again.", 500))
}

// ─── Request body ─────────────────────────────────────────────

/**
 * Reads a JSON object body, refusing non-JSON content types, bodies over
 * `limit` bytes (even when Content-Length is missing or wrong) and non-objects.
 */
export async function readJsonBody(request: Request, limit = DEFAULT_BODY_LIMIT): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? ""
  if (!type.toLowerCase().includes("application/json")) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Send the request body as JSON.", 415)
  }

  const declared = Number(request.headers.get("content-length") ?? "0")
  if (declared > limit) throw new AppError("PAYLOAD_TOO_LARGE", "The request is too large.", 413)
  if (!request.body) throw new AppError("BAD_REQUEST", "The request body is empty.", 400)

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new AppError("PAYLOAD_TOO_LARGE", "The request is too large.", 413)
    }
    chunks.push(value)
  }

  const text = new TextDecoder().decode(Buffer.concat(chunks))
  if (!text.trim()) throw new AppError("BAD_REQUEST", "The request body is empty.", 400)

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new AppError("BAD_REQUEST", "The request body is not valid JSON.", 400)
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new AppError("BAD_REQUEST", "The request body must be a JSON object.", 400)
  }
  return parsed as Record<string, unknown>
}

// ─── CORS and headers ─────────────────────────────────────────

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin")
  // Never "*": only listed origins are echoed back, so cookies stay protected.
  if (!origin || !getAllowedOrigins().includes(origin)) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  }
}

function withHeaders(response: Response, extra: Record<string, string>): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(extra)) headers.set(key, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

const apiSecurityHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
}

/** Handles a CORS preflight for the given methods. */
export function preflight(methods: string[]) {
  return async (request: Request) => {
    const cors = corsHeaders(request)
    if (!cors["Access-Control-Allow-Origin"]) return new Response(null, { status: 204, headers: apiSecurityHeaders })
    return new Response(null, {
      status: 204,
      headers: {
        ...apiSecurityHeaders,
        ...cors,
        "Access-Control-Allow-Methods": [...methods, "OPTIONS"].join(", "),
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "600",
      },
    })
  }
}

// ─── Route wrapper ────────────────────────────────────────────

/**
 * Wraps a route handler with: request id, timing, access log, safe error
 * responses, security headers and (optionally) CORS.
 */
export function apiRoute<C = unknown>(handler: RouteHandler<C>, options: RouteOptions = {}) {
  return async (request: Request, context: C): Promise<Response> => {
    const started = performance.now()
    const requestId = crypto.randomUUID()
    let response: Response

    try {
      response = await handler(request, context)
    } catch (error) {
      response = toErrorResponse(error, requestId)
    }

    const final = withHeaders(response, {
      ...apiSecurityHeaders,
      ...(options.cors ? corsHeaders(request) : {}),
      "X-Request-Id": requestId,
    })

    // Path only: query strings can hold search terms such as names or phone numbers.
    logger.info("request", {
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      status: final.status,
      ms: Math.round(performance.now() - started),
    })

    return final
  }
}

/**
 * Reads a multipart form (used for uploads). The size is checked from
 * Content-Length before anything is parsed; requests without it are refused.
 */
export async function readFormData(request: Request, limit: number): Promise<FormData> {
  const type = request.headers.get("content-type") ?? ""
  if (!type.toLowerCase().startsWith("multipart/form-data")) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Send the request as multipart/form-data.", 415)
  }
  const declared = Number(request.headers.get("content-length") ?? "")
  if (!Number.isFinite(declared) || declared <= 0) throw new AppError("BAD_REQUEST", "The request is missing its size.", 411)
  if (declared > limit) throw new AppError("PAYLOAD_TOO_LARGE", "The request is too large.", 413)
  try {
    return await request.formData()
  } catch {
    throw new AppError("BAD_REQUEST", "The form data could not be read.", 400)
  }
}

/** Text fields of a form as a plain object (files are left out). */
export function formFields(form: FormData): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const [key, value] of form.entries()) if (typeof value === "string") fields[key] = value
  return fields
}

/** The file in `name`, or null when none was chosen. */
export function formFile(form: FormData, name: string): File | null {
  const value = form.get(name)
  return value instanceof File && value.size > 0 ? value : null
}
