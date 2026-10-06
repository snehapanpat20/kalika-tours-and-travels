"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition, type ReactNode } from "react"
import { ChevronRight, Users } from "lucide-react"
import type { EnquiryStatus } from "@/generated/prisma/enums"
import { EnquiryDrawer } from "@/components/admin/enquiry-drawer"
import { formatDay, formatMoment, formatPhone, statusLabels, travelTypeLabels } from "@/components/admin/format"
import { StatusBadge } from "@/components/admin/status-badge"
import { focusRing } from "@/components/ui/styles"
import { useToast } from "@/components/ui/toast"
import { deleteEnquiry, setEnquiryStatus, type AdminEnquiry } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"
import { cn } from "@/lib/utils/cn"

/**
 * Enquiry list with a detail drawer. Status changes show immediately and are
 * rolled back if the server refuses; the page then re-fetches its server data
 * (counts, filters) without a full browser reload.
 */
export function EnquiryTable({ enquiries, empty, caption }: { enquiries: AdminEnquiry[]; empty: ReactNode; caption: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [, startRefresh] = useTransition()

  // Local edits on top of the server data; cleared whenever fresh data arrives
  const [source, setSource] = useState(enquiries)
  const [edits, setEdits] = useState<Record<string, AdminEnquiry>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  if (source !== enquiries) {
    setSource(enquiries)
    setEdits({})
    setRemoved(new Set())
  }

  const rows = enquiries.filter((row) => !removed.has(row.id)).map((row) => edits[row.id] ?? row)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = rows.find((row) => row.id === selectedId) ?? null
  const [savingStatus, setSavingStatus] = useState<EnquiryStatus | null>(null)
  const [deleting, setDeleting] = useState(false)

  function handleAuthError(error: unknown): boolean {
    if (error instanceof ApiError && error.status === 401) {
      toast.push({ tone: "error", title: "Your session has expired", description: "Please sign in again." })
      const here = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`
      router.replace(`/admin/login?next=${encodeURIComponent(here)}`)
      return true
    }
    return false
  }

  async function changeStatus(enquiry: AdminEnquiry, status: EnquiryStatus) {
    if (status === enquiry.status || savingStatus) return
    setSavingStatus(status)
    setEdits((current) => ({ ...current, [enquiry.id]: { ...enquiry, status } }))
    try {
      const updated = await setEnquiryStatus(enquiry.id, status)
      setEdits((current) => ({ ...current, [enquiry.id]: updated }))
      toast.push({ tone: "success", title: `Marked as ${statusLabels[status]}`, description: enquiry.fullName })
      startRefresh(() => router.refresh())
    } catch (error) {
      setEdits((current) => ({ ...current, [enquiry.id]: enquiry }))
      if (!handleAuthError(error)) {
        toast.push({
          tone: "error",
          title: "Status not updated",
          description: error instanceof ApiError && error.status === 404 ? "This enquiry no longer exists." : "Please check your connection and try again.",
        })
      }
    } finally {
      setSavingStatus(null)
    }
  }

  async function remove(enquiry: AdminEnquiry) {
    setDeleting(true)
    try {
      await deleteEnquiry(enquiry.id)
      setRemoved((current) => new Set(current).add(enquiry.id))
      setSelectedId(null)
      toast.push({ tone: "success", title: "Enquiry deleted", description: enquiry.fullName })
      startRefresh(() => router.refresh())
    } catch (error) {
      if (!handleAuthError(error)) {
        toast.push({ tone: "error", title: "Enquiry not deleted", description: "Please check your connection and try again." })
      }
    } finally {
      setDeleting(false)
    }
  }

  if (rows.length === 0) return <>{empty}</>

  return (
    <>
      {/* Desktop and tablet: table */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-ivory shadow-soft md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="border-b border-line bg-stone/60 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3">Destination</th>
                <th scope="col" className="px-4 py-3">Travel type</th>
                <th scope="col" className="px-4 py-3">Travel date</th>
                <th scope="col" className="px-4 py-3 text-right">Passengers</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Received</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={cn("cursor-pointer transition-colors hover:bg-white", selectedId === row.id && "bg-white")}
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-forest">{row.fullName}</p>
                    <p className="text-xs text-muted tabular-nums">{formatPhone(row.phone)}</p>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 font-medium" title={row.destination}>{row.destination}</td>
                  <td className="px-4 py-3 text-muted">{travelTypeLabels[row.travelType]}</td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatDay(row.travelDate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.passengerCount}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-muted">{formatMoment(row.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedId(row.id)
                      }}
                      className={cn("inline-flex min-h-9 items-center gap-1 rounded-pill px-3 text-xs font-bold text-forest ring-1 ring-forest/15 hover:bg-forest hover:text-white", focusRing)}
                    >
                      View<span className="sr-only"> enquiry from {row.fullName}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phones: one card per enquiry */}
      <ul className="grid gap-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => setSelectedId(row.id)}
              className={cn("flex w-full items-start gap-3 rounded-card border border-line bg-ivory p-4 text-left shadow-soft active:bg-white", focusRing)}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="truncate font-bold text-forest">{row.fullName}</span>
                  <StatusBadge status={row.status} />
                </span>
                <span className="mt-1 block truncate text-sm font-medium">{row.destination}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{formatDay(row.travelDate)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Users aria-hidden="true" className="size-3.5" />
                    {row.passengerCount}
                  </span>
                  <span>{travelTypeLabels[row.travelType]}</span>
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted" />
            </button>
          </li>
        ))}
      </ul>

      <EnquiryDrawer
        enquiry={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={changeStatus}
        savingStatus={savingStatus}
        onDelete={remove}
        deleting={deleting}
      />
    </>
  )
}
