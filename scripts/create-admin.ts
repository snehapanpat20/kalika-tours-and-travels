/**
 * Creates the admin login, or resets its password.
 *
 *   npm run admin:create
 *   npm run admin:create -- --email owner@example.com --name "Umesh Panpat"
 *   npm run admin:create -- --email owner@example.com --role CONTENT_ADMIN
 *
 * Roles: SUPER_ADMIN (everything) or CONTENT_ADMIN (enquiries and website content).
 * Without --role, the first admin becomes SUPER_ADMIN and later ones CONTENT_ADMIN;
 * resetting a password keeps the existing role unless --role is given.
 *
 * The password is typed at a hidden prompt. For automated setups only, it can
 * come from the ADMIN_PASSWORD environment variable instead.
 * Resetting a password signs that admin out everywhere.
 */
import { config } from "dotenv"
import { createInterface } from "node:readline"
import { Writable } from "node:stream"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"
import { MIN_ADMIN_PASSWORD_LENGTH, hashPassword } from "../server/auth/password"

config({ path: [".env.local", ".env"], quiet: true })

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index > -1 ? process.argv[index + 1] : undefined
}

function ask(question: string, hidden = false): Promise<string> {
  let muted = false
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk)
      callback()
    },
  })
  const rl = createInterface({ input: process.stdin, output, terminal: true })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write("\n")
      resolve(answer.trim())
    })
    muted = hidden
  })
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Add it to .env.local first.")

  const email = (argument("email") ?? process.env.ADMIN_EMAIL ?? (await ask("Admin email: "))).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That email address does not look valid.")
  const name = argument("name") ?? (await ask("Admin name [Umesh Panpat]: ")) ?? ""
  const roleArgument = argument("role")?.toUpperCase()
  if (roleArgument && roleArgument !== "SUPER_ADMIN" && roleArgument !== "CONTENT_ADMIN") {
    throw new Error("--role must be SUPER_ADMIN or CONTENT_ADMIN.")
  }
  const role = roleArgument as "SUPER_ADMIN" | "CONTENT_ADMIN" | undefined

  let password = process.env.ADMIN_PASSWORD ?? ""
  if (!password) {
    password = await ask(`Password (at least ${MIN_ADMIN_PASSWORD_LENGTH} characters): `, true)
    const repeat = await ask("Repeat password: ", true)
    if (password !== repeat) throw new Error("The passwords do not match.")
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`The password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`)
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
  try {
    const passwordHash = await hashPassword(password)
    const existing = await prisma.admin.findUnique({ where: { email } })
    if (existing) {
      // Resetting from the server also re-enables the account and clears "must change password"
      const updated = await prisma.admin.update({
        where: { email },
        data: { passwordHash, name: name || existing.name, tokenVersion: { increment: 1 }, isActive: true, mustChangePassword: false, ...(role ? { role } : {}) },
      })
      console.log(`Password reset for ${email} (${updated.role}). Existing sessions were signed out.`)
    } else {
      const firstSuperAdmin = (await prisma.admin.count({ where: { role: "SUPER_ADMIN" } })) === 0
      const created = await prisma.admin.create({
        data: { email, name: name || "Umesh Panpat", passwordHash, role: role ?? (firstSuperAdmin ? "SUPER_ADMIN" : "CONTENT_ADMIN") },
      })
      console.log(`Admin created: ${email} (${created.role})`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
