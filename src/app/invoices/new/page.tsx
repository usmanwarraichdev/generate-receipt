import type { Metadata } from "next";
import { InvoiceEditor } from "@/components/editor/invoice-editor";
import { SetupNotice } from "@/components/setup-notice";
import { todayIso } from "@/lib/dates";
import { createBlankInvoice } from "@/lib/invoice";
import { createSampleInvoice } from "@/lib/sample-invoice";
import { suggestNextInvoiceNumber } from "@/server/invoices/repository";
import { loadPageData } from "@/server/page-data";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  const { sample } = await searchParams;
  const { data: invoiceNumber, setupMessage } = await loadPageData(suggestNextInvoiceNumber);
  if (setupMessage !== undefined) return <SetupNotice message={setupMessage} />;

  // The editor swaps in the viewer's local date once it loads in the browser.
  const today = todayIso();
  const initialValues =
    sample === "1"
      ? createSampleInvoice(invoiceNumber, today)
      : createBlankInvoice(invoiceNumber, today);

  return <InvoiceEditor initialValues={initialValues} />;
}
