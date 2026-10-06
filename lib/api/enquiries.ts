import { apiRequest } from "@/lib/api/client"
import type { EnquiryInput } from "@/lib/validation/enquiry"

export type SubmitEnquiryResult = { enquiryId: string; message?: string }

/** Sends a trip enquiry to POST /api/enquiries. Throws ApiError on failure. */
export async function submitEnquiry(input: EnquiryInput): Promise<SubmitEnquiryResult> {
  const response = await apiRequest<{ enquiryId: string }>("/api/enquiries", { method: "POST", body: input })
  return { enquiryId: response.enquiryId, message: response.message }
}
