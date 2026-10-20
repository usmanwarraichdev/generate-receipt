"use client";

import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { flattenErrors } from "@/lib/form-errors";
import type { InvoiceInput } from "@/lib/invoice-schema";
import { cn } from "@/lib/utils";

/** Number of current validation errors under the given form paths. */
export function useErrorCount(prefixes: string[]): number {
  const { control } = useFormContext<InvoiceInput>();
  const { errors } = useFormState({ control });
  return flattenErrors(errors).filter(({ path }) =>
    prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}.`)),
  ).length;
}

interface EditorSectionProps {
  id: string;
  index: number;
  title: string;
  description?: string;
  errorCount?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A numbered card in the editor ("01 Who's involved"), with an issue count when invalid. */
export function EditorSection({
  id,
  index,
  title,
  description,
  errorCount = 0,
  actions,
  children,
  className,
}: EditorSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("rounded-2xl border border-line bg-surface shadow-card", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6">
        <div className="flex items-baseline gap-3">
          <span aria-hidden className="font-display text-sm text-brand tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <div>
            <h2 id={`${id}-title`} className="font-display text-xl leading-tight text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              <CircleAlert aria-hidden className="size-3" />
              {errorCount} {errorCount === 1 ? "issue" : "issues"}
            </span>
          )}
          {actions}
        </div>
      </header>
      <div className="px-5 pt-5 pb-6 sm:px-6">{children}</div>
    </section>
  );
}
