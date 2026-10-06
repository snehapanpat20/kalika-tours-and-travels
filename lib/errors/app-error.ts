export const errorCodes = [
  "BAD_REQUEST",
  "VALIDATION",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "RATE_LIMITED",
  "CONFIG",
  "SERVICE_UNAVAILABLE",
  "NOT_IMPLEMENTED",
  "INTERNAL",
] as const

export type ErrorCode = (typeof errorCodes)[number]

/** One problem with one submitted field. `field` is the request body key. */
export type FieldIssue = {
  field: string
  message: string
}

/**
 * An error that is safe to show to the client.
 * Anything that is not an AppError is reported as a generic 500.
 */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly errors: FieldIssue[]
  readonly headers?: Record<string, string>

  constructor(code: ErrorCode, message: string, status: number, errors: FieldIssue[] = [], headers?: Record<string, string>) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = status
    this.errors = errors
    this.headers = headers
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
