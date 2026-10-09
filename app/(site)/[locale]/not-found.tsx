import Link from "next/link"
import { locale as getLocaleParam } from "next/root-params"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { ErrorState } from "@/components/ui/error-state"
import { Section } from "@/components/ui/section"
import { focusRing } from "@/components/ui/styles"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { defaultLocale, isLocale } from "@/lib/i18n/locales"
import { pagePath, type PageKey } from "@/lib/routes"
import { cn } from "@/lib/utils/cn"

/** Pages most visitors are looking for when an address is wrong or out of date. */
const helpful: Exclude<PageKey, "home">[] = ["services", "destinations", "traveller", "plan"]

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
        <nav aria-labelledby="not-found-links" className="mt-8">
          <h2 id="not-found-links" className="text-lg font-extrabold tracking-tight text-forest">
            {dictionary.seo.notFoundLinks}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {helpful.map((page) => (
              <li key={page}>
                <Link
                  href={pagePath(locale, page)}
                  className={cn(
                    "group flex min-h-14 items-center justify-between gap-3 rounded-card bg-white px-5 font-bold text-forest shadow-soft ring-1 ring-forest/6 transition hover:ring-teal/40",
                    focusRing,
                  )}
                >
                  {dictionary.nav[page]}
                  <ArrowUpRight aria-hidden="true" className="size-4 text-teal-deep transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </Section>
  )
}
