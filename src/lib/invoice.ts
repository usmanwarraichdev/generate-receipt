import { DEFAULT_ACCENT_COLOR } from "./accents";
import type { InvoiceTotals } from "./calculate";
import { addDays } from "./dates";
import type { InvoiceInput, Party } from "./invoice-schema";
import { DEFAULT_PHONE_COUNTRY } from "./phone";

export type InvoiceStatus = "draft" | "sent";

/** A saved invoice as returned by the API. Totals are always computed on the server. */
export interface Invoice extends InvoiceInput {
  id: string;
  status: InvoiceStatus;
  totals: InvoiceTotals;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  status: InvoiceStatus;
  updatedAt: string;
}

/** One email delivery attempt. Recipients are masked before they leave the server. */
export interface EmailActivity {
  id: string;
  recipient: string;
  status: "sent" | "failed";
  error: string | null;
  createdAt: string;
}

export interface SendInvoiceResult {
  emailId: string;
  sentAt: string;
  activity: EmailActivity;
}

export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

export function emptyParty(): Party {
  return { name: "", email: "", phoneCountry: DEFAULT_PHONE_COUNTRY, phone: "", address: "" };
}

export function createBlankInvoice(invoiceNumber: string, today: string): InvoiceInput {
  return {
    invoiceNumber,
    issueDate: today,
    dueDate: addDays(today, DEFAULT_PAYMENT_TERMS_DAYS),
    business: emptyParty(),
    customer: emptyParty(),
    lineItems: [{ description: "", quantity: "1", unitPrice: "" }],
    customFields: [],
    notes: "",
    discount: "",
    taxRate: "",
    accentColor: DEFAULT_ACCENT_COLOR,
  };
}

/** Strips server-owned fields so a saved invoice can be loaded back into the editor. */
export function toInvoiceInput(invoice: Invoice): InvoiceInput {
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    business: invoice.business,
    customer: invoice.customer,
    lineItems: invoice.lineItems,
    customFields: invoice.customFields,
    notes: invoice.notes,
    discount: invoice.discount,
    taxRate: invoice.taxRate,
    accentColor: invoice.accentColor,
  };
}
