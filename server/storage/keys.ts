import "server-only"

/** Keys are always a known folder plus a random UUID file name: nothing user-controlled. */
export const storageKeyPattern = /^(gallery|reviews|offers|destinations|services|content|fleet)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

/** Every driver calls this before touching a file, so no path outside the known folders is ever reached. */
export function assertStorageKey(key: string): void {
  if (!storageKeyPattern.test(key)) throw new Error("Invalid storage key")
}
