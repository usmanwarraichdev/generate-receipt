import { describe, expect, it } from "vitest";
import { calculateTotals } from "./calculate";

describe("calculateTotals", () => {
  it("matches the brief: 2 × $50 − $10 discount + 10% tax = $99.00", () => {
    const totals = calculateTotals({
      lineItems: [{ quantity: "2", unitPrice: "50" }],
      discount: "10",
      taxRate: "10",
    });

    expect(totals).toEqual({
      lineTotalsCents: [10_000],
      subtotalCents: 10_000,
      discountCents: 1_000,
      taxableCents: 9_000,
      taxCents: 900,
      totalCents: 9_900,
      discountExceedsSubtotal: false,
    });
  });

  it("rounds each line half up to cents", () => {
    // 1.5 × $9.99 = $14.985 → $14.99
    const totals = calculateTotals({
      lineItems: [{ quantity: "1.5", unitPrice: "9.99" }],
      discount: "",
      taxRate: "",
    });
    expect(totals.lineTotalsCents).toEqual([1_499]);
  });

  it("rounds lines before summing them", () => {
    // Each line is $0.005 → $0.01, so the subtotal is $0.02 (rounding the sum would give $0.01).
    const totals = calculateTotals({
      lineItems: [
        { quantity: "0.5", unitPrice: "0.01" },
        { quantity: "0.5", unitPrice: "0.01" },
      ],
      discount: "",
      taxRate: "",
    });
    expect(totals.subtotalCents).toBe(2);
  });

  it("applies the discount before tax and rounds tax half up", () => {
    // ($20.99 − $5.00) × 8.875% = $1.4191125 → $1.42
    const totals = calculateTotals({
      lineItems: [{ quantity: "1", unitPrice: "20.99" }],
      discount: "5",
      taxRate: "8.875",
    });
    expect(totals.taxableCents).toBe(1_599);
    expect(totals.taxCents).toBe(142);
    expect(totals.totalCents).toBe(1_741);
  });

  it("rounds a tax of exactly half a cent up", () => {
    // $0.50 × 1% = $0.005 → $0.01
    const totals = calculateTotals({
      lineItems: [{ quantity: "1", unitPrice: "0.50" }],
      discount: "",
      taxRate: "1",
    });
    expect(totals.taxCents).toBe(1);
  });

  it("allows a discount equal to the subtotal", () => {
    const totals = calculateTotals({
      lineItems: [{ quantity: "1", unitPrice: "40" }],
      discount: "40",
      taxRate: "10",
    });
    expect(totals.totalCents).toBe(0);
    expect(totals.discountExceedsSubtotal).toBe(false);
  });

  it("flags and clamps a discount larger than the subtotal so totals never go negative", () => {
    const totals = calculateTotals({
      lineItems: [{ quantity: "1", unitPrice: "40" }],
      discount: "500",
      taxRate: "10",
    });
    expect(totals.discountExceedsSubtotal).toBe(true);
    expect(totals.discountCents).toBe(4_000);
    expect(totals.totalCents).toBe(0);
  });

  it("treats blank or malformed numbers as zero while the user is typing", () => {
    const totals = calculateTotals({
      lineItems: [
        { quantity: "", unitPrice: "12" },
        { quantity: "abc", unitPrice: "12" },
        { quantity: "-3", unitPrice: "12" },
      ],
      discount: "oops",
      taxRate: "",
    });
    expect(totals.lineTotalsCents).toEqual([0, 0, 0]);
    expect(totals.totalCents).toBe(0);
  });

  it("stays exact for large amounts", () => {
    // 99,999.999 × $999,999.99 = $99,999,998,000.000001 → $99,999,998,000.00
    const totals = calculateTotals({
      lineItems: [{ quantity: "99999.999", unitPrice: "999999.99" }],
      discount: "",
      taxRate: "",
    });
    expect(totals.subtotalCents).toBe(9_999_999_800_000);
  });
});
