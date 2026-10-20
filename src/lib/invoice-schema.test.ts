import { describe, expect, it } from "vitest";
import { createSampleInvoice } from "./sample-invoice";
import { invoiceInputSchema, sendInvoiceSchema } from "./invoice-schema";

const valid = () => createSampleInvoice("INV-0001", "2026-10-19");

function errorsFor(input: unknown): Record<string, string> {
  const result = invoiceInputSchema.safeParse(input);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return errors;
}

describe("invoiceInputSchema", () => {
  it("accepts the sample invoice and normalizes numbers", () => {
    const result = invoiceInputSchema.safeParse({
      ...valid(),
      lineItems: [{ description: "  Workshop ", quantity: "002.50", unitPrice: "50" }],
      discount: "10",
      taxRate: "8.500",
    });
    expect(result.success).toBe(true);
    expect(result.data?.lineItems[0]).toEqual({
      description: "Workshop",
      quantity: "2.5",
      unitPrice: "50.00",
    });
    expect(result.data?.discount).toBe("10.00");
    expect(result.data?.taxRate).toBe("8.5");
  });

  it("rejects negative quantities, prices, discounts and tax rates", () => {
    const errors = errorsFor({
      ...valid(),
      lineItems: [{ description: "Workshop", quantity: "-2", unitPrice: "-50" }],
      discount: "-10",
      taxRate: "-5",
    });
    expect(errors).toMatchObject({
      "lineItems.0.quantity": "Quantity can't be negative",
      "lineItems.0.unitPrice": "Unit price can't be negative",
      discount: "Discount can't be negative",
      taxRate: "Tax rate can't be negative",
    });
  });

  it("rejects a discount larger than the subtotal", () => {
    expect(errorsFor({ ...valid(), discount: "100.01" })).toEqual({
      discount: "Discount can't exceed the subtotal ($100.00)",
    });
  });

  it("checks the discount even while unrelated fields are invalid", () => {
    const errors = errorsFor({
      ...valid(),
      business: { ...valid().business, name: "" },
      discount: "500",
    });
    expect(errors.discount).toBe("Discount can't exceed the subtotal ($100.00)");
    expect(errors["business.name"]).toBe("Business name is required");
  });

  it("requires a positive quantity and at most the allowed decimals", () => {
    const errors = errorsFor({
      ...valid(),
      lineItems: [{ description: "Workshop", quantity: "0", unitPrice: "1.999" }],
    });
    expect(errors["lineItems.0.quantity"]).toBe("Quantity must be greater than 0");
    expect(errors["lineItems.0.unitPrice"]).toBe("Use at most 2 decimal places");
  });

  it("caps the tax rate at 100%", () => {
    expect(errorsFor({ ...valid(), taxRate: "100.001" }).taxRate).toBe(
      "Tax rate can't be more than 100%",
    );
  });

  it("rejects a due date before the issue date", () => {
    expect(errorsFor({ ...valid(), dueDate: "2026-10-18" })).toEqual({
      dueDate: "Due date can't be before the issue date",
    });
  });

  it("requires at least one line item and valid emails", () => {
    const errors = errorsFor({
      ...valid(),
      lineItems: [],
      customer: { ...valid().customer, email: "not-an-email" },
    });
    expect(errors.lineItems).toBe("Add at least one line item");
    expect(errors["customer.email"]).toBe("Enter a valid email like name@company.com");
  });

  it("rejects numbers sent as JSON numbers with a clear message", () => {
    const errors = errorsFor({
      ...valid(),
      lineItems: [{ description: "Workshop", quantity: 2, unitPrice: 50 }],
    });
    expect(errors["lineItems.0.quantity"]).toBe('Quantity must be a decimal string like "1.5"');
  });

  it("rejects bodies that aren't invoice objects without throwing", () => {
    for (const input of [null, [], "invoice", 42]) {
      expect(invoiceInputSchema.safeParse(input).success).toBe(false);
    }
  });

  it("limits names, emails and addresses", () => {
    const base = valid();
    const errors = errorsFor({
      ...base,
      business: { ...base.business, name: "x".repeat(61), address: "x".repeat(201) },
      customer: {
        ...base.customer,
        name: "x".repeat(61),
        email: `${"a".repeat(50)}@lumen.example`,
      },
    });
    expect(errors["business.name"]).toBe("Business name can be at most 60 characters");
    expect(errors["customer.name"]).toBe("Customer name can be at most 60 characters");
    expect(errors["business.address"]).toBe("Address can be at most 200 characters");
    expect(errors["customer.email"]).toBe("Email can be at most 60 characters");
    expect(
      invoiceInputSchema.safeParse({
        ...base,
        business: { ...base.business, name: "x".repeat(60), address: "x".repeat(200) },
      }).success,
    ).toBe(true);
  });

  it("limits email, description and invoice number lengths", () => {
    const base = valid();
    const errors = errorsFor({
      ...base,
      invoiceNumber: "INV-" + "1".repeat(22),
      business: { ...base.business, email: `${"a".repeat(49)}@fernleaf.co` },
      lineItems: [{ description: "x".repeat(41), quantity: "1", unitPrice: "1" }],
    });
    expect(errors.invoiceNumber).toBe("Invoice number can be at most 25 characters");
    expect(errors["business.email"]).toBe("Email can be at most 60 characters");
    expect(errors["lineItems.0.description"]).toBe("Description can be at most 40 characters");
    expect(
      invoiceInputSchema.safeParse({
        ...base,
        invoiceNumber: "INV-" + "1".repeat(21),
        business: { ...base.business, email: `${"a".repeat(48)}@fernleaf.co` },
        lineItems: [{ description: "x".repeat(40), quantity: "1", unitPrice: "100" }],
      }).success,
    ).toBe(true);
    expect(
      sendInvoiceSchema.safeParse({ to: `${"a".repeat(56)}@b.co`, subject: "Hi", message: "" })
        .success,
    ).toBe(false);
  });

  it("limits custom field labels and values", () => {
    const base = valid();
    const field = (label: string, value: string) => ({
      ...base,
      customFields: [{ label, value, visible: true }],
    });
    expect(errorsFor(field("x".repeat(26), "ok"))["customFields.0.label"]).toBe(
      "Label can be at most 25 characters",
    );
    expect(errorsFor(field("PO number", "x".repeat(200)))["customFields.0.value"]).toBe(
      "Value can be at most 199 characters",
    );
    expect(invoiceInputSchema.safeParse(field("x".repeat(25), "x".repeat(199))).success).toBe(true);
  });

  it("validates phone numbers against the selected country", () => {
    const base = valid();
    expect(
      errorsFor({ ...base, business: { ...base.business, phone: "503555" } })["business.phone"],
    ).toBe("United States numbers have 10 digits");
    expect(
      errorsFor({ ...base, customer: { ...base.customer, phone: "503-555-0142" } })[
        "customer.phone"
      ],
    ).toBe("Use digits only");
    expect(
      errorsFor({ ...base, business: { ...base.business, phoneCountry: "ZZ" } })[
        "business.phoneCountry"
      ],
    ).toBe("Pick a country code from the list");

    const uk = invoiceInputSchema.parse({
      ...base,
      customer: { ...base.customer, phoneCountry: "GB", phone: "07911123456" },
    });
    expect(uk.customer.phone).toBe("7911123456");
  });

  it("does not let custom fields affect validation of totals", () => {
    const result = invoiceInputSchema.safeParse({
      ...valid(),
      customFields: [{ label: "Discount", value: "-999", visible: true }],
    });
    expect(result.success).toBe(true);
  });
});

describe("sendInvoiceSchema", () => {
  it("validates the recipient and keeps the subject on one line", () => {
    const result = sendInvoiceSchema.safeParse({
      to: "nope",
      subject: "Invoice\nBcc: everyone@example.com",
      message: "",
    });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toContain("Enter a valid email like name@company.com");
    expect(messages).toContain("Subject must be a single line");
  });
});
