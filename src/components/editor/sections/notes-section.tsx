"use client";

import { Check } from "lucide-react";
import { useController, useFormContext } from "react-hook-form";
import { ACCENT_COLORS } from "@/lib/accents";
import { LIMITS, type InvoiceInput } from "@/lib/invoice-schema";
import { EditorSection, useErrorCount } from "../editor-section";
import { TextAreaField } from "../form-fields";

export function NotesSection() {
  const errorCount = useErrorCount(["notes", "accentColor"]);
  return (
    <EditorSection
      id="section-notes"
      index={6}
      title="Notes & style"
      description="A closing note and the accent color used on the invoice and email."
      errorCount={errorCount}
    >
      <div className="grid gap-6">
        <TextAreaField
          name="notes"
          label="Notes"
          rows={3}
          maxCharacters={LIMITS.notes}
          placeholder="Payment instructions, a thank-you note…"
        />
        <AccentPicker />
      </div>
    </EditorSection>
  );
}

/** Native radio buttons styled as swatches, so arrow keys and screen readers work as expected. */
function AccentPicker() {
  const { control } = useFormContext<InvoiceInput>();
  const {
    field: { ref, ...field },
  } = useController({ control, name: "accentColor" });
  const selected = ACCENT_COLORS.find((color) => color.value === field.value);

  return (
    <fieldset>
      <legend className="text-[0.8125rem] font-medium text-ink">
        Accent color <span className="font-normal text-muted-foreground">· {selected?.name}</span>
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-3">
        {ACCENT_COLORS.map((color) => (
          <label key={color.value} className="relative cursor-pointer">
            <input
              type="radio"
              name={field.name}
              value={color.value}
              checked={field.value === color.value}
              onChange={() => field.onChange(color.value)}
              onBlur={field.onBlur}
              ref={field.value === color.value ? ref : undefined}
              className="peer sr-only"
            />
            <span
              className="grid size-9 place-items-center rounded-full text-white shadow-sm ring-1 ring-black/10 transition peer-checked:ring-2 peer-checked:ring-ink peer-checked:ring-offset-2 peer-checked:ring-offset-surface peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink"
              style={{ backgroundColor: color.value }}
            >
              {field.value === color.value && <Check aria-hidden className="size-4" />}
            </span>
            <span className="sr-only">{color.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
