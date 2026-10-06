import type { ErrorCode, FieldIssue } from "@/lib/errors/app-error"
import type { ApiFailure, ApiSuccess } from "@/types/api"

/**
 * Browser-side API client. Every call to our backend goes through here, so
 * timeouts, JSON handling and error shapes are consistent.
 *
 * NEXT_PUBLIC_API_BASE_URL is empty by default (same origin). Set it only if
 * the API is ever hosted on a separate domain.
 */
const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode | "NETWORK" | "TIMEOUT"
  readonly errors: FieldIssue[]

  constructor(status: number, code: ApiError["code"], message: string, errors: FieldIssue[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.errors = errors
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  /** Abort after this many milliseconds. */
  timeoutMs?: number
  signal?: AbortSignal
}

export async function apiRequest<T extends object>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort("timeout"), options.timeoutMs ?? (options.body instanceof FormData ? 60_000 : 15_000))
  options.signal?.addEventListener("abort", () => controller.abort(options.signal?.reason))

  // FormData (file uploads) is sent as-is so the browser sets the multipart boundary
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: { Accept: "application/json", ...(options.body === undefined || isForm ? {} : { "Content-Type": "application/json" }) },
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
      credentials: baseUrl ? "include" : "same-origin",
      signal: controller.signal,
    })
  } catch {
    const timedOut = controller.signal.reason === "timeout"
    throw new ApiError(0, timedOut ? "TIMEOUT" : "NETWORK", timedOut ? "The request took too long." : "Could not reach the server.")
  } finally {
    clearTimeout(timer)
  }

  let payload: ApiSuccess<T> | ApiFailure | null = null
  try {
    payload = (await response.json()) as ApiSuccess<T> | ApiFailure
  } catch {
    // Not JSON (for example a proxy error page)
  }

  if (!response.ok || !payload || payload.success !== true) {
    const failure = payload && payload.success === false ? payload : null
    throw new ApiError(response.status, failure?.code ?? "INTERNAL", failure?.message ?? "Something went wrong.", failure?.errors ?? [])
  }
  return payload
}
