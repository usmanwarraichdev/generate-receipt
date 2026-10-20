import "server-only";
import { cache } from "react";
import { AppError } from "./errors";
import { getInvoice } from "./invoices/repository";

/** Deduplicates the invoice lookup between generateMetadata and the page in one request. */
export const loadInvoice = cache(getInvoice);

/**
 * Runs a page's data loader. A missing configuration (no .env.local yet, migration not run) is
 * returned as a message for a friendly setup screen instead of a generic error page.
 */
export async function loadPageData<T>(
  load: () => Promise<T>,
): Promise<{ data: T; setupMessage?: undefined } | { data?: undefined; setupMessage: string }> {
  try {
    return { data: await load() };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_CONFIGURED")
      return { setupMessage: error.message };
    throw error;
  }
}
