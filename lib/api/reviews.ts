import { apiRequest } from "@/lib/api/client"

/** Sends a customer review (with an optional photo) to POST /api/reviews. */
export async function submitReview(form: FormData) {
  return apiRequest<{ status: "PENDING" }>("/api/reviews", { method: "POST", body: form })
}
