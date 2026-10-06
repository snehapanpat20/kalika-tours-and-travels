import "server-only"
import { getStorageStatus } from "@/server/storage"
import { listBundledImages } from "@/server/storage/images"

/** What image pickers in the admin need: photos already on the website and whether uploads work. */
export async function getImageOptions() {
  const storage = getStorageStatus()
  return {
    bundledImages: await listBundledImages(),
    uploads: storage.enabled ? { enabled: true, persistent: storage.persistent } : { enabled: false, persistent: false, reason: storage.reason },
  }
}
