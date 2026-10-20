import type { InvoiceSummary } from "@/lib/invoice";
import { formatCents } from "@/lib/money";

/** Three at-a-glance numbers for the list page. */
export function StatsStrip({ invoices }: { invoices: InvoiceSummary[] }) {
  const sent = invoices.filter((invoice) => invoice.status === "sent");
  const drafts = invoices.length - sent.length;
  const outstanding = sent.reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const stats = [
    { label: "Awaiting payment", value: formatCents(outstanding), note: `${sent.length} sent` },
    {
      label: "Drafts",
      value: String(drafts),
      note: drafts === 1 ? "invoice in progress" : "invoices in progress",
    },
    { label: "All invoices", value: String(invoices.length), note: "saved in Folio" },
  ];

  return (
    <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`${index === 0 ? "col-span-2 sm:col-span-1" : ""} flex min-w-0 flex-col rounded-2xl border border-line bg-surface px-3 py-3 shadow-card sm:px-5 sm:py-4`}
        >
          <dt className="text-[10px] leading-tight font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:text-[11px] sm:tracking-[0.14em]">
            {stat.label}
          </dt>
          <dd className="mt-auto pt-2 font-display text-xl tracking-tight [overflow-wrap:anywhere] text-ink tabular-nums sm:text-2xl lg:text-3xl">
            {stat.value}
          </dd>
          <dd className="mt-0.5 hidden text-sm text-muted-foreground sm:block">{stat.note}</dd>
        </div>
      ))}
    </dl>
  );
}
