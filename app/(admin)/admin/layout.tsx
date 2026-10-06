import type { Metadata } from "next"
import { Document } from "@/components/layout/document"
import { business } from "@/data/business"
import { getSiteUrl } from "@/lib/config/site"
import "../../globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `Admin · ${business.name}`,
    template: `%s · ${business.name}`,
  },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Document locale="en">{children}</Document>
}
