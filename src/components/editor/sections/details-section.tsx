"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { addDays, daysBetween, isIsoDate } from "@/lib/dates";
import type { InvoiceInput } from "@/lib/invoice-schema";
import { EditorSection, useErrorCount } from "../editor-section";
import { LIMITS } from "@/lib/invoice-schema";
import { TextField } from "../form-fields";

const PAYMENT_TERMS = [
  { label: "Due on receipt", days: 0 },
  { label: "Net 7", days: 7 },
  { label: "Net 15", days: 15 },
  { label: "Net 30", days: 30 },
];

export function DetailsSection() {
  const { control, setValue } = useFormContext<InvoiceInput>();
  const [issueDate, dueDate] = useWatch({ control, name: ["issueDate", "dueDate"] });
  const errorCount = useErrorCount(["invoiceNumber", "issueDate", "dueDate"]);
  const canApplyTerms = isIsoDate(issueDate);
  const currentTerms = canApplyTerms && isIsoDate(dueDate) ? daysBetween(issueDate, dueDate) : null;

  return (
    <EditorSection
      id="section-details"
      index={2}
      title="Invoice details"
      description="Numbering and payment dates."
      errorCount={errorCount}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          name="invoiceNumber"
          maxCharacters={LIMITS.invoiceNumber}
          label="Invoice number"
          required
          autoComplete="off"
          spellCheck={false}
          inputClassName="font-medium"
        />
        <TextField name="issueDate" label="Issue date" type="date" required deps={["dueDate"]} />
        <TextField name="dueDate" label="Due date" type="date" required />
      </div>

      <div
        role="group"
        aria-label="Payment terms"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <span className="mr-1 text-xs text-muted-foreground">Payment terms</span>
        {PAYMENT_TERMS.map((term) => (
          <button
            key={term.days}
            type="button"
            aria-pressed={currentTerms === term.days}
            disabled={!canApplyTerms}
            onClick={() =>
              setValue("dueDate", addDays(issueDate, term.days), {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
            className="h-8 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink transition-colors hover:border-ink/30 disabled:opacity-50 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
          >
            {term.label}
          </button>
        ))}
      </div>
    </EditorSection>
  );
}
