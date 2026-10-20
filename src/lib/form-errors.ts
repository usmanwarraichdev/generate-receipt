/** Turns React Hook Form paths into human labels and stable element ids. */

const FIELD_LABELS: Record<string, string> = {
  invoiceNumber: "Invoice number",
  issueDate: "Issue date",
  dueDate: "Due date",
  "business.name": "Business name",
  "business.email": "Business email",
  "business.phoneCountry": "Business phone country code",
  "business.phone": "Business phone",
  "business.address": "Business address",
  "customer.name": "Customer name",
  "customer.email": "Customer email",
  "customer.phoneCountry": "Customer phone country code",
  "customer.phone": "Customer phone",
  "customer.address": "Customer address",
  lineItems: "Line items",
  customFields: "Custom fields",
  notes: "Notes",
  discount: "Discount",
  taxRate: "Tax rate",
  accentColor: "Accent color",
};

const ITEM_LABELS: Record<string, string> = {
  description: "description",
  quantity: "quantity",
  unitPrice: "unit price",
  label: "label",
  value: "value",
  visible: "visibility",
};

export function describeFieldPath(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  const match = /^(lineItems|customFields)\.(\d+)\.(\w+)$/.exec(path);
  if (match) {
    const [, list, index, key] = match;
    const prefix = list === "lineItems" ? "Line" : "Custom field";
    return `${prefix} ${Number(index) + 1} ${ITEM_LABELS[key] ?? key}`;
  }
  return path;
}

/** "lineItems.0.quantity" → "field-lineItems-0-quantity" */
export function fieldId(path: string): string {
  return `field-${path.replace(/\./g, "-")}`;
}

export interface FlatFieldError {
  path: string;
  message: string;
}

/** Flattens React Hook Form's nested error object into a list, in form order. */
export function flattenErrors(errors: object, prefix = ""): FlatFieldError[] {
  const result: FlatFieldError[] = [];
  for (const [key, value] of Object.entries(errors)) {
    if (key === "ref" || value === null || typeof value !== "object") continue;
    const path = key === "root" ? prefix : prefix ? `${prefix}.${key}` : key;
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message) {
      result.push({ path, message });
    } else {
      result.push(...flattenErrors(value, path));
    }
  }
  return result;
}
