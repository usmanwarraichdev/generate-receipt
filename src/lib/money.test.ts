import { describe, expect, it } from "vitest";
import {
  centsToDecimal,
  divideRoundHalfUp,
  formatCents,
  formatPercent,
  fromScaled,
  isDecimalString,
  toScaled,
  toScaledOrZero,
} from "./money";

describe("decimal parsing", () => {
  it("accepts plain non-negative decimals only", () => {
    for (const value of ["0", "12", "12.5", ".5", "5.", "0007.250"]) {
      expect(isDecimalString(value), value).toBe(true);
    }
    for (const value of ["", "-1", "1e3", "1,000", "12.5.1", " 1", "abc", "."]) {
      expect(isDecimalString(value), value).toBe(false);
    }
  });

  it("scales decimal strings to integers without floating point", () => {
    expect(toScaled("12.5", 2)).toBe(1250n);
    expect(toScaled("0.1", 2)).toBe(10n);
    expect(toScaled(".5", 3)).toBe(500n);
    expect(toScaled("5.", 2)).toBe(500n);
    expect(toScaled("1.005", 3)).toBe(1005n);
  });

  it("treats invalid input as zero in lenient mode", () => {
    expect(toScaledOrZero("", 2)).toBe(0n);
    expect(toScaledOrZero("-5", 2)).toBe(0n);
    expect(toScaledOrZero(undefined, 2)).toBe(0n);
    expect(toScaledOrZero(" 7 ", 2)).toBe(700n);
  });

  it("converts scaled integers back to strings", () => {
    expect(fromScaled(1250n, 2)).toBe("12.50");
    expect(fromScaled(5n, 2)).toBe("0.05");
    expect(fromScaled(1500n, 3, 0)).toBe("1.5");
    expect(fromScaled(2000n, 3, 0)).toBe("2");
    expect(centsToDecimal(9900)).toBe("99.00");
  });
});

describe("rounding", () => {
  it("rounds half up", () => {
    expect(divideRoundHalfUp(14985n, 1000n)).toBe(15n);
    expect(divideRoundHalfUp(14984n, 1000n)).toBe(15n);
    expect(divideRoundHalfUp(14499n, 1000n)).toBe(14n);
    expect(divideRoundHalfUp(14500n, 1000n)).toBe(15n);
    expect(divideRoundHalfUp(0n, 1000n)).toBe(0n);
  });

  it("rejects negative dividends", () => {
    expect(() => divideRoundHalfUp(-1n, 10n)).toThrow(RangeError);
  });
});

describe("formatting", () => {
  it("formats cents as US dollars", () => {
    expect(formatCents(9900)).toBe("$99.00");
    expect(formatCents(123456789)).toBe("$1,234,567.89");
    expect(formatCents(5)).toBe("$0.05");
  });

  it("formats percentages", () => {
    expect(formatPercent("10")).toBe("10%");
    expect(formatPercent("8.875")).toBe("8.875%");
    expect(formatPercent("")).toBe("0%");
  });
});
