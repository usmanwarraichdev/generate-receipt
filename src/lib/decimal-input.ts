import { toScaledOrZero } from "./money";

/**
 * Keeps a money/quantity field to digits and one decimal point while the user types or pastes.
 * A minus sign can never be entered; `rejectedNegative` lets the field explain why it vanished.
 * Commas are treated as thousands separators ("1,250.50" → "1250.50").
 */
export function sanitizeDecimalInput(
  raw: string,
  maxDecimals: number,
): { value: string; rejectedNegative: boolean } {
  const rejectedNegative = raw.includes("-");
  let value = raw.replace(/[^\d.]/g, "");
  const dot = value.indexOf(".");
  if (dot !== -1) {
    const whole = value.slice(0, dot);
    const fraction = value
      .slice(dot + 1)
      .replace(/\./g, "")
      .slice(0, maxDecimals);
    value = maxDecimals === 0 ? whole : `${whole}.${fraction}`;
  }
  return { value, rejectedNegative };
}

/** True when a (sanitized) value is above the field's maximum, so the keystroke can be refused. */
export function exceedsMax(value: string, max: string, scale: number): boolean {
  return toScaledOrZero(value, scale) > toScaledOrZero(max, scale);
}
