import { sendInvoiceSchema } from "@/lib/invoice-schema";
import { sendInvoice } from "@/server/email/send-invoice";
import { parseIdempotencyKey } from "@/server/email/policy";
import { parseInvoiceId, parseJsonBody, route } from "@/server/http";

type Context = RouteContext<"/api/invoices/[id]/send">;

/**
 * POST /api/invoices/:id/send  { to, subject, message }
 * Optional header Idempotency-Key: reuse it when retrying so the email is delivered only once.
 */
export const POST = route(async (request, context: Context) => {
  const id = parseInvoiceId((await context.params).id);
  const input = await parseJsonBody(request, sendInvoiceSchema);
  const result = await sendInvoice({
    invoiceId: id,
    input,
    idempotencyKey:
      parseIdempotencyKey(request.headers.get("idempotency-key")) ?? crypto.randomUUID(),
    origin: new URL(request.url).origin,
  });
  return Response.json(result);
});
