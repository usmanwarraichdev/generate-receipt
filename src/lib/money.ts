/**
 * Money and decimal helpers.
 *
 * Amounts arrive as decimal strings ("50", "12.5", "0.125") and every calculation uses BigInt
 * integers scaled to a fixed number of decimal places, so binary floating point never touches
 * money. Results are integer cents.
 */

/** Decimal places used for each kind of input. */
export const SCALE = {
  /** Dollars → cents. */
  money: 2,
  /** 1.5 hours → 1500 thousandths. */
  quantity: 3,
  /** 8.875% → 8875 thousandths of a percent. */
  percent: 3,
} as const;

// Digits with an optional decimal point. ".5" and "5." are accepted so typing feels natural.
const DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/** True for plain non-negative decimals such as "12", "12.5" or ".5" (no sign, no exponent). */
export function isDecimalString(value: string): boolean {
  return DECIMAL_PATTERN.test(value);
}

/** Number of digits after the decimal point. */
export function countDecimals(value: string): number {
  const dot = value.indexOf(".");
  return dot === -1 ? 0 : value.length - dot - 1;
}

/**
 * Converts a decimal string to an integer scaled by 10^scale: toScaled("12.5", 2) → 1250n.
 * Callers validate first; digits beyond `scale` are dropped.
 */
export function toScaled(value: string, scale: number): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole + fraction.slice(0, scale).padEnd(scale, "0"));
}

/** Lenient variant for live previews: blank or malformed input counts as zero. */
export function toScaledOrZero(value: string | null | undefined, scale: number): bigint {
  const trimmed = value?.trim() ?? "";
  return isDecimalString(trimmed) ? toScaled(trimmed, scale) : 0n;
}

/**
 * Inverse of toScaled: fromScaled(1250n, 2) → "12.50".
 * Trailing zeros are trimmed down to `minDecimals`: fromScaled(1500n, 3, 0) → "1.5".
 */
export function fromScaled(value: bigint, scale: number, minDecimals = scale): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  let fraction = digits.slice(digits.length - scale);
  while (fraction.length > minDecimals && fraction.endsWith("0")) {
    fraction = fraction.slice(0, -1);
  }
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

/** Divides non-negative integers, rounding half up (commercial rounding): 14985 / 1000 → 15. */
export function divideRoundHalfUp(dividend: bigint, divisor: bigint): bigint {
  if (dividend < 0n || divisor <= 0n) {
    throw new RangeError(
      "divideRoundHalfUp expects a non-negative dividend and a positive divisor",
    );
  }
  return (dividend * 2n + divisor) / (divisor * 2n);
}

/** Integer cents → plain decimal string for inputs and APIs: 9900 → "99.00". */
export function centsToDecimal(cents: number | bigint): string {
  return fromScaled(BigInt(cents), SCALE.money);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats integer cents as US dollars from an exact decimal string (no floats): 9900 → "$99.00". */
export function formatCents(cents: number | bigint): string {
  return usd.format(centsToDecimal(cents) as Intl.StringNumericLiteral);
}

/** Formats a percentage string for display: "8.875" → "8.875%", "" → "0%". */
export function formatPercent(rate: string): string {
  return `${fromScaled(toScaledOrZero(rate, SCALE.percent), SCALE.percent, 0)}%`;
}
