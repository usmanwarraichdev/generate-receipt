import { Plus } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/invoices/empty-state";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { StatsStrip } from "@/components/invoices/stats-strip";
import { SetupNotice } from "@/components/setup-notice";
import { Button } from "@/components/ui/button";
import { listInvoices } from "@/server/invoices/repository";
import { loadPageData } from "@/server/page-data";

// Always render with fresh data from the database.
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const { data: invoices, setupMessage } = await loadPageData(listInvoices);
  if (setupMessage !== undefined) return <SetupNotice message={setupMessage} />;

  return (
    <>
      <AppHeader>
        <Button asChild variant="brand">
          <Link href="/invoices/new">
            <Plus aria-hidden />
            New invoice
          </Link>
        </Button>
      </AppHeader>
      <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">Billing</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink sm:text-5xl">Invoices</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Create, send and keep track of every invoice in one calm place.
        </p>
        {invoices.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <StatsStrip invoices={invoices} />
            <InvoiceList invoices={invoices} />
          </>
        )}
      </main>
    </>
  );
}
