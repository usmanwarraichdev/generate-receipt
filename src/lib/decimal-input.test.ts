import { describe, expect, it } from "vitest";
import { exceedsMax, sanitizeDecimalInput } from "./decimal-input";
import { QUANTITY_RULE, TAX_RATE_RULE } from "./invoice-schema";

describe("decimal input", () => {
  it("keeps digits and one decimal point, without a minus sign", () => {
    expect(sanitizeDecimalInput("-1,250.505", 2)).toEqual({
      value: "1250.50",
      rejectedNegative: true,
    });
  });

  it("knows when a value goes over the field's maximum", () => {
    const { max, scale } = QUANTITY_RULE;
    expect(exceedsMax("99999.999", max, scale)).toBe(false);
    expect(exceedsMax("100000", max, scale)).toBe(true);
    expect(exceedsMax("999999", max, scale)).toBe(true);
    expect(exceedsMax("", max, scale)).toBe(false);
    expect(exceedsMax(".", max, scale)).toBe(false);
    expect(exceedsMax("100", TAX_RATE_RULE.max, TAX_RATE_RULE.scale)).toBe(false);
    expect(exceedsMax("100.001", TAX_RATE_RULE.max, TAX_RATE_RULE.scale)).toBe(true);
  });
});
