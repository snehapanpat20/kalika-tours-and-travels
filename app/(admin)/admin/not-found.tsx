import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { ErrorState } from "@/components/ui/error-state"
import { Section } from "@/components/ui/section"
import { getDictionary } from "@/lib/i18n/get-dictionary"

export default function AdminNotFound() {
  const dictionary = getDictionary("en")

  return (
    <Section spacing="md">
      <Container>
        <ErrorState
          heading="h1"
          title={dictionary.errors.notFoundTitle}
          description={dictionary.errors.notFoundBody}
          action={
            <Button href="/admin" variant="secondary">
              {dictionary.areas.adminTitle}
            </Button>
          }
        />
      </Container>
    </Section>
  )
}
