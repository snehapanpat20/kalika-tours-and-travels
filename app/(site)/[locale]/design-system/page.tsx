import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DesignSystemShowcase } from "@/components/design-system/showcase"
import { Container } from "@/components/ui/container"
import { Section } from "@/components/ui/section"
import { SectionHeading } from "@/components/ui/section-heading"
import { isLocale } from "@/lib/i18n/locales"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Design system",
    robots: { index: false, follow: false },
  }
}

export default async function DesignSystemPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <Section spacing="md">
      <Container className="grid gap-10">
        <SectionHeading
          as="h1"
          eyebrow="Kalika Tours and Travels"
          title="Design system"
          description="Reusable type, color, and controls for later pages."
        />
        <DesignSystemShowcase />
      </Container>
    </Section>
  )
}
