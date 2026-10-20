"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { calculateTotals, type InvoiceTotals } from "@/lib/calculate";
import { DISCOUNT_RULE, TAX_RATE_RULE, type InvoiceInput } from "@/lib/invoice-schema";
import { formatCents, formatPercent } from "@/lib/money";
import { EditorSection, useErrorCount } from "../editor-section";
import { DecimalField } from "../form-fields";

export function TotalsSection() {
  const { control } = useFormContext<InvoiceInput>();
  const [lineItems, discount, taxRate] = useWatch({
    control,
    name: ["lineItems", "discount", "taxRate"],
  });
  const totals = calculateTotals({ lineItems, discount, taxRate });
  const errorCount = useErrorCount(["discount", "taxRate"]);

  return (
    <EditorSection
      id="section-totals"
      index={4}
      title="Discount & tax"
      description="Tax is applied after the discount, then rounded to the cent."
      errorCount={errorCount}
    >
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <DecimalField
            name="discount"
            label="Discount"
            rule={DISCOUNT_RULE}
            prefix="$"
            placeholder="0.00"
            hint="A fixed amount off the subtotal."
          />
          <DecimalField
            name="taxRate"
            label="Tax rate"
            rule={TAX_RATE_RULE}
            suffix="%"
            placeholder="0"
            hint="Between 0 and 100, e.g. 8.875."
          />
        </div>
        <Receipt totals={totals} taxRate={taxRate} />
      </div>
    </EditorSection>
  );
}

/** A receipt-style running total. */
function Receipt({ totals, taxRate }: { totals: InvoiceTotals; taxRate: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/20 bg-white [background-image:radial-gradient(circle_at_1px_1px,rgb(22_27_38/0.05)_1px,transparent_0)] [background-size:12px_12px] px-4 py-4 sm:px-5">
      <dl className="grid gap-2 text-sm">
        <ReceiptRow label="Subtotal" value={formatCents(totals.subtotalCents)} />
        <ReceiptRow
          label="Discount"
          value={
            totals.discountCents > 0 ? `−${formatCents(totals.discountCents)}` : formatCents(0)
          }
        />
        <ReceiptRow
          label={`Tax (${formatPercent(taxRate)})`}
          value={formatCents(totals.taxCents)}
        />
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-dashed border-ink/20 pt-3">
          <dt className="font-semibold whitespace-nowrap text-ink">Total due</dt>
          <dd className="ml-auto min-w-0 text-right font-display text-2xl [overflow-wrap:anywhere] text-ink tabular-nums sm:text-3xl">
            {formatCents(totals.totalCents)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="whitespace-nowrap text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right [overflow-wrap:anywhere] text-ink tabular-nums">{value}</dd>
    </div>
  );
}
