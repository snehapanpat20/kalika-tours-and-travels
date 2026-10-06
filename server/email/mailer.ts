import "server-only"
import nodemailer, { type Transporter } from "nodemailer"
import { business } from "@/data/business"
import { getServerEnv } from "@/lib/config/env"
import { logger } from "@/server/api/logger"

export type MailMessage = {
  to: string
  subject: string
  text: string
  html: string
  replyTo?: string
}

export type SendResult = "sent" | "skipped"

let transporter: Transporter | undefined

function getTransporter(): Transporter | null {
  const env = getServerEnv()
  if (env.EMAIL_TRANSPORT !== "smtp") return null
  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASSWORD) return null

  transporter ??= nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    // Port 465 uses TLS from the start; 587 upgrades with STARTTLS
    secure: env.EMAIL_PORT === 465,
    requireTLS: env.EMAIL_PORT !== 465,
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  return transporter
}

/**
 * Sends one email. Returns "skipped" when email is not configured, so callers
 * can record that without treating it as a failure. Throws on delivery errors.
 */
export async function sendMail(message: MailMessage): Promise<SendResult> {
  const env = getServerEnv()

  if (env.EMAIL_TRANSPORT === "none") return "skipped"

  if (env.EMAIL_TRANSPORT === "log") {
    // For local development: print the email instead of sending it.
    if (env.NODE_ENV === "production") {
      logger.info("email_logged", { to: message.to, subject: message.subject })
    } else {
      console.log(`\n──── EMAIL (EMAIL_TRANSPORT=log) ────\nTo: ${message.to}\nReply-To: ${message.replyTo ?? "-"}\nSubject: ${message.subject}\n\n${message.text}\n────────────────────────────────────\n`)
    }
    return "sent"
  }

  const transport = getTransporter()
  if (!transport) {
    logger.warn("email_not_configured", { hint: "Set EMAIL_HOST, EMAIL_USER and EMAIL_PASSWORD" })
    return "skipped"
  }

  await transport.sendMail({
    from: env.EMAIL_FROM ?? `"${business.name} Website" <${env.EMAIL_USER}>`,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
  return "sent"
}

export type EmailStatus = {
  mode: "smtp" | "log" | "none"
  /** SMTP only: host, user and password are all set. Says nothing about whether they are correct. */
  configured: boolean
  host: string | null
  notifyTo: string
}

/** What the admin settings page shows about email. Never includes the password. */
export function getEmailStatus(): EmailStatus {
  const env = getServerEnv()
  return {
    mode: env.EMAIL_TRANSPORT,
    configured: env.EMAIL_TRANSPORT === "smtp" ? Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASSWORD) : env.EMAIL_TRANSPORT === "log",
    host: env.EMAIL_TRANSPORT === "smtp" ? (env.EMAIL_HOST ?? null) : null,
    notifyTo: env.NOTIFY_EMAIL ?? business.email,
  }
}
