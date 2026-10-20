import "server-only";
import { z } from "zod";
import { notConfigured } from "./errors";

/**
 * Server-only configuration. None of these variables use the NEXT_PUBLIC_ prefix, so Next.js
 * never ships them to the browser. They are validated lazily, so the app can still build and
 * show a helpful setup message when something is missing.
 */

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const required = (name: string, hint: string) =>
  z.preprocess(blankToUndefined, z.string({ error: `${name} is not set (${hint})` }));

const databaseEnvSchema = z.object({
  SUPABASE_URL: z.preprocess(
    blankToUndefined,
    z.url({
      error: (issue) =>
        issue.input === undefined
          ? "SUPABASE_URL is not set (Supabase → Project Settings → Data API)"
          : "SUPABASE_URL must look like https://your-project.supabase.co",
    }),
  ),
  SUPABASE_SECRET_KEY: required("SUPABASE_SECRET_KEY", "Supabase → Project Settings → API Keys"),
});

const emailEnvSchema = z.object({
  RESEND_API_KEY: required("RESEND_API_KEY", "resend.com → API Keys"),
  EMAIL_FROM: z.preprocess(blankToUndefined, z.string().default("Folio <onboarding@resend.dev>")),
  EMAIL_ALLOWED_RECIPIENTS: z.preprocess(blankToUndefined, z.string().default("")),
  EMAIL_HOURLY_LIMIT: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().positive().default(20),
  ),
  APP_URL: z.preprocess(
    blankToUndefined,
    z
      .url({ error: "APP_URL must be an absolute URL like https://invoices.example.com" })
      .optional(),
  ),
});

export type DatabaseEnv = z.output<typeof databaseEnvSchema>;
export type EmailEnv = z.output<typeof emailEnvSchema>;

function load<Schema extends z.ZodType>(schema: Schema, purpose: string): z.output<Schema> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => issue.message).join("; ");
    throw notConfigured(
      `The server isn't configured for ${purpose}: ${problems}. Copy .env.example to .env.local, fill it in and restart.`,
    );
  }
  return result.data;
}

let databaseEnv: DatabaseEnv | undefined;
let emailEnv: EmailEnv | undefined;

export function getDatabaseEnv(): DatabaseEnv {
  databaseEnv ??= load(databaseEnvSchema, "storage");
  return databaseEnv;
}

export function getEmailEnv(): EmailEnv {
  emailEnv ??= load(emailEnvSchema, "email");
  return emailEnv;
}
