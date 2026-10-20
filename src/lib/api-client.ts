import type { Invoice, SendInvoiceResult } from "./invoice";
import type { InvoiceInput, SendInvoiceInput } from "./invoice-schema";

/** An error from our API (or the network), carrying field-level messages when there are any. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** True when the request may never have reached the server (safe to retry with the same key). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

interface ErrorBody {
  error?: { code?: string; message?: string; fieldErrors?: Record<string, string> };
}

async function request<T>(
  path: string,
  { method = "GET", body, headers, timeoutMs = 15_000 }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw controller.signal.aborted
      ? new ApiError(0, "TIMEOUT", "The server took too long to respond. Please try again.")
      : new ApiError(0, "NETWORK", "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as ErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? `Request failed (HTTP ${response.status}). Please try again.`,
      error?.fieldErrors,
    );
  }
  return payload as T;
}

export const invoicesApi = {
  create: (input: InvoiceInput) =>
    request<{ invoice: Invoice }>("/api/invoices", { method: "POST", body: input }),

  update: (id: string, input: InvoiceInput) =>
    request<{ invoice: Invoice }>(`/api/invoices/${id}`, { method: "PUT", body: input }),

  remove: (id: string) => request<void>(`/api/invoices/${id}`, { method: "DELETE" }),

  send: (id: string, input: SendInvoiceInput, idempotencyKey: string) =>
    request<SendInvoiceResult>(`/api/invoices/${id}/send`, {
      method: "POST",
      body: input,
      headers: { "Idempotency-Key": idempotencyKey },
      timeoutMs: 30_000,
    }),
};

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}
