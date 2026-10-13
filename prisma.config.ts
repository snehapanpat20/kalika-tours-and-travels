import { config } from "dotenv"
import { defineConfig } from "prisma/config"

// Next.js reads .env.local first; the Prisma CLI follows the same order.
config({ path: [".env.local", ".env"], quiet: true })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The Prisma CLI (migrations, studio) needs a session-level connection. When the app's
    // DATABASE_URL is a transaction pooler, set DIRECT_URL to the direct or session-pooler
    // string; without it (local development) the CLI uses DATABASE_URL as before.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
})
