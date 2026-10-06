"use client"

import { useEffect } from "react"
import { Document } from "@/components/layout/document"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ui/error-state"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import "./globals.css"

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const dictionary = getDictionary("en")

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Document locale="en">
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5">
        <ErrorState
          heading="h1"
          title={dictionary.errors.unexpected}
          action={
            <Button type="button" onClick={() => retry()}>
              {dictionary.errors.retry}
            </Button>
          }
        />
      </main>
    </Document>
  )
}
