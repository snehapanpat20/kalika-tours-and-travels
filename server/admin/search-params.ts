import "server-only"

export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>

/** Page searchParams as plain non-empty strings (first value of repeated keys). */
export async function readPageSearchParams(searchParams: PageSearchParams): Promise<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(await searchParams)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== ""),
  )
}

export function withQuery(path: string, params: Record<string, string>): string {
  return `${path}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`
}
