import { readStoredFile } from "@/server/storage"

/**
 * Serves images saved by the local storage driver (uploads live outside
 * public/, because Next.js only serves public files that existed at build time).
 * File names are random UUIDs, so responses can be cached for a long time.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const key = (await params).path.join("/")
  const file = await readStoredFile(key)
  if (!file) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } })

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(file.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  })
}
