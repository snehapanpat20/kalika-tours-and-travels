import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AccountPanel } from "@/components/customer/account-panel"
import { getSession } from "@/lib/auth/session"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { isLocale } from "@/lib/i18n/locales"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const dictionary = getDictionary(locale)

  return {
    title: dictionary.areas.customerTitle,
    robots: { index: false, follow: false },
  }
}

export default async function CustomerAccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const dictionary = getDictionary(locale)
  const session = await getSession()

  return (
    <AccountPanel
      title={dictionary.areas.customerTitle}
      body={dictionary.areas.customerBody}
      status={session ? dictionary.areas.signedIn : dictionary.areas.signedOut}
    />
  )
}
