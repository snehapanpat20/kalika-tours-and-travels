"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { ErrorState } from "@/components/ui/error-state"
import { Section } from "@/components/ui/section"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { useLocale } from "@/lib/i18n/use-locale"

export default function LocaleError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const locale = useLocale()
  const dictionary = getDictionary(locale)

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Section spacing="md">
      <Container>
        <ErrorState
          heading="h1"
          title={dictionary.errors.unexpected}
          action={
            <Button type="button" onClick={() => retry()}>
              {dictionary.errors.retry}
            </Button>
          }
        />
      </Container>
    </Section>
  )
}
