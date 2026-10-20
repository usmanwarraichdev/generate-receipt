import "server-only";
import type { z } from "zod";
import { AppError, badRequest, notFound, validationFailed } from "./errors";

const MAX_BODY_BYTES = 100 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Handler<Context> = (request: Request, context: Context) => Promise<Response>;

/** Wraps a route handler so every failure becomes the same JSON error shape. */
export function route<Context>(handler: Handler<Context>): Handler<Context> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** `{ error: { code, message, fieldErrors? } }` with a matching HTTP status. */
export function errorResponse(error: unknown): Response {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(500, "INTERNAL", "Something went wrong on our side. Please try again.", {
          cause: error,
        });

  if (appError.status >= 500) {
    console.error(`[api] ${appError.code}: ${appError.message}`, appError.cause ?? "");
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  if (appError.retryAfterSeconds) headers.set("Retry-After", String(appError.retryAfterSeconds));

  return Response.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.fieldErrors && { fieldErrors: appError.fieldErrors }),
      },
    },
    { status: appError.status, headers },
  );
}

/** Reads a JSON body (max 100 KB) and validates it, mapping Zod issues to field errors. */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.output<Schema>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw badRequest("Send a JSON body with the header Content-Type: application/json.");
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) throw payloadTooLarge();

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw payloadTooLarge();

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw badRequest("The request body isn't valid JSON.");
  }

  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const rootIssue = result.error.issues.find((issue) => issue.path.length === 0);
  if (rootIssue) throw new AppError(422, "VALIDATION_FAILED", rootIssue.message);
  throw validationFailed(toFieldErrors(result.error));
}

/** `{ "lineItems.0.quantity": "Quantity can't be negative" }`, first message per field. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    fieldErrors[issue.path.join(".")] ??= issue.message;
  }
  return fieldErrors;
}

/** Invoice ids are UUIDs; anything else cannot exist, so it is a 404 rather than a DB error. */
export function parseInvoiceId(value: string): string {
  if (!UUID_PATTERN.test(value)) throw notFound();
  return value.toLowerCase();
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function payloadTooLarge() {
  return new AppError(413, "PAYLOAD_TOO_LARGE", "The request body is too large (max 100 KB).");
}
