import { SCALE, divideRoundHalfUp, toScaledOrZero } from "./money";

export interface CalculationInput {
  lineItems: ReadonlyArray<{ quantity: string; unitPrice: string }>;
  discount: string;
  taxRate: string;
}

export interface InvoiceTotals {
  /** Each line rounded to cents, in the same order as the input. */
  lineTotalsCents: number[];
  subtotalCents: number;
  /** The discount actually applied (never more than the subtotal). */
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  totalCents: number;
  /** True when the entered discount is larger than the subtotal (validation rejects this). */
  discountExceedsSubtotal: boolean;
}

// quantity (thousandths) × price (cents) / 1000 = cents
const QUANTITY_DIVISOR = 10n ** BigInt(SCALE.quantity);
// cents × rate (thousandths of a percent) / 100 / 1000 = cents
const PERCENT_DIVISOR = 100n * 10n ** BigInt(SCALE.percent);

/**
 * Calculates invoice totals in the order the business rules require:
 * round each line to cents → sum → subtract the fixed discount → calculate and round tax.
 *
 * Pure and lenient so the live preview can call it on every keystroke: blank or malformed
 * numbers count as zero and the discount is clamped, so totals never go negative.
 * Validation (see invoice-schema.ts) is what actually rejects bad input.
 */
export function calculateTotals(input: CalculationInput): InvoiceTotals {
  const lineTotals = input.lineItems.map((item) =>
    divideRoundHalfUp(
      toScaledOrZero(item.quantity, SCALE.quantity) * toScaledOrZero(item.unitPrice, SCALE.money),
      QUANTITY_DIVISOR,
    ),
  );
  const subtotal = lineTotals.reduce((sum, cents) => sum + cents, 0n);

  const requestedDiscount = toScaledOrZero(input.discount, SCALE.money);
  const discount = requestedDiscount > subtotal ? subtotal : requestedDiscount;
  const taxable = subtotal - discount;

  const taxRate = toScaledOrZero(input.taxRate, SCALE.percent);
  const tax = divideRoundHalfUp(taxable * taxRate, PERCENT_DIVISOR);

  // Input limits in the schema keep every value well below Number.MAX_SAFE_INTEGER.
  return {
    lineTotalsCents: lineTotals.map(Number),
    subtotalCents: Number(subtotal),
    discountCents: Number(discount),
    taxableCents: Number(taxable),
    taxCents: Number(tax),
    totalCents: Number(taxable + tax),
    discountExceedsSubtotal: requestedDiscount > subtotal,
  };
}
