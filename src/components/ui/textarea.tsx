import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-lg border border-input/55 bg-white px-3 py-2 text-base text-ink shadow-xs transition-[color,border-color,box-shadow] outline-none placeholder:text-ink/45 hover:border-input/80 focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-ink/12 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
