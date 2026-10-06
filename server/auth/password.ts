// No "server-only" import: the admin CLI script also uses this file. node:crypto keeps it out of browser bundles.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

/**
 * scrypt is memory-hard and built into Node, so no native module is needed.
 * N=2^15, r=8, p=1 follows current OWASP guidance.
 */
const params = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const keyLength = 64

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLength, params, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

export const MIN_ADMIN_PASSWORD_LENGTH = 12

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const derived = await derive(password, salt)
  return `scrypt$${params.N}$${salt}$${derived.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, salt, hash] = stored.split("$")
  if (scheme !== "scrypt" || Number(cost) !== params.N || !salt || !hash) return false

  const derived = await derive(password, salt)
  const expected = Buffer.from(hash, "hex")
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

/** A real hash of a random password, used to keep timing equal for unknown emails. */
let decoyHash: Promise<string> | undefined
export function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword(randomBytes(24).toString("hex"))
  return decoyHash
}
