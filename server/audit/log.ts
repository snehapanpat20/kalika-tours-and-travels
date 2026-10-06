import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import { describeError, logger } from "@/server/api/logger"
import type { AdminProfile } from "@/server/auth/admin-session"
import { getPrisma } from "@/server/db/prisma"

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "approve"
  | "reject"
  | "status_change"
  | "role_change"
  | "enable"
  | "disable"
  | "password_reset"
  | "password_change"
  | "import"
  | "discard_draft"

export type AuditEntityType =
  | "Enquiry"
  | "GalleryItem"
  | "Review"
  | "Offer"
  | "Announcement"
  | "SiteContent"
  | "Destination"
  | "Service"
  | "Admin"

export type AuditEntry = {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | null
  /** Short human-readable line, e.g. the offer title. */
  summary?: string | null
  /** Small, non-sensitive details only. Never passwords, tokens, hashes or configuration values. */
  metadata?: Record<string, string | number | boolean | null>
}

/** Keys that must never be written to the log, whatever a caller passes. */
const forbiddenKeys = /pass|hash|token|secret|cookie|session|key|credential/i

/**
 * Records an admin action. A logging failure is reported but never undoes
 * or blocks the action itself, which has already succeeded.
 */
export async function recordAudit(actor: AdminProfile, entry: AuditEntry): Promise<void> {
  const metadata = entry.metadata
    ? Object.fromEntries(Object.entries(entry.metadata).filter(([key]) => !forbiddenKeys.test(key)))
    : undefined
  try {
    await getPrisma().auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name.slice(0, 80),
        actorRole: actor.role,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary ? entry.summary.slice(0, 300) : null,
        metadata: metadata && Object.keys(metadata).length ? (metadata as Prisma.InputJsonObject) : undefined,
      },
    })
  } catch (error) {
    logger.error("audit_log_failed", { action: entry.action, entityType: entry.entityType, ...describeError(error) })
  }
}
