import { Card } from "@/components/ui/card"
import { Container } from "@/components/ui/container"
import { Section } from "@/components/ui/section"
import { SectionHeading } from "@/components/ui/section-heading"

export function AccountPanel({ title, body, status }: { title: string; body: string; status: string }) {
  return (
    <Section spacing="md">
      <Container>
        <Card className="max-w-xl">
          <SectionHeading as="h1" title={title} description={body} />
          <p className="mt-6 text-sm font-medium text-ink">{status}</p>
        </Card>
      </Container>
    </Section>
  )
}
