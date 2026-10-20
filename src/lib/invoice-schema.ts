import { z } from "zod";
import { ACCENT_COLOR_VALUES } from "./accents";
import { calculateTotals } from "./calculate";
import { SCALE, countDecimals, formatCents, fromScaled, isDecimalString, toScaled } from "./money";
import { PHONE_COUNTRY_CODES, describePhoneProblem, normalizePhone } from "./phone";

/**
 * One schema validates the invoice in the browser (React Hook Form) and again on the server
 * (API routes), so both sides always agree on the rules and the error messages.
 */

export const LIMITS = {
  invoiceNumber: 25,
  name: 60,
  email: 60,
  phone: 40,
  address: 200,
  description: 40,
  lineItems: 100,
  customFields: 20,
  customFieldLabel: 25,
  customFieldValue: 199,
  notes: 2000,
  emailSubject: 200,
  emailMessage: 1000,
} as const;

export const INVOICE_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/.#]*$/;

/* -------------------------------------------------------------------------------------------- */
/* Decimal inputs                                                                               */
/* -------------------------------------------------------------------------------------------- */

export interface DecimalRule {
  label: string;
  /** Maximum decimal places allowed. */
  scale: number;
  /** Inclusive maximum as a decimal string, and how it is shown to people. */
  max: string;
  maxLabel: string;
  example: string;
  /** Blank means zero (discount, tax rate). */
  optional?: boolean;
  /** Zero is not allowed (quantities). */
  positive?: boolean;
}

export const QUANTITY_RULE: DecimalRule = {
  label: "Quantity",
  scale: SCALE.quantity,
  max: "99999.999",
  maxLabel: "99,999.999",
  example: "1.5",
  positive: true,
};

export const UNIT_PRICE_RULE: DecimalRule = {
  label: "Unit price",
  scale: SCALE.money,
  max: "999999.99",
  maxLabel: "$999,999.99",
  example: "120.00",
};

export const DISCOUNT_RULE: DecimalRule = {
  label: "Discount",
  scale: SCALE.money,
  max: "99999999.99",
  maxLabel: "$99,999,999.99",
  example: "25.00",
  optional: true,
};

export const TAX_RATE_RULE: DecimalRule = {
  label: "Tax rate",
  scale: SCALE.percent,
  max: "100",
  maxLabel: "100%",
  example: "8.875",
  optional: true,
};

/** Returns a friendly description of what is wrong with a decimal input, or undefined if valid. */
export function describeDecimalProblem(raw: string, rule: DecimalRule): string | undefined {
  const value = raw.trim();
  if (value === "") return rule.optional ? undefined : `${rule.label} is required`;
  if (value.startsWith("-")) return `${rule.label} can't be negative`;
  if (!isDecimalString(value)) return `Enter a number like ${rule.example}`;
  if (countDecimals(value) > rule.scale) return `Use at most ${rule.scale} decimal places`;

  const scaled = toScaled(value, rule.scale);
  if (rule.positive && scaled === 0n) return `${rule.label} must be greater than 0`;
  if (scaled > toScaled(rule.max, rule.scale))
    return `${rule.label} can't be more than ${rule.maxLabel}`;
  return undefined;
}

/** A validated decimal string, normalized for storage ("050.5" → "50.50" for money). */
function decimal(rule: DecimalRule, minDecimals: number) {
  return z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? `${rule.label} is missing`
          : `${rule.label} must be a decimal string like "${rule.example}"`,
    })
    .trim()
    .superRefine((value, ctx) => {
      const problem = describeDecimalProblem(value, rule);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    })
    .transform((value) =>
      value === "" ? "" : fromScaled(toScaled(value, rule.scale), rule.scale, minDecimals),
    );
}

/* -------------------------------------------------------------------------------------------- */
/* Text inputs                                                                                  */
/* -------------------------------------------------------------------------------------------- */

function text(label: string, max: number) {
  return z
    .string({
      error: (issue) =>
        issue.input === undefined ? `${label} is missing` : `${label} must be text`,
    })
    .trim()
    .max(max, `${label} can be at most ${max} characters`);
}

function requiredText(label: string, max: number) {
  return text(label, max).min(1, `${label} is required`);
}

/** Length first (so the message says what to fix), then format. */
function emailText(label: string, { required }: { required: boolean }) {
  const base = required ? requiredText(label, LIMITS.email) : text(label, LIMITS.email);
  return base.refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Enter a valid email like name@company.com",
  );
}

function optionalEmail(label: string) {
  return emailText(label, { required: false });
}

function isoDate(label: string) {
  return z.iso.date({
    error: (issue) =>
      issue.input === undefined
        ? `${label} is missing`
        : issue.input === ""
          ? `${label} is required`
          : "Enter a valid date (YYYY-MM-DD)",
  });
}

/* -------------------------------------------------------------------------------------------- */
/* Invoice                                                                                      */
/* -------------------------------------------------------------------------------------------- */

function partySchema(role: "Business" | "Customer") {
  return z
    .object({
      name: requiredText(`${role} name`, LIMITS.name),
      email: optionalEmail("Email"),
      phoneCountry: z.enum(PHONE_COUNTRY_CODES, { error: "Pick a country code from the list" }),
      phone: text("Phone", LIMITS.phone),
      address: text("Address", LIMITS.address),
    })
    .superRefine(
      (party, ctx) => {
        const problem = describePhoneProblem(party.phone, party.phoneCountry);
        if (problem) ctx.addIssue({ code: "custom", path: ["phone"], message: problem });
      },
      { when: whenValid("phone", "phoneCountry") },
    )
    .transform((party) => ({ ...party, phone: normalizePhone(party.phone, party.phoneCountry) }));
}

export const lineItemSchema = z.object({
  description: requiredText("Description", LIMITS.description),
  quantity: decimal(QUANTITY_RULE, 0),
  unitPrice: decimal(UNIT_PRICE_RULE, SCALE.money),
});

export const customFieldSchema = z.object({
  label: requiredText("Label", LIMITS.customFieldLabel),
  value: requiredText("Value", LIMITS.customFieldValue),
  visible: z.boolean({ error: "Visibility must be true or false" }),
});

/**
 * Cross-field rules only run once the fields they depend on are valid, so they still report while
 * unrelated fields are wrong. A root-level problem (e.g. the body isn't an object) blocks them.
 */
function whenValid(...fields: string[]) {
  return (payload: z.core.ParsePayload) =>
    typeof payload.value === "object" &&
    payload.value !== null &&
    !payload.issues.some((issue) => {
      const field = issue.path?.[0];
      return field === undefined || fields.includes(String(field));
    });
}

export const invoiceInputSchema = z
  .object({
    invoiceNumber: requiredText("Invoice number", LIMITS.invoiceNumber).regex(
      INVOICE_NUMBER_PATTERN,
      "Use letters, numbers and - _ / . # only",
    ),
    issueDate: isoDate("Issue date"),
    dueDate: isoDate("Due date"),
    business: partySchema("Business"),
    customer: partySchema("Customer"),
    lineItems: z
      .array(lineItemSchema, { error: "Line items must be a list" })
      .min(1, "Add at least one line item")
      .max(LIMITS.lineItems, `An invoice can have at most ${LIMITS.lineItems} line items`),
    customFields: z
      .array(customFieldSchema, { error: "Custom fields must be a list" })
      .max(LIMITS.customFields, `Add at most ${LIMITS.customFields} custom fields`),
    notes: text("Notes", LIMITS.notes),
    discount: decimal(DISCOUNT_RULE, SCALE.money),
    taxRate: decimal(TAX_RATE_RULE, 0),
    accentColor: z.enum(ACCENT_COLOR_VALUES, { error: "Pick one of the available accent colors" }),
  })
  .superRefine(
    (invoice, ctx) => {
      const { discountExceedsSubtotal, subtotalCents } = calculateTotals(invoice);
      if (discountExceedsSubtotal) {
        ctx.addIssue({
          code: "custom",
          path: ["discount"],
          message: `Discount can't exceed the subtotal (${formatCents(subtotalCents)})`,
        });
      }
    },
    { when: whenValid("lineItems", "discount") },
  )
  .superRefine(
    (invoice, ctx) => {
      // ISO dates compare correctly as strings.
      if (invoice.dueDate < invoice.issueDate) {
        ctx.addIssue({
          code: "custom",
          path: ["dueDate"],
          message: "Due date can't be before the issue date",
        });
      }
    },
    { when: whenValid("issueDate", "dueDate") },
  );

export type InvoiceInput = z.output<typeof invoiceInputSchema>;
export type Party = InvoiceInput["business"];
export type LineItem = InvoiceInput["lineItems"][number];
export type CustomField = InvoiceInput["customFields"][number];

/* -------------------------------------------------------------------------------------------- */
/* Sending                                                                                      */
/* -------------------------------------------------------------------------------------------- */

export const sendInvoiceSchema = z.object({
  to: emailText("Recipient email", { required: true }),
  subject: requiredText("Subject", LIMITS.emailSubject).refine(
    (value) => !/[\r\n]/.test(value),
    "Subject must be a single line",
  ),
  message: text("Message", LIMITS.emailMessage),
});

export type SendInvoiceInput = z.output<typeof sendInvoiceSchema>;
