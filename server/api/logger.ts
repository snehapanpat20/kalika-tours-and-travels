import "server-only"

type Fields = Record<string, unknown>

/** Keys whose values must never reach the logs. */
const redactedKeys = /pass(word)?|token|secret|authorization|cookie/i

function redact(fields: Fields): Fields {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, redactedKeys.test(key) ? "[redacted]" : value]))
}

function write(level: "info" | "warn" | "error", event: string, fields: Fields = {}) {
  // One JSON object per line: easy to read locally and to search on hosting dashboards.
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...redact(fields) })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
}

/**
 * The parts of an error worth logging. Database and network errors keep the
 * useful detail in `code` (for example ECONNREFUSED or a Prisma P-code) or `cause`.
 */
export function describeError(error: unknown): Fields {
  if (!(error instanceof Error)) return { error: String(error) }
  const extra = error as Error & { code?: unknown; cause?: unknown }
  return {
    name: error.name,
    message: error.message.trim() || undefined,
    code: typeof extra.code === "string" || typeof extra.code === "number" ? extra.code : undefined,
    cause: extra.cause instanceof Error ? extra.cause.message : extra.cause === undefined ? undefined : String(extra.cause),
  }
}
