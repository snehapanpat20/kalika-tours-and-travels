import "server-only"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"
import { requireEnv } from "@/lib/config/env"

const globalForPrisma = globalThis as { __kalikaPrisma?: PrismaClient }

function createClient(): PrismaClient {
  // A small pool suits serverless hosts; each instance holds only a few connections.
  const adapter = new PrismaPg({ connectionString: requireEnv("DATABASE_URL"), max: 5 })
  return new PrismaClient({ adapter })
}

/** One client per process. Reused across hot reloads in development. */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__kalikaPrisma) {
    globalForPrisma.__kalikaPrisma = createClient()
  }
  return globalForPrisma.__kalikaPrisma
}
