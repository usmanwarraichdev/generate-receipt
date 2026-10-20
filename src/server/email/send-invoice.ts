import "server-only";
import { Resend } from "resend";
import type { SendInvoiceResult } from "@/lib/invoice";
import type { SendInvoiceInput } from "@/lib/invoice-schema";
import { getEmailEnv } from "../env";
import { AppError, notFound, tooManyRequests } from "../errors";
import {
  countEmailsSince,
  getInvoice,
  lastEmailSentAt,
  markInvoiceSent,
  recordEmail,
} from "../invoices/repository";
import { renderInvoiceEmail } from "./invoice-email";
import { SEND_COOLDOWN_SECONDS, formatSender, isRecipientAllowed } from "./policy";
import { mapResendError } from "./resend-errors";

interface SendInvoiceOptions {
  invoiceId: string;
  input: SendInvoiceInput;
  /** Same key for retries of the same attempt, so the provider never delivers twice. */
  idempotencyKey: string;
  /** Request origin, used for the "View invoice" link when APP_URL is not set. */
  origin: string;
}

/**
 * Emails the *saved* invoice: the database copy is the source of truth, not the browser's form.
 * The send endpoint is public, so it is guarded by an optional recipient allowlist, a per-invoice
 * cooldown and a global hourly cap.
 */
export async function sendInvoice({
  invoiceId,
  input,
  idempotencyKey,
  origin,
}: SendInvoiceOptions): Promise<SendInvoiceResult> {
  const env = getEmailEnv();
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw notFound();

  if (!isRecipientAllowed(input.to, env.EMAIL_ALLOWED_RECIPIENTS)) {
    const message = "This deployment only sends to approved test addresses.";
    throw new AppError(422, "EMAIL_REJECTED", message, {
      fieldErrors: {
        to: "This address isn't on the server's allowlist (EMAIL_ALLOWED_RECIPIENTS).",
      },
    });
  }
  await enforceSendLimits(invoiceId, env.EMAIL_HOURLY_LIMIT);

  const viewUrl = new URL(`/invoices/${invoice.id}/view`, env.APP_URL ?? origin).toString();
  const { html, text } = await renderInvoiceEmail({ invoice, message: input.message, viewUrl });

  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(
    {
      from: formatSender(env.EMAIL_FROM, invoice.business.name),
      to: [input.to],
      replyTo: invoice.business.email || undefined,
      subject: input.subject,
      html,
      text,
      tags: [{ name: "invoice_id", value: invoice.id }],
    },
    { idempotencyKey: `send-invoice/${invoice.id}/${idempotencyKey}` },
  );

  if (error || !data) {
    const failure = error
      ? mapResendError(error)
      : new AppError(
          502,
          "EMAIL_UNAVAILABLE",
          "The email service didn't respond. Please try again.",
        );
    console.error(`[email] Send failed for invoice ${invoice.id}:`, error ?? "no response");
    // Record the attempt with our safe message, never the provider's raw text.
    await recordEmail({
      invoiceId,
      recipient: input.to,
      subject: input.subject,
      status: "failed",
      error: failure.message,
    }).catch((logError) => console.error("[email] Could not record failed send", logError));
    throw failure;
  }

  const sentAt = await markInvoiceSent(invoice.id);
  const activity = await recordEmail({
    invoiceId,
    recipient: input.to,
    subject: input.subject,
    status: "sent",
    providerId: data.id,
  });
  return { emailId: data.id, sentAt, activity };
}

async function enforceSendLimits(invoiceId: string, hourlyLimit: number): Promise<void> {
  const [lastSentAt, sentInLastHour] = await Promise.all([
    lastEmailSentAt(invoiceId),
    countEmailsSince(new Date(Date.now() - 60 * 60 * 1000)),
  ]);

  if (lastSentAt) {
    const elapsedSeconds = (Date.now() - Date.parse(lastSentAt)) / 1000;
    if (elapsedSeconds < SEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(SEND_COOLDOWN_SECONDS - elapsedSeconds);
      throw tooManyRequests(
        `This invoice was just emailed. You can send it again in ${wait} seconds.`,
        wait,
      );
    }
  }
  if (sentInLastHour >= hourlyLimit) {
    throw tooManyRequests(
      "The hourly email limit for this app has been reached. Please try again later.",
      600,
    );
  }
}
