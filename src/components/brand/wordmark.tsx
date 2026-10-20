import { cn } from "@/lib/utils";

/** The Folio mark: an ink tile with an italic serif "F" and a vermilion seal. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative grid size-8 place-items-center rounded-[9px] bg-ink text-canvas shadow-sm"
      >
        <span className="font-display text-[1.15rem] leading-none italic">F</span>
        <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-brand ring-2 ring-canvas" />
      </span>
      <span className="font-display text-xl tracking-tight text-ink">Folio</span>
    </span>
  );
}
