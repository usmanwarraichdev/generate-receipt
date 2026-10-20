import type { CSSProperties, ReactNode } from "react";
import type { InvoiceTotals } from "@/lib/calculate";
import { formatDate } from "@/lib/dates";
import type { InvoiceStatus } from "@/lib/invoice";
import type { InvoiceInput, Party } from "@/lib/invoice-schema";
import { SCALE, formatCents, formatPercent, fromScaled, toScaledOrZero } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

interface InvoiceDocumentProps {
  invoice: InvoiceInput;
  totals: InvoiceTotals;
  /** Shows a DRAFT/SENT stamp on screen (never printed). */
  status?: InvoiceStatus;
  /** Editor preview: hint at empty fields so the page never looks broken (never printed). */
  showPlaceholders?: boolean;
}

/**
 * The invoice "paper". Pure and presentational: the live preview, the public view page and the
 * printout all render this component, so what you see is exactly what prints. Container queries
 * reflow it for narrow screens; at Letter width it uses the full layout.
 * Hidden custom fields are filtered out here, so they can never reach the screen or the printer.
 */
export function InvoiceDocument({
  invoice,
  totals,
  status,
  showPlaceholders = false,
}: InvoiceDocumentProps) {
  const { business, customer } = invoice;
  const visibleFields = invoice.customFields.filter(
    (field) => field.visible && (field.label.trim() || field.value.trim()),
  );
  const hasTax = toScaledOrZero(invoice.taxRate, SCALE.percent) > 0n;
  const hint = (text: string) => (showPlaceholders ? <Placeholder>{text}</Placeholder> : null);

  return (
    <article
      id="invoice-document"
      aria-label={`Invoice ${invoice.invoiceNumber}`.trim()}
      className="invoice-document @container text-[13px] leading-relaxed [overflow-wrap:anywhere] text-ink"
      style={{ "--invoice-accent": invoice.accentColor } as CSSProperties}
    >
      <div aria-hidden className="mb-8 h-1.5 w-14 rounded-full bg-[var(--invoice-accent)]" />

      <header className="flex flex-col gap-6 @2xl:flex-row @2xl:items-start @2xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Monogram name={business.name} />
          <div className="min-w-0">
            <p className="font-display text-[1.6rem] leading-tight break-words">
              {business.name.trim() || hint("Your business name")}
            </p>
            <PartyLines party={business} />
          </div>
        </div>
        <div className="shrink-0 @2xl:text-right">
          <h2 className="font-display text-[2.75rem] leading-none tracking-tight @2xl:text-[3.25rem]">
            Invoice
          </h2>
          <p className="mt-2 text-sm font-semibold tracking-wide text-[var(--invoice-accent)]">
            {invoice.invoiceNumber.trim() ? `No. ${invoice.invoiceNumber}` : hint("Invoice number")}
          </p>
        </div>
      </header>

      <dl className="avoid-break mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-5 @2xl:grid-cols-4">
        <Meta label="Issue date">{formatDate(invoice.issueDate) || hint("Pick a date")}</Meta>
        <Meta label="Due date">{formatDate(invoice.dueDate) || hint("Pick a date")}</Meta>
        <Meta label="Amount due" accent>
          {formatCents(totals.totalCents)}
        </Meta>
        {visibleFields.map((field, index) => (
          <Meta key={index} label={field.label.trim() || "Untitled"}>
            {field.value.trim() || hint("Value")}
          </Meta>
        ))}
      </dl>

      <section className="avoid-break mt-8 grid gap-6 @2xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <SmallCaps>Bill to</SmallCaps>
          <p className="mt-1.5 text-[15px] font-semibold break-words">
            {customer.name.trim() || hint("Customer name")}
          </p>
          <PartyLines party={customer} />
        </div>
        {status && <StatusStamp status={status} />}
      </section>

      <table className="mt-10 w-full border-collapse text-left">
        <thead>
          <tr className="border-b-[1.5px] border-ink">
            <Th>Description</Th>
            <Th className="hidden w-20 text-right @lg:table-cell">Qty</Th>
            <Th className="hidden w-32 text-right @lg:table-cell">Unit price</Th>
            <Th className="w-32 text-right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, index) => {
            const quantity = fromScaled(
              toScaledOrZero(item.quantity, SCALE.quantity),
              SCALE.quantity,
              0,
            );
            const unitPrice = formatCents(toScaledOrZero(item.unitPrice, SCALE.money));
            return (
              <tr key={index} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <span className="font-medium break-words">
                    {item.description.trim() || hint("Item description")}
                  </span>
                  <span className="mt-0.5 block text-ink/60 tabular-nums @lg:hidden">
                    {quantity} × {unitPrice}
                  </span>
                </td>
                <td className="hidden py-3 text-right tabular-nums @lg:table-cell">{quantity}</td>
                <td className="hidden py-3 text-right tabular-nums @lg:table-cell">{unitPrice}</td>
                <td className="py-3 text-right font-medium tabular-nums">
                  {formatCents(totals.lineTotalsCents[index] ?? 0)}
                </td>
              </tr>
            );
          })}
          {invoice.lineItems.length === 0 && showPlaceholders && (
            <tr>
              <td colSpan={4} className="py-8 text-center">
                {hint("Add a line item to get started")}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="avoid-break mt-6 flex justify-end">
        <dl className="w-full max-w-72">
          <TotalRow label="Subtotal" value={formatCents(totals.subtotalCents)} />
          {totals.discountCents > 0 && (
            <TotalRow label="Discount" value={`−${formatCents(totals.discountCents)}`} />
          )}
          {hasTax && (
            <TotalRow
              label={`Tax (${formatPercent(invoice.taxRate)})`}
              value={formatCents(totals.taxCents)}
            />
          )}
          <div className="mt-3 flex items-baseline justify-between gap-6 border-t-2 border-[var(--invoice-accent)] pt-3">
            <dt className="text-sm font-semibold">Total due</dt>
            <dd className="font-display text-[1.75rem] leading-none tabular-nums">
              {formatCents(totals.totalCents)}
            </dd>
          </div>
          {showPlaceholders && totals.discountExceedsSubtotal && (
            <p className="mt-2 text-right text-xs text-destructive print:hidden">
              The discount is larger than the subtotal, so the preview caps it.
            </p>
          )}
        </dl>
      </div>

      {invoice.notes.trim() && (
        <section className="avoid-break mt-10">
          <SmallCaps>Notes</SmallCaps>
          <p className="mt-1.5 whitespace-pre-line text-ink/85">{invoice.notes}</p>
        </section>
      )}

      <footer className="avoid-break mt-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-line pt-4 text-xs text-ink/60">
        <span className="font-display text-sm text-ink italic">{business.name}</span>
        <span>
          {[business.email, formatPhone(business.phone, business.phoneCountry)]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </footer>
    </article>
  );
}

function Monogram({ name }: { name: string }) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word));
  const initials = words.length
    ? (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase()
    : "";
  return (
    <span
      aria-hidden
      className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--invoice-accent)] font-display text-lg text-white"
    >
      {initials || "·"}
    </span>
  );
}

function PartyLines({ party }: { party: Party }) {
  const lines = [party.email, formatPhone(party.phone, party.phoneCountry), party.address]
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return <p className="mt-1 whitespace-pre-line text-ink/65">{lines.join("\n")}</p>;
}

function Meta({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt>
        <SmallCaps>{label}</SmallCaps>
      </dt>
      <dd
        className={cn(
          "mt-1 font-medium break-words",
          accent && "font-display text-lg leading-tight text-[var(--invoice-accent)] tabular-nums",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-1">
      <dt className="text-ink/65">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "pb-2 text-[10.5px] font-semibold tracking-[0.14em] text-ink/60 uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SmallCaps({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10.5px] font-semibold tracking-[0.14em] text-ink/60 uppercase">
      {children}
    </span>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return <span className="font-normal text-ink/35 italic print:invisible">{children}</span>;
}

/** A rubber-stamp status mark. Decorative: the status is also shown as text in the app bar. */
function StatusStamp({ status }: { status: InvoiceStatus }) {
  const sent = status === "sent";
  return (
    <div aria-hidden className="flex items-start @2xl:justify-end print:hidden">
      <span
        key={status}
        className={cn(
          "inline-block animate-stamp rounded-md border-[3px] px-3 py-1 font-display text-lg font-semibold tracking-[0.28em] uppercase mix-blend-multiply",
          sent
            ? "border-[var(--invoice-accent)] text-[var(--invoice-accent)]"
            : "border-ink/40 text-ink/50",
        )}
      >
        {sent ? "Sent" : "Draft"}
      </span>
    </div>
  );
}
