import { invoiceInputSchema } from "@/lib/invoice-schema";
import { notFound } from "@/server/errors";
import { parseInvoiceId, parseJsonBody, route } from "@/server/http";
import { deleteInvoice, getInvoice, updateInvoice } from "@/server/invoices/repository";

type Context = RouteContext<"/api/invoices/[id]">;

/** GET /api/invoices/:id */
export const GET = route(async (_request, context: Context) => {
  const id = parseInvoiceId((await context.params).id);
  const invoice = await getInvoice(id);
  if (!invoice) throw notFound();
  return Response.json({ invoice });
});

/** PUT /api/invoices/:id: replaces the invoice with a fully validated version. */
export const PUT = route(async (request, context: Context) => {
  const id = parseInvoiceId((await context.params).id);
  const input = await parseJsonBody(request, invoiceInputSchema);
  const invoice = await updateInvoice(id, input);
  return Response.json({ invoice });
});

/** DELETE /api/invoices/:id */
export const DELETE = route(async (_request, context: Context) => {
  const id = parseInvoiceId((await context.params).id);
  await deleteInvoice(id);
  return new Response(null, { status: 204 });
});
