import { readStoredFile } from "@/server/storage"

/**
 * Serves uploaded images from the configured storage (this server's disk, or
 * Supabase Storage read with the server-only key, so the bucket can stay private).
 * Uploads live outside public/, because Next.js only serves public files that
 * existed at build time. Only "<folder>/<uuid>.webp" keys are looked up.
 * File names are random UUIDs and never overwritten, so responses are cached
 * for a long time, by browsers and by the CDN (s-maxage).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const key = (await params).path.join("/")
  const file = await readStoredFile(key)
  if (!file) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } })

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(file.byteLength),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  })
}
