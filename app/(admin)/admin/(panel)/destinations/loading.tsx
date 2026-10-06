import { AdminLoadingSkeleton } from "@/components/admin/kit/loading-skeleton"

/** Skeleton while this page loads. (Not used on Super Admin-only pages, so those can answer 403 straight away.) */
export default function Loading() {
  return <AdminLoadingSkeleton />
}
