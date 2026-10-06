/** Reads a dotted path ("home.hero.titleLead") from a plain object. */
export function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), source)
}

/** Writes a string at an existing dotted path. Paths that do not already exist are ignored. */
export function setExistingStringPath(target: Record<string, unknown>, path: string, value: string): boolean {
  const keys = path.split(".")
  const last = keys.pop()
  let node: unknown = target
  for (const key of keys) {
    if (!node || typeof node !== "object" || !(key in node)) return false
    node = (node as Record<string, unknown>)[key]
  }
  if (!last || !node || typeof node !== "object" || typeof (node as Record<string, unknown>)[last] !== "string") return false
  ;(node as Record<string, unknown>)[last] = value
  return true
}
