/**
 * Development seed: a few clearly-marked sample enquiries so the admin API has
 * something to show. Refuses to run in production, and never creates admins
 * (use `npm run admin:create` for that).
 *
 *   npx prisma db seed
 */
import { config } from "dotenv"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

config({ path: [".env.local", ".env"], quiet: true })

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed sample data in production.")
  process.exit(1)
}

const day = (offset: number) => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + offset)
  return date
}

const samples = [
  { fullName: "Sample Family", phone: "+919000000001", travelType: "FAMILY", destination: "Mahabaleshwar", travelDate: day(14), returnDate: day(16), passengerCount: 9, status: "NEW" },
  { fullName: "Sample Group", phone: "+919000000002", travelType: "PILGRIMAGE", destination: "Shirdi", travelDate: day(30), returnDate: day(31), passengerCount: 18, status: "CONTACTED" },
  { fullName: "Sample Company", phone: "+919000000003", travelType: "CORPORATE", destination: "Lonavala", travelDate: day(45), returnDate: day(46), passengerCount: 15, status: "CONFIRMED" },
] as const

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  try {
    // Remove earlier samples so the seed can be run again safely
    await prisma.enquiry.deleteMany({ where: { phone: { startsWith: "+91900000000" }, message: "[sample data]" } })
    for (const sample of samples) {
      await prisma.enquiry.create({
        data: { ...sample, message: "[sample data]", source: "OTHER", notificationStatus: "SKIPPED" },
      })
    }
    console.log(`Seeded ${samples.length} sample enquiries.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
