const TRAILING_DIGITS = /^(.*?)(\d+)$/;

/** "INV-0009" → "INV-0010", keeping zero padding. Numbers without digits get a counter appended. */
export function incrementInvoiceNumber(current: string): string {
  const match = TRAILING_DIGITS.exec(current);
  if (!match) return `${current}-0001`;
  const [, prefix, digits] = match;
  return prefix + (BigInt(digits) + 1n).toString().padStart(digits.length, "0");
}

/**
 * Suggests the number after `latest`, skipping any that are already taken (case-insensitive,
 * matching the database's unique index).
 */
export function suggestInvoiceNumber(latest: string | undefined, taken: Iterable<string>): string {
  const used = new Set(Array.from(taken, (number) => number.toLowerCase()));
  let candidate = incrementInvoiceNumber(latest ?? "INV-0000");
  for (let attempt = 0; used.has(candidate.toLowerCase()) && attempt < 10_000; attempt++) {
    candidate = incrementInvoiceNumber(candidate);
  }
  return candidate;
}
