import { AppError } from "../errors";

/** The `error` object returned by `resend.emails.send()` (the SDK never throws). */
export interface ProviderError {
  name: string;
  message: string;
  statusCode: number | null;
}

/**
 * Turns a Resend error into a message people can act on. The provider's own message is kept as
 * the `cause` for server logs only: it can contain the account owner's email address.
 */
export function mapResendError(error: ProviderError): AppError {
  const cause = error;

  if (error.statusCode === 403 || /testing emails|verify a domain/i.test(error.message)) {
    return new AppError(
      422,
      "EMAIL_REJECTED",
      "Resend is in test mode, so it only delivers to your Resend account's own address (or delivered@resend.dev). Verify a domain in Resend to email anyone else.",
      { fieldErrors: { to: "Resend's test mode can't deliver to this address." }, cause },
    );
  }

  switch (error.name) {
    case "rate_limit_exceeded":
      return new AppError(
        429,
        "RATE_LIMITED",
        "The email service is busy. Please try again in a few seconds.",
        {
          retryAfterSeconds: 5,
          cause,
        },
      );
    case "daily_quota_exceeded":
    case "monthly_quota_exceeded":
      return new AppError(
        429,
        "RATE_LIMITED",
        "This account's email quota has been reached. Please try again later.",
        {
          retryAfterSeconds: 3600,
          cause,
        },
      );
    case "missing_api_key":
    case "invalid_api_key":
    case "restricted_api_key":
    case "invalid_from_address":
    case "invalid_access":
      return new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email isn't configured correctly on the server. Check RESEND_API_KEY and EMAIL_FROM.",
        { cause },
      );
    case "validation_error":
    case "invalid_parameter":
    case "missing_required_field":
      return new AppError(
        422,
        "EMAIL_REJECTED",
        "The email service rejected this message. Check the recipient address and try again.",
        { cause },
      );
    case "concurrent_idempotent_requests":
    case "invalid_idempotent_request":
      return new AppError(
        409,
        "CONFLICT",
        "This email is already being sent. Please wait a moment and try again.",
        {
          cause,
        },
      );
    default:
      return new AppError(
        502,
        "EMAIL_UNAVAILABLE",
        "We couldn't reach the email service. Please try again in a minute.",
        {
          cause,
        },
      );
  }
}
