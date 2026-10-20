import { describe, expect, it } from "vitest";
import { incrementInvoiceNumber, suggestInvoiceNumber } from "./invoice-number";
import { maskEmail } from "./mask-email";

describe("invoice numbers", () => {
  it("increments the trailing number and keeps zero padding", () => {
    expect(incrementInvoiceNumber("INV-0009")).toBe("INV-0010");
    expect(incrementInvoiceNumber("2026/017")).toBe("2026/018");
    expect(incrementInvoiceNumber("INV-9999")).toBe("INV-10000");
    expect(incrementInvoiceNumber("ACME")).toBe("ACME-0001");
  });

  it("starts at INV-0001 and skips numbers that are taken", () => {
    expect(suggestInvoiceNumber(undefined, [])).toBe("INV-0001");
    expect(suggestInvoiceNumber("INV-0004", ["inv-0005", "INV-0006"])).toBe("INV-0007");
  });
});

describe("maskEmail", () => {
  it("hides most of the local part", () => {
    expect(maskEmail("delivered@resend.dev")).toBe("de••••@resend.dev");
    expect(maskEmail("a@b.co")).toBe("a••••@b.co");
    expect(maskEmail("broken")).toBe("••••");
  });
});
