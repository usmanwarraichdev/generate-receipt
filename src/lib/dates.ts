/**
 * Date-only helpers. Invoice dates are plain "YYYY-MM-DD" strings; arithmetic and formatting
 * happen in UTC so a viewer's time zone can never shift a date by a day.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Today's date in the viewer's local time zone, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const ms = Date.parse(`${toIsoDate}T00:00:00Z`) - Date.parse(`${fromIsoDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

/** "2026-10-19" → "Oct 19, 2026". Returns "" for incomplete dates while the user is typing. */
export function formatDate(isoDate: string): string {
  return isIsoDate(isoDate) ? dateFormat.format(new Date(`${isoDate}T00:00:00Z`)) : "";
}

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Timestamp in the viewer's own time zone, e.g. "Oct 19, 2026, 2:41 PM". */
export function formatDateTime(timestamp: string): string {
  return dateTimeFormat.format(new Date(timestamp));
}
