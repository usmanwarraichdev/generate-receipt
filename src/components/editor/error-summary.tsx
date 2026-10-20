"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { describeFieldPath, fieldId, type FlatFieldError } from "@/lib/form-errors";

const SECTION_FOR: Record<string, string> = {
  lineItems: "section-items",
  customFields: "section-custom-fields",
};

/**
 * Lists every problem after a failed save, each linking to its field. Rendered with role="alert"
 * so screen readers announce it; the first invalid field also receives focus.
 */
export function ErrorSummary({
  errors,
  submitCount,
}: {
  errors: FlatFieldError[];
  submitCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submitCount > 0) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [submitCount]);

  if (errors.length === 0) return null;

  function focusField(path: string) {
    const target =
      document.getElementById(fieldId(path)) ?? document.getElementById(SECTION_FOR[path] ?? "");
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  }

  return (
    <div
      ref={ref}
      role="alert"
      aria-labelledby="error-summary-title"
      className="animate-rise rounded-2xl border border-destructive/25 bg-destructive/[0.04] p-5"
    >
      <h2
        id="error-summary-title"
        className="flex items-center gap-2 font-semibold text-destructive"
      >
        <CircleAlert aria-hidden className="size-4" />
        {errors.length === 1 ? "1 field needs attention" : `${errors.length} fields need attention`}
      </h2>
      <ul className="mt-3 grid gap-1.5 text-sm">
        {errors.slice(0, 8).map((error) => (
          <li key={error.path}>
            <a
              href={`#${fieldId(error.path)}`}
              onClick={(event) => {
                event.preventDefault();
                focusField(error.path);
              }}
              className="rounded text-ink underline decoration-destructive/40 underline-offset-4 hover:decoration-destructive"
            >
              <span className="font-medium">{describeFieldPath(error.path)}:</span> {error.message}
            </a>
          </li>
        ))}
        {errors.length > 8 && (
          <li className="text-muted-foreground">…and {errors.length - 8} more below.</li>
        )}
      </ul>
    </div>
  );
}
