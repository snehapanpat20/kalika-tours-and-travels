import { locale as getLocaleParam } from "next/root-params"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { ErrorState } from "@/components/ui/error-state"
import { Section } from "@/components/ui/section"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, isLocale } from "@/lib/i18n/locales"

export default async function LocaleNotFound() {
  const value = await getLocaleParam()
  const locale = value && isLocale(value) ? value : defaultLocale
  const dictionary = getDictionary(locale)

  return (
    <Section spacing="md">
      <Container>
        <ErrorState
          heading="h1"
          title={dictionary.errors.notFoundTitle}
          description={dictionary.errors.notFoundBody}
          action={
            <Button href={`/${locale}`} variant="secondary">
              {dictionary.errors.backHome}
            </Button>
          }
        />
      </Container>
    </Section>
  )
}
