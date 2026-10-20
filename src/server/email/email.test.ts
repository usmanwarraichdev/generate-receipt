import { describe, expect, it } from "vitest";
import { formatSender, isRecipientAllowed, parseIdempotencyKey } from "./policy";
import { mapResendError } from "./resend-errors";

describe("formatSender", () => {
  it("shows the business name and keeps the configured address", () => {
    expect(formatSender("Folio <onboarding@resend.dev>", "Fernleaf Studio")).toBe(
      '"Fernleaf Studio via Folio" <onboarding@resend.dev>',
    );
    expect(formatSender("billing@acme.example", "Acme")).toBe(
      '"Acme via Folio" <billing@acme.example>',
    );
  });

  it("strips characters that could break the header", () => {
    expect(formatSender("Folio <a@b.co>", 'Evil "Co" <x>\r\nBcc: y')).toBe(
      '"Evil Co xBcc: y via Folio" <a@b.co>',
    );
  });
});

describe("isRecipientAllowed", () => {
  it("allows anyone when the list is empty", () => {
    expect(isRecipientAllowed("someone@example.com", "")).toBe(true);
  });

  it("matches exact addresses and @domains, case-insensitively", () => {
    const allowlist = "me@example.com, @resend.dev";
    expect(isRecipientAllowed("ME@example.com", allowlist)).toBe(true);
    expect(isRecipientAllowed("delivered@resend.dev", allowlist)).toBe(true);
    expect(isRecipientAllowed("other@example.com", allowlist)).toBe(false);
  });
});

describe("parseIdempotencyKey", () => {
  it("accepts UUID-like keys only", () => {
    expect(parseIdempotencyKey("3f1c2b7e-9a4d-4c3b-8f0e-2d6a1b9c7e55")).not.toBeNull();
    expect(parseIdempotencyKey("short")).toBeNull();
    expect(parseIdempotencyKey("has spaces in it")).toBeNull();
    expect(parseIdempotencyKey(null)).toBeNull();
  });
});

describe("mapResendError", () => {
  it("explains the sandbox restriction without leaking the provider message", () => {
    const error = mapResendError({
      name: "validation_error",
      statusCode: 403,
      message:
        "You can only send testing emails to your own email address (owner@private.example).",
    });
    expect(error.status).toBe(422);
    expect(error.code).toBe("EMAIL_REJECTED");
    expect(error.message).not.toContain("owner@private.example");
    expect(error.fieldErrors?.to).toBeDefined();
  });

  it("maps rate limits, configuration problems and outages", () => {
    expect(
      mapResendError({ name: "rate_limit_exceeded", statusCode: 429, message: "" }).status,
    ).toBe(429);
    expect(mapResendError({ name: "invalid_api_key", statusCode: 400, message: "" }).status).toBe(
      503,
    );
    expect(
      mapResendError({ name: "internal_server_error", statusCode: 500, message: "" }).status,
    ).toBe(502);
  });
});
