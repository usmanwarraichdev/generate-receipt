"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { calculateTotals } from "@/lib/calculate";
import {
  LIMITS,
  QUANTITY_RULE,
  UNIT_PRICE_RULE,
  type InvoiceInput,
  type LineItem,
} from "@/lib/invoice-schema";
import { formatCents } from "@/lib/money";
import { EditorSection, useErrorCount } from "../editor-section";
import { DecimalField, TextField } from "../form-fields";

const NEW_LINE: LineItem = { description: "", quantity: "1", unitPrice: "" };

export function LineItemsSection() {
  const { control, getValues, setFocus, trigger, formState } = useFormContext<InvoiceInput>();
  const { fields, append, remove, insert } = useFieldArray({ control, name: "lineItems" });
  const lineItems = useWatch({ control, name: "lineItems" });
  const { lineTotalsCents, subtotalCents } = calculateTotals({
    lineItems,
    discount: "",
    taxRate: "",
  });
  const errorCount = useErrorCount(["lineItems"]);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const listError =
    formState.errors.lineItems?.root?.message ?? formState.errors.lineItems?.message;
  const atLimit = fields.length >= LIMITS.lineItems;

  function addLine() {
    append(NEW_LINE, { shouldFocus: true, focusName: `lineItems.${fields.length}.description` });
  }

  function removeLine(position: number) {
    const removed = getValues(`lineItems.${position}`);
    const remaining = fields.length - 1;
    remove(position);
    // The subtotal changed, so the discount may now be too large (or valid again).
    if (getValues("discount")) void trigger("discount");
    requestAnimationFrame(() => {
      if (remaining > 0) setFocus(`lineItems.${Math.min(position, remaining - 1)}.description`);
      else addButtonRef.current?.focus();
    });
    toast(`Removed “${removed.description.trim() || `line ${position + 1}`}”`, {
      action: {
        label: "Undo",
        onClick: () =>
          insert(position, removed, {
            shouldFocus: true,
            focusName: `lineItems.${position}.description`,
          }),
      },
    });
  }

  return (
    <EditorSection
      id="section-items"
      index={3}
      title="Line items"
      description="Each line is rounded to the cent before it’s added up."
      errorCount={errorCount}
    >
      {listError && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-destructive/[0.06] px-3 py-2 text-sm font-medium text-destructive"
        >
          {listError}
        </p>
      )}

      <ol className="grid gap-3">
        {fields.map((field, position) => {
          const lineLabel = <span className="sr-only"> for line {position + 1}</span>;
          const description = lineItems[position]?.description.trim();
          return (
            <li
              key={field.id}
              className="grid animate-rise gap-3 rounded-xl border border-line bg-white p-4 pt-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Line {position + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLine(position)}
                  aria-label={`Remove line ${position + 1}${description ? `: ${description}` : ""}`}
                  className="-mr-1.5 text-ink/60 hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>
              <TextField
                name={`lineItems.${position}.description`}
                maxCharacters={LIMITS.description}
                label={<>Description{lineLabel}</>}
                placeholder="What did you deliver?"
                required
                autoComplete="off"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,7.5rem)_minmax(0,10rem)_minmax(0,1fr)]">
                <DecimalField
                  name={`lineItems.${position}.quantity`}
                  label={<>Quantity{lineLabel}</>}
                  rule={QUANTITY_RULE}
                  deps={["discount"]}
                />
                <DecimalField
                  name={`lineItems.${position}.unitPrice`}
                  label={<>Unit price{lineLabel}</>}
                  rule={UNIT_PRICE_RULE}
                  prefix="$"
                  placeholder="0.00"
                  deps={["discount"]}
                />
                <div className="col-span-2 flex min-w-0 items-baseline justify-between gap-3 border-t border-dashed border-line pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start sm:gap-1.5 sm:border-0 sm:pt-0">
                  <span className="text-[0.8125rem] leading-5 font-medium text-muted-foreground">
                    Amount
                  </span>
                  <output
                    aria-label={`Amount for line ${position + 1}`}
                    className="min-w-0 text-right text-base font-semibold [overflow-wrap:anywhere] text-ink tabular-nums sm:flex sm:h-10 sm:items-center"
                  >
                    {formatCents(lineTotalsCents[position] ?? 0)}
                  </output>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {fields.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">
          No line items yet. Add what you’re billing for.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Button
          ref={addButtonRef}
          type="button"
          variant="outline"
          onClick={addLine}
          disabled={atLimit}
        >
          <Plus />
          Add line item
        </Button>
        <p className="text-sm text-muted-foreground">
          {atLimit ? `Limit of ${LIMITS.lineItems} lines reached · ` : ""}Subtotal{" "}
          <span className="font-semibold text-ink tabular-nums">{formatCents(subtotalCents)}</span>
        </p>
      </div>
    </EditorSection>
  );
}
