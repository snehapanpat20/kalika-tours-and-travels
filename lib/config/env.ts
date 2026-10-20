import "server-only"
import { z } from "zod"
import { AppError } from "@/lib/errors/app-error"

/**
 * Server-side configuration. Values come only from the environment
 * (.env.local in development, the host's settings in production).
 * Nothing here is ever sent to the browser.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters.").optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  /** Comma-separated origins allowed to call the API from a browser. */
  ALLOWED_ORIGINS: z.string().optional(),
  /** Where new-enquiry notifications are sent. */
  NOTIFY_EMAIL: z.email().optional(),
  /** smtp (default) sends real email; log prints it to the server log; none disables it. */
  EMAIL_TRANSPORT: z.enum(["smtp", "log", "none"]).default("smtp"),
  EMAIL_HOST: z.string().min(1).optional(),
  EMAIL_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  EMAIL_USER: z.string().min(1).optional(),
  EMAIL_PASSWORD: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  /**
   * How many proxies in front of the app add to X-Forwarded-For. 1 is right for
   * Vercel, Render, Railway or a single nginx. Used to find the real visitor IP.
   */
  TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).max(5).default(1),
  /**
   * Where uploaded images (gallery photos, review photos) are stored.
   * local    = files on this server's disk (development, or a server with a persistent disk)
   * supabase = Supabase Storage (needed on Vercel); uses the three SUPABASE_* settings below
   * none     = uploads switched off
   * Defaults to local in development and none in production.
   */
  STORAGE_DRIVER: z.enum(["local", "supabase", "none"]).optional(),
  /** Folder for the local driver. Kept outside public/ and served through /media. */
  UPLOAD_DIR: z.string().min(1).optional(),
  /** Supabase project URL (https://<project>.supabase.co). Server-only: never NEXT_PUBLIC_. */
  SUPABASE_URL: z.url({ protocol: /^https?$/, error: "SUPABASE_URL must be the project URL." }).optional(),
  /** Supabase secret key (sb_secret_…, or the legacy service_role key). Server-only; bypasses Row Level Security. */
  SUPABASE_SECRET_KEY: z.string().min(20, "SUPABASE_SECRET_KEY looks incomplete.").optional(),
  /** Bucket for uploaded images. Every folder (fleet/, gallery/, …) goes into this one bucket. */
  SUPABASE_STORAGE_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{1,62}$/, "SUPABASE_STORAGE_BUCKET must be a bucket name such as fleet-photos.")
    .optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

let cached: ServerEnv | undefined

export function getServerEnv(): ServerEnv {
  if (cached) return cached

  const raw = Object.fromEntries(Object.keys(serverEnvSchema.shape).map((key) => [key, blankToUndefined(process.env[key])]))
  const parsed = serverEnvSchema.safeParse(raw)

  if (!parsed.success) {
    // Name the variables, never their values
    const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].join(", ")
    console.error(`[config] Invalid environment variables: ${names}`)
    throw new AppError("CONFIG", "The server is not configured correctly.", 500)
  }

  cached = parsed.data
  return cached
}

export const isProduction = () => getServerEnv().NODE_ENV === "production"

export function requireEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = getServerEnv()[key]
  if (value === undefined || value === null || value === "") {
    console.error(`[config] Missing environment variable: ${String(key)}`)
    throw new AppError("CONFIG", "The server is not configured correctly.", 500)
  }
  return value as NonNullable<ServerEnv[K]>
}

/** Origins allowed for cross-origin browser requests and state-changing admin calls. */
export function getAllowedOrigins(): string[] {
  const env = getServerEnv()
  const listed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
  const site = env.NEXT_PUBLIC_SITE_URL ? [new URL(env.NEXT_PUBLIC_SITE_URL).origin] : []
  return [...new Set([...listed, ...site])]
}
