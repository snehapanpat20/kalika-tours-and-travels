import type { ErrorCode, FieldIssue } from "@/lib/errors/app-error"

/** Every successful API response: `{ success: true, ...payload }`. */
export type ApiSuccess<T extends object = object> = { success: true; message?: string } & T

/** Every failed API response. `errors` lists field problems, and is empty otherwise. */
export type ApiFailure = {
  success: false
  code: ErrorCode
  message: string
  errors: FieldIssue[]
}

export type ApiResponse<T extends object = object> = ApiSuccess<T> | ApiFailure
