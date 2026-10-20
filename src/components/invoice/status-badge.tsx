import { FilePen, Send } from "lucide-react";
import type { InvoiceStatus } from "@/lib/invoice";
import { cn } from "@/lib/utils";

/** Status shown with text and an icon, never colour alone. */
export function StatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const sent = status === "sent";
  const Icon = sent ? Send : FilePen;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        sent
          ? "border-success/25 bg-success-soft text-success"
          : "border-ink/15 bg-surface text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {sent ? "Sent" : "Draft"}
    </span>
  );
}
