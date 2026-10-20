import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand/wordmark";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { PaperSheet } from "@/components/invoice/paper-sheet";
import { PrintButton } from "@/components/invoice/print-button";
import { SetupNotice } from "@/components/setup-notice";
import { formatDate } from "@/lib/dates";
import { toInvoiceInput } from "@/lib/invoice";
import { formatCents } from "@/lib/money";
import { isUuid } from "@/server/http";
import { loadInvoice, loadPageData } from "@/server/page-data";

/**
 * The customer-facing page linked from the invoice email. The unguessable UUID in the URL acts as
 * the access token (see README, "Limitations"). Not indexed by search engines.
 */
export async function generateMetadata({
  params,
}: PageProps<"/invoices/[id]/view">): Promise<Metadata> {
  const { id } = await params;
  const invoice = isUuid(id) ? await loadInvoice(id).catch(() => null) : null;
  return {
    // The page title doubles as the default file name when saving as PDF.
    title: {
      // The title doubles as the PDF file name when printing, so it is just the number.
      absolute: invoice?.invoiceNumber || "Invoice",
    },
    robots: { index: false, follow: false },
  };
}

export default async function InvoiceViewPage({ params }: PageProps<"/invoices/[id]/view">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { data: invoice, setupMessage } = await loadPageData(() => loadInvoice(id));
  if (setupMessage !== undefined) return <SetupNotice message={setupMessage} />;
  if (!invoice) notFound();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex min-h-16 max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{invoice.business.name}</p>
            <p className="text-sm text-muted-foreground">
              Invoice {invoice.invoiceNumber} · {formatCents(invoice.totals.totalCents)} due{" "}
              {formatDate(invoice.dueDate)}
            </p>
          </div>
          <PrintButton />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-4xl px-3 py-8 sm:px-6 sm:py-12 print:p-0">
        <h1 className="sr-only">
          Invoice {invoice.invoiceNumber} from {invoice.business.name}
        </h1>
        <PaperSheet>
          <InvoiceDocument invoice={toInvoiceInput(invoice)} totals={invoice.totals} />
        </PaperSheet>
        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground print:hidden">
          Made with <Wordmark className="origin-left scale-75" />
        </p>
      </main>
    </>
  );
}
