import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { ACCENT_COLOR_VALUES, DEFAULT_ACCENT_COLOR, type AccentColor } from "@/lib/accents";
import { calculateTotals } from "@/lib/calculate";
import type { EmailActivity, Invoice, InvoiceSummary } from "@/lib/invoice";
import { suggestInvoiceNumber } from "@/lib/invoice-number";
import type { InvoiceInput, Party } from "@/lib/invoice-schema";
import { maskEmail } from "@/lib/mask-email";
import { centsToDecimal } from "@/lib/money";
import { DEFAULT_PHONE_COUNTRY, isPhoneCountry } from "@/lib/phone";
import type { InvoiceEmailRow, InvoiceInsert, InvoiceRow } from "../database.types";
import { AppError, notConfigured, notFound } from "../errors";
import { getSupabase } from "../supabase";

/**
 * All database access for invoices lives here. Route handlers and Server Components call these
 * functions; nothing else talks to Supabase.
 */

const SUMMARY_COLUMNS =
  "id, invoice_number, status, issue_date, due_date, customer, total_cents, updated_at";

export async function listInvoices(): Promise<InvoiceSummary[]> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select(SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw toAppError(error);

  return data.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer.name,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    totalCents: row.total_cents,
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data ? toInvoice(data) : null;
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .insert(toRow(input))
    .select("*")
    .single();
  if (error) throw await toWriteError(error, input);
  return toInvoice(data);
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<Invoice> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .update(toRow(input))
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw await toWriteError(error, input);
  if (!data) throw notFound();
  return toInvoice(data);
}

export async function deleteInvoice(id: string): Promise<void> {
  const { data, error } = await getSupabase().from("invoices").delete().eq("id", id).select("id");
  if (error) throw toAppError(error);
  if (data.length === 0) throw notFound();
}

export async function markInvoiceSent(id: string): Promise<string> {
  const sentAt = new Date().toISOString();
  const { error } = await getSupabase()
    .from("invoices")
    .update({ status: "sent", sent_at: sentAt })
    .eq("id", id);
  if (error) throw toAppError(error);
  return sentAt;
}

/** The invoice number after the most recent one, skipping numbers already in use. */
export async function suggestNextInvoiceNumber(): Promise<string> {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw toAppError(error);
  return suggestInvoiceNumber(
    data[0]?.invoice_number,
    data.map((row) => row.invoice_number),
  );
}

/* -------------------------------------------------------------------------------------------- */
/* Email log                                                                                    */
/* -------------------------------------------------------------------------------------------- */

export async function recordEmail(entry: {
  invoiceId: string;
  recipient: string;
  subject: string;
  status: "sent" | "failed";
  providerId?: string;
  error?: string;
}): Promise<EmailActivity> {
  const { data, error } = await getSupabase()
    .from("invoice_emails")
    .insert({
      invoice_id: entry.invoiceId,
      recipient: entry.recipient,
      subject: entry.subject,
      status: entry.status,
      provider_id: entry.providerId ?? null,
      error: entry.error ?? null,
    })
    .select("*")
    .single();
  if (error) throw toAppError(error);
  return toActivity(data);
}

export async function listEmailActivity(invoiceId: string): Promise<EmailActivity[]> {
  const { data, error } = await getSupabase()
    .from("invoice_emails")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw toAppError(error);
  return data.map(toActivity);
}

/** When this invoice was last emailed successfully, or null. */
export async function lastEmailSentAt(invoiceId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("invoice_emails")
    .select("created_at")
    .eq("invoice_id", invoiceId)
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toAppError(error);
  return data?.created_at ?? null;
}

/** Email attempts (sent or failed) across all invoices since the given time. */
export async function countEmailsSince(since: Date): Promise<number> {
  const { count, error } = await getSupabase()
    .from("invoice_emails")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since.toISOString());
  if (error) throw toAppError(error);
  return count ?? 0;
}

/* -------------------------------------------------------------------------------------------- */
/* Mapping                                                                                      */
/* -------------------------------------------------------------------------------------------- */

/** Totals are always recomputed here; client-supplied totals are never trusted. */
function toRow(input: InvoiceInput): InvoiceInsert {
  const totals = calculateTotals(input);
  return {
    invoice_number: input.invoiceNumber,
    issue_date: input.issueDate,
    due_date: input.dueDate,
    business: input.business,
    customer: input.customer,
    line_items: input.lineItems,
    custom_fields: input.customFields,
    notes: input.notes,
    accent_color: input.accentColor,
    discount_cents: totals.discountCents,
    tax_rate: Number(input.taxRate || "0"),
    subtotal_cents: totals.subtotalCents,
    tax_cents: totals.taxCents,
    total_cents: totals.totalCents,
  };
}

function toInvoice(row: InvoiceRow): Invoice {
  const taxRate = Number(row.tax_rate);
  const input: InvoiceInput = {
    invoiceNumber: row.invoice_number,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    business: toParty(row.business),
    customer: toParty(row.customer),
    lineItems: row.line_items,
    customFields: row.custom_fields,
    notes: row.notes,
    discount: row.discount_cents > 0 ? centsToDecimal(row.discount_cents) : "",
    taxRate: taxRate > 0 ? String(taxRate) : "",
    accentColor: isAccentColor(row.accent_color) ? row.accent_color : DEFAULT_ACCENT_COLOR,
  };
  return {
    ...input,
    id: row.id,
    status: row.status,
    totals: calculateTotals(input),
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Rows saved before phone country codes existed hold a formatted US number and no country. */
function toParty(party: Party): Party {
  return {
    ...party,
    phoneCountry: isPhoneCountry(party.phoneCountry) ? party.phoneCountry : DEFAULT_PHONE_COUNTRY,
    phone: (party.phone ?? "").replace(/\D/g, ""),
  };
}

function toActivity(row: InvoiceEmailRow): EmailActivity {
  return {
    id: row.id,
    recipient: maskEmail(row.recipient),
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
  };
}

function isAccentColor(value: string): value is AccentColor {
  return (ACCENT_COLOR_VALUES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------------------------- */
/* Errors                                                                                       */
/* -------------------------------------------------------------------------------------------- */

const MIGRATION_HINT =
  "The database isn't set up yet. Run supabase/migrations/20261019000000_init.sql in the Supabase SQL editor.";

/** Maps PostgREST/Postgres errors to errors that are safe to show. */
function toAppError(error: PostgrestError): AppError {
  switch (error.code) {
    case "22P02": // invalid input syntax (e.g. a malformed id)
    case "PGRST116": // no rows for .single()
      return notFound();
    case "23514": // check constraint
      return new AppError(422, "VALIDATION_FAILED", "Some values are outside the allowed range.", {
        cause: error,
      });
    case "42501": // permission denied: grants missing
    case "42P01": // undefined table
    case "PGRST205": // table not in the schema cache
      return notConfigured(MIGRATION_HINT);
  }
  if (/invalid api key|jwt|unauthorized/i.test(error.message)) {
    return notConfigured(
      "Supabase rejected the secret key. Check SUPABASE_SECRET_KEY in .env.local.",
    );
  }
  if (/fetch failed|network|ECONNREFUSED|ENOTFOUND|timed out/i.test(error.message)) {
    return new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "We can't reach the database right now. Please try again in a moment.",
      { cause: error },
    );
  }
  return new AppError(500, "INTERNAL", "Something went wrong while talking to the database.", {
    cause: error,
  });
}

async function toWriteError(error: PostgrestError, input: InvoiceInput): Promise<AppError> {
  if (error.code !== "23505") return toAppError(error);

  const suggestion = await suggestNextInvoiceNumber().catch(() => undefined);
  const message = `${input.invoiceNumber} is already used${suggestion ? ` — try ${suggestion}` : ""}.`;
  return new AppError(409, "CONFLICT", message, { fieldErrors: { invoiceNumber: message } });
}
