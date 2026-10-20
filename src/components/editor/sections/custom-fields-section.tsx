"use client";

import { EyeOff, Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useController, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fieldId } from "@/lib/form-errors";
import { LIMITS, type InvoiceInput } from "@/lib/invoice-schema";
import { cn } from "@/lib/utils";
import { EditorSection, useErrorCount } from "../editor-section";
import { TextField } from "../form-fields";

const SUGGESTIONS = ["PO number", "Project", "Payment terms", "Tax ID"];

/**
 * Free-form label/value pairs. Visible fields appear on the invoice; hidden ones are kept for
 * your records only. They never take part in any calculation.
 */
export function CustomFieldsSection() {
  const { control, getValues, setFocus } = useFormContext<InvoiceInput>();
  const { fields, append, remove, insert } = useFieldArray({ control, name: "customFields" });
  const customFields = useWatch({ control, name: "customFields" });
  const errorCount = useErrorCount(["customFields"]);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const atLimit = fields.length >= LIMITS.customFields;
  const usedLabels = new Set(customFields.map((field) => field.label.trim().toLowerCase()));
  const suggestions = SUGGESTIONS.filter((label) => !usedLabels.has(label.toLowerCase()));

  function addField(label = "") {
    append(
      { label, value: "", visible: true },
      {
        shouldFocus: true,
        focusName: `customFields.${fields.length}.${label ? "value" : "label"}`,
      },
    );
  }

  function removeField(position: number) {
    const removed = getValues(`customFields.${position}`);
    const remaining = fields.length - 1;
    remove(position);
    requestAnimationFrame(() => {
      if (remaining > 0) setFocus(`customFields.${Math.min(position, remaining - 1)}.label`);
      else addButtonRef.current?.focus();
    });
    toast(`Removed “${removed.label.trim() || "custom field"}”`, {
      action: {
        label: "Undo",
        onClick: () =>
          insert(position, removed, {
            shouldFocus: true,
            focusName: `customFields.${position}.label`,
          }),
      },
    });
  }

  return (
    <EditorSection
      id="section-custom-fields"
      index={5}
      title="Custom fields"
      description="Extra details like a PO number. Shown on the invoice unless hidden; never used in totals."
      errorCount={errorCount}
    >
      {fields.length > 0 && (
        <ul className="grid gap-3">
          {fields.map((field, position) => {
            const visible = customFields[position]?.visible ?? true;
            return (
              <li
                key={field.id}
                className={cn(
                  "grid animate-rise gap-3 rounded-xl border p-4 pt-2.5 transition-colors",
                  visible ? "border-line bg-white" : "border-dashed border-ink/20 bg-muted/50",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Field {position + 1}
                    {!visible && (
                      <span className="ml-2 inline-flex items-center gap-1 tracking-normal normal-case">
                        <EyeOff aria-hidden className="size-3" /> Hidden from the invoice
                      </span>
                    )}
                  </p>
                  <div className="-mr-1.5 flex items-center gap-1">
                    <VisibilityToggle position={position} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeField(position)}
                      aria-label={`Remove custom field ${customFields[position]?.label.trim() || position + 1}`}
                      className="text-ink/60 hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                  <TextField
                    name={`customFields.${position}.label`}
                    maxCharacters={LIMITS.customFieldLabel}
                    label={
                      <>
                        Label<span className="sr-only"> for custom field {position + 1}</span>
                      </>
                    }
                    placeholder="e.g. PO number"
                    autoComplete="off"
                    required
                  />
                  <TextField
                    name={`customFields.${position}.value`}
                    maxCharacters={LIMITS.customFieldValue}
                    label={
                      <>
                        Value<span className="sr-only"> for custom field {position + 1}</span>
                      </>
                    }
                    autoComplete="off"
                    required
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          fields.length > 0 && "mt-4 border-t border-line pt-4",
        )}
      >
        <Button
          ref={addButtonRef}
          type="button"
          variant="outline"
          onClick={() => addField()}
          disabled={atLimit}
        >
          <Plus />
          Add custom field
        </Button>
        {!atLimit &&
          suggestions.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => addField(label)}
              className="h-8 rounded-full border border-dashed border-ink/25 px-3 text-xs font-medium text-ink/80 transition-colors hover:border-ink/50 hover:bg-white"
            >
              <span aria-hidden>+ </span>
              {label}
            </button>
          ))}
        {atLimit && (
          <p className="text-xs text-muted-foreground">
            Limit of {LIMITS.customFields} fields reached.
          </p>
        )}
      </div>
    </EditorSection>
  );
}

function VisibilityToggle({ position }: { position: number }) {
  const { control } = useFormContext<InvoiceInput>();
  const {
    field: { ref, ...field },
  } = useController({ control, name: `customFields.${position}.visible` });
  const id = fieldId(field.name);
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        ref={ref}
        checked={field.value}
        onCheckedChange={field.onChange}
        onBlur={field.onBlur}
        className="data-checked:bg-success"
      />
      <label
        htmlFor={id}
        className="cursor-pointer text-xs font-medium whitespace-nowrap text-ink/80 select-none"
      >
        Show on invoice
      </label>
    </div>
  );
}
