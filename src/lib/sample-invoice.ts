import { DEFAULT_ACCENT_COLOR } from "./accents";
import { addDays } from "./dates";
import type { InvoiceInput } from "./invoice-schema";

/**
 * Fictional sample data (".example" domains are reserved, 555-01xx numbers are fictional).
 * It reproduces the brief's check: 2 × $50.00 − $10.00 discount + 10% tax = $99.00.
 * The hidden "Internal ref" field demonstrates that hidden fields stay off the invoice.
 */
export function createSampleInvoice(invoiceNumber: string, today: string): InvoiceInput {
  return {
    invoiceNumber,
    issueDate: today,
    dueDate: addDays(today, 30),
    business: {
      name: "Fernleaf Studio",
      email: "hello@fernleaf.example",
      phoneCountry: "US",
      phone: "5035550142",
      address: "214 Juniper Lane\nPortland, OR 97205",
    },
    customer: {
      name: "Lumen & Co.",
      email: "accounts@lumen.example",
      phoneCountry: "US",
      phone: "",
      address: "88 Harbor Street, Suite 4\nSeattle, WA 98101",
    },
    lineItems: [
      { description: "Brand strategy workshop (half day)", quantity: "2", unitPrice: "50.00" },
    ],
    customFields: [
      { label: "PO number", value: "PO-7781", visible: true },
      { label: "Project", value: "Spring rebrand", visible: true },
      { label: "Internal ref", value: "Q4-LEAD-12", visible: false },
    ],
    notes: "Thank you for your business! Please pay within 30 days by bank transfer.",
    discount: "10.00",
    taxRate: "10",
    accentColor: DEFAULT_ACCENT_COLOR,
  };
}
