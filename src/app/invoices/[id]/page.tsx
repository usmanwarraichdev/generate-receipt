import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceEditor } from "@/components/editor/invoice-editor";
import { SetupNotice } from "@/components/setup-notice";
import { toInvoiceInput } from "@/lib/invoice";
import { isUuid } from "@/server/http";
import { listEmailActivity } from "@/server/invoices/repository";
import { loadInvoice, loadPageData } from "@/server/page-data";

export async function generateMetadata({ params }: PageProps<"/invoices/[id]">): Promise<Metadata> {
  const { id } = await params;
  const invoice = isUuid(id) ? await loadInvoice(id).catch(() => null) : null;
  return { title: invoice ? `${invoice.invoiceNumber} · ${invoice.customer.name}` : "Invoice" };
}

export default async function EditInvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { data, setupMessage } = await loadPageData(() =>
    Promise.all([loadInvoice(id), listEmailActivity(id)]),
  );
  if (setupMessage !== undefined) return <SetupNotice message={setupMessage} />;

  const [invoice, activity] = data;
  if (!invoice) notFound();

  return (
    <InvoiceEditor
      key={invoice.id}
      invoice={invoice}
      initialValues={toInvoiceInput(invoice)}
      activity={activity}
    />
  );
}
