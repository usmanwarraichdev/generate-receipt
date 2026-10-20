/** Minimum gap between two successful sends of the same invoice (prevents accidental doubles). */
export const SEND_COOLDOWN_SECONDS = 30;

/**
 * Builds the From header: the business name as display name, the configured sender address.
 * EMAIL_FROM="Folio <onboarding@resend.dev>" + "Fernleaf Studio" →
 * "Fernleaf Studio via Folio" <onboarding@resend.dev>
 */
export function formatSender(emailFrom: string, businessName: string): string {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(emailFrom);
  const address = (match?.[2] ?? emailFrom).trim();
  const product = clean(match?.[1] ?? "") || "Folio";
  const business = clean(businessName);
  return `"${business ? `${business} via ${product}` : product}" <${address}>`;
}

function clean(value: string): string {
  return value
    .replace(/["\\<>\r\n]/g, "")
    .trim()
    .slice(0, 60);
}

/**
 * EMAIL_ALLOWED_RECIPIENTS is a comma-separated list of addresses and/or "@domain" entries.
 * Empty means anyone can be emailed (subject to the provider's own rules).
 */
export function isRecipientAllowed(recipient: string, allowlist: string): boolean {
  const entries = allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (entries.length === 0) return true;

  const email = recipient.trim().toLowerCase();
  return entries.some((entry) => (entry.startsWith("@") ? email.endsWith(entry) : email === entry));
}

/** Accepts a client-supplied Idempotency-Key only if it looks like one (e.g. a UUID). */
export function parseIdempotencyKey(value: string | null): string | null {
  return value && /^[A-Za-z0-9-]{8,100}$/.test(value) ? value : null;
}
