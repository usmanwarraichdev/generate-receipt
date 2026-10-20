import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** First-run state: a small stack of paper and two ways to start. */
export function EmptyState() {
  return (
    <section className="mt-10 grid place-items-center rounded-3xl border border-dashed border-ink/15 bg-surface/60 px-6 py-16 text-center">
      <div aria-hidden className="relative mb-8 h-28 w-24">
        <span className="absolute inset-0 rotate-[-9deg] rounded-[3px] bg-white shadow-paper ring-1 ring-black/5" />
        <span className="absolute inset-0 rotate-[5deg] rounded-[3px] bg-white shadow-paper ring-1 ring-black/5" />
        <span className="absolute inset-0 grid content-start gap-1.5 rounded-[3px] bg-white p-3 shadow-paper ring-1 ring-black/5">
          <span className="h-1 w-6 rounded-full bg-brand" />
          <span className="mt-1 h-1.5 w-12 rounded-full bg-ink/70" />
          <span className="h-1 w-14 rounded-full bg-ink/15" />
          <span className="h-1 w-10 rounded-full bg-ink/15" />
          <span className="mt-3 h-1 w-full rounded-full bg-ink/10" />
          <span className="h-1 w-full rounded-full bg-ink/10" />
          <span className="mt-2 ml-auto h-1.5 w-8 rounded-full bg-ink/60" />
        </span>
      </div>
      <h2 className="font-display text-3xl tracking-tight">
        Your first invoice is a few keystrokes away
      </h2>
      <p className="mt-3 max-w-md text-muted-foreground">
        Add your details, list what you delivered and send a polished invoice straight to your
        customer’s inbox.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild variant="brand" size="lg">
          <Link href="/invoices/new">
            <Plus aria-hidden />
            Create invoice
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/invoices/new?sample=1">
            <Sparkles aria-hidden />
            Start from a sample
          </Link>
        </Button>
      </div>
    </section>
  );
}
