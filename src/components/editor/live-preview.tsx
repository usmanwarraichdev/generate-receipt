"use client";

import { useDeferredValue, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { PaperSheet } from "@/components/invoice/paper-sheet";
import { calculateTotals } from "@/lib/calculate";
import type { InvoiceStatus } from "@/lib/invoice";
import type { InvoiceInput } from "@/lib/invoice-schema";

/**
 * Re-renders the paper on every edit. `useDeferredValue` lets typing stay responsive: React
 * renders the preview at a lower priority than the input that changed.
 */
export function LivePreview({ status }: { status: InvoiceStatus }) {
  const { control } = useFormContext<InvoiceInput>();
  // The form always holds a complete invoice; useWatch's deep-partial type is overly cautious.
  const values = useWatch({ control }) as InvoiceInput;
  const invoice = useDeferredValue(values);
  const totals = useMemo(() => calculateTotals(invoice), [invoice]);

  return (
    <PaperSheet>
      <InvoiceDocument invoice={invoice} totals={totals} status={status} showPlaceholders />
    </PaperSheet>
  );
}
