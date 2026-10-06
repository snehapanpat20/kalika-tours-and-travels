/**
 * Starts the app for the API tests: applies migrations to the TEST database
 * from .env.test, then runs Next.js on port 3200 with its own build folder.
 *
 *   npm run test:server      (leave running)
 *   npm run test:api         (in a second terminal)
 */
import { config } from "dotenv"
import { spawn, spawnSync } from "node:child_process"

const loaded = config({ path: ".env.test", quiet: true })
if (loaded.error) {
  console.error("Missing .env.test. Copy .env.test.example to .env.test first.")
  process.exit(1)
}

const databaseName = new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname.slice(1)
if (!databaseName.endsWith("_test")) {
  console.error(`Refusing to start: DATABASE_URL points at "${databaseName}". Test databases must end in _test.`)
  process.exit(1)
}

const env = { ...process.env, NEXT_DIST_DIR: ".next-test" }
const shell = process.platform === "win32"

const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env, shell })
if (migrate.status !== 0) process.exit(migrate.status ?? 1)

const port = new URL(process.env.TEST_BASE_URL ?? "http://localhost:3200").port || "3200"
const server = spawn("npx", ["next", "dev", "--port", port], { stdio: "inherit", env, shell })
server.on("exit", (code) => process.exit(code ?? 0))
