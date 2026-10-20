/**
 * Hides most of an address before it is shown in activity logs or returned by the public API:
 * "delivered@resend.dev" → "de••••@resend.dev".
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "••••";
  const local = email.slice(0, at);
  const visible = local.slice(0, local.length > 2 ? 2 : 1);
  return `${visible}••••${email.slice(at)}`;
}
