"use client"

import { useState, type FormEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/loading-state"
import { Section } from "@/components/ui/section"
import { SectionHeading } from "@/components/ui/section-heading"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"

type FormValues = {
  name: string
  service: string
  notes: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const emptyValues: FormValues = { name: "", service: "", notes: "" }

export function DesignSystemShowcase() {
  const { push } = useToast()
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [buttonLoading, setButtonLoading] = useState(false)

  function update<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setSubmitted(false)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (values.name.trim().length < 2) nextErrors.name = "Enter at least 2 characters."
    if (!values.service) nextErrors.service = "Choose an option."
    if (values.notes.trim().length > 0 && values.notes.trim().length < 10) {
      nextErrors.notes = "Use at least 10 characters, or leave this blank."
    }
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      push({ tone: "error", title: "Check the highlighted fields." })
      return
    }

    setSubmitted(true)
    push({ tone: "success", title: "Validation passed.", description: "This preview does not save anything." })
  }

  function showLoading() {
    setButtonLoading(true)
    window.setTimeout(() => setButtonLoading(false), 1200)
  }

  return (
    <div className="grid gap-16">
      <section className="grid gap-6">
        <SectionHeading eyebrow="Actions" title="Buttons" description="Primary, secondary, and outline actions." />
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button disabled>Disabled</Button>
          <Button loading={buttonLoading} onClick={showLoading}>
            Loading
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="forest">Forest</Badge>
          <Badge tone="teal">Teal</Badge>
          <Badge tone="coral">Coral</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="danger">Attention</Badge>
        </div>
      </section>

      <section className="grid gap-6">
        <SectionHeading eyebrow="Surfaces" title="Cards" description="White cards on the light background." />
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="font-display text-xl font-semibold text-forest">Travel card</p>
            <p className="mt-2 text-sm leading-6 text-muted">Shared radius, border, and shadow.</p>
          </Card>
          <Card>
            <LoadingState label="Loading details" />
          </Card>
        </div>
      </section>

      <section className="grid gap-6">
        <SectionHeading eyebrow="Forms" title="Fields" description="Labels stay visible. Errors are announced." />
        <Card>
          <form className="grid gap-5" onSubmit={onSubmit} noValidate>
            <Field
              label="Sample name"
              hint="At least 2 characters."
              error={errors.name}
              success={submitted ? "Looks good." : undefined}
            >
              {(props) => (
                <Input
                  {...props}
                  name="name"
                  value={values.name}
                  autoComplete="name"
                  onChange={(event) => update("name", event.target.value)}
                />
              )}
            </Field>
            <Field label="Sample choice" error={errors.service} success={submitted ? "Looks good." : undefined}>
              {(props) => (
                <Select
                  {...props}
                  name="service"
                  value={values.service}
                  onChange={(event) => update("service", event.target.value)}
                >
                  <option value="">Choose</option>
                  <option value="outstation">Outstation</option>
                  <option value="family">Family</option>
                </Select>
              )}
            </Field>
            <Field
              label="Sample notes"
              hint="Optional. If you write a note, use at least 10 characters."
              error={errors.notes}
              success={submitted && values.notes.trim() ? "Looks good." : undefined}
            >
              {(props) => (
                <Textarea
                  {...props}
                  name="notes"
                  value={values.notes}
                  onChange={(event) => update("notes", event.target.value)}
                />
              )}
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Check fields</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValues(emptyValues)
                  setErrors({})
                  setSubmitted(false)
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-6">
        <SectionHeading eyebrow="Status" title="Empty and error" />
        <EmptyState title="Nothing here yet" description="Empty states explain what is missing without inventing content." />
        <ErrorState title="Something went wrong" description="Error states stay visible and can offer a next step." action={<Button variant="secondary">Try again</Button>} />
      </section>

      <section className="grid gap-6">
        <SectionHeading eyebrow="Overlays" title="Dialog and toast" />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Button variant="outline" onClick={() => push({ title: "Notice saved for this screen." })}>
            Show toast
          </Button>
        </div>
        <Dialog
          open={dialogOpen}
          title="Sample dialog"
          description="Press Escape, click Close, or click the backdrop."
          onClose={() => setDialogOpen(false)}
        >
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </Dialog>
      </section>

      <Section tone="forest" spacing="sm" className="rounded-card px-6 sm:px-8">
        <SectionHeading inverse eyebrow="Dark section" title="Deep forest" description="Light text on the forest background." />
      </Section>
    </div>
  )
}
