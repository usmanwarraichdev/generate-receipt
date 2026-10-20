import { invoiceInputSchema } from "@/lib/invoice-schema";
import { parseJsonBody, route } from "@/server/http";
import { createInvoice, listInvoices } from "@/server/invoices/repository";

/** GET /api/invoices: newest first. */
export const GET = route(async () => {
  const invoices = await listInvoices();
  return Response.json({ invoices });
});

/** POST /api/invoices: validates the body, computes totals server-side and stores the invoice. */
export const POST = route(async (request) => {
  const input = await parseJsonBody(request, invoiceInputSchema);
  const invoice = await createInvoice(input);
  return Response.json(
    { invoice },
    { status: 201, headers: { Location: `/api/invoices/${invoice.id}` } },
  );
});
