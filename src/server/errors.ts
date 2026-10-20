export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "EMAIL_REJECTED"
  | "EMAIL_UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL";

export interface AppErrorOptions {
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number;
  cause?: unknown;
}

/**
 * An error whose message is safe to show to API clients. Anything that is not an AppError is
 * logged and replaced with a generic 500 response, so internals never leak.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fieldErrors?: Record<string, string>;
  readonly retryAfterSeconds?: number;

  constructor(status: number, code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fieldErrors = options.fieldErrors;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export const badRequest = (message: string) => new AppError(400, "BAD_REQUEST", message);

export const notFound = (message = "We couldn't find that invoice.") =>
  new AppError(404, "NOT_FOUND", message);

export const validationFailed = (
  fieldErrors: Record<string, string>,
  message = "Some fields need attention.",
) => new AppError(422, "VALIDATION_FAILED", message, { fieldErrors });

export const tooManyRequests = (message: string, retryAfterSeconds: number) =>
  new AppError(429, "RATE_LIMITED", message, { retryAfterSeconds });

export const notConfigured = (message: string) => new AppError(503, "NOT_CONFIGURED", message);
