# Folio: a customizable invoice generator

Folio is a browser-based invoice studio for small businesses. You fill in an editor on the left
and watch a true-to-scale sheet of US Letter paper update on the right. You can then save the
invoice, print it or save it as a PDF, and email a branded copy to your customer.

**Stack:** Next.js 16 (App Router + Route Handlers) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn/ui (Radix) · React Hook Form + Zod 4 · Supabase Postgres · Resend · Vitest

All data in this repository and in the demo is fictional.

![The editor with its live, true-to-scale preview](docs/screenshots/editor.png)

| Mobile: editing | Mobile: preview | The invoice email |
|---|---|---|
| <img src="docs/screenshots/mobile-edit.png" width="240" alt="Editor on a phone with a sticky total, Save and Send bar"> | <img src="docs/screenshots/mobile-preview.png" width="240" alt="Invoice preview reflowed for a phone"> | <img src="docs/screenshots/email.png" width="300" alt="Branded invoice email with amount due and line items"> |

---

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Setup in detail](#setup-in-detail)
- [How it works](#how-it-works)
- [Money and rounding](#money-and-rounding)
- [Validation and error handling](#validation-and-error-handling)
- [API reference](#api-reference)
- [Design notes](#design-notes)
- [Accessibility](#accessibility)
- [Security and privacy](#security-and-privacy)
- [Decisions and trade-offs](#decisions-and-trade-offs)
- [Testing](#testing)
- [AI tools used](#ai-tools-used)
- [Time spent](#time-spent)
- [Limitations and unfinished work](#limitations-and-unfinished-work)

---

## Features

| Brief | Where it lives |
|---|---|
| **Invoice editor:** business and customer details, invoice number, issue and due dates, notes | Editor sections *Who’s involved*, *Invoice details* (with Net 7/15/30 shortcuts) and *Notes & style* |
| **Line items:** add, edit and remove description, quantity and unit price | `line-items-section.tsx`. Removing a line can be undone from the toast, and focus moves sensibly. |
| **USD totals:** line totals, subtotal, fixed discount, percentage tax, grand total | `src/lib/calculate.ts`, one pure function used by the preview, the validation, the API and the email |
| **Custom fields:** add, edit, hide/show and remove; no effect on calculations | `custom-fields-section.tsx`. Hidden fields are filtered out before rendering, so they never reach the screen, the printer or the email. |
| **Live preview and PDF:** updates on edit; prints only the invoice | `live-preview.tsx` plus print rules in `globals.css`. The PDF file name defaults to the invoice number (“INV-0042”). |
| **Responsive and accessible:** labels, keyboard access, visible focus, contrast, validation | A split view from 1024 px up; below that, Edit/Preview toggles and a sticky action bar. See [Accessibility](#accessibility). |
| **Backend:** save and retrieve invoices | REST Route Handlers in `src/app/api`, with Supabase Postgres for storage |
| **Email** through a provider | `POST /api/invoices/:id/send` renders an HTML invoice and sends it with Resend |
| **No negatives; discount ≤ subtotal** | Enforced at four layers: the input, the shared Zod schema in the browser, the same schema on the server, and database `CHECK` constraints |
| **Check: 2 × $50 − $10 + 10% = $99.00** | A unit test, plus **Fill sample data**, which reproduces it in the UI |

Extras:
- Six curated accent colors, each at least 4.5:1 contrast on white.
- A public, printable customer view at `/invoices/:id/view`, linked from the email.
- An email activity log with masked recipients.
- A suggested next invoice number, with friendly handling of duplicates.
- Ctrl/⌘ + S to save.
- A warning before leaving with unsaved changes.

## Quick start

```bash
npm install
cp .env.example .env.local      # then fill in the four keys (see below)
# run supabase/migrations/20261019000000_init.sql in the Supabase SQL editor
npm run dev                     # http://localhost:3000
```

Other scripts:

| Script | What it does |
|---|---|
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build |
| `npm run format` | Prettier |

Requires Node 20.9 or newer (developed on Node 22).

If the environment variables or the database table are missing, the app shows a setup screen
explaining what to do instead of crashing.

## Setup in detail

### 1. Storage: Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste in
   [`supabase/migrations/20261019000000_init.sql`](supabase/migrations/20261019000000_init.sql)
   and run it. It creates:
   - the `invoices` and `invoice_emails` tables, with constraints and indexes;
   - an `updated_at` trigger;
   - the access rules: row-level security and grants.
3. Copy two values into `.env.local`:
   - **Project Settings → Data API → Project URL** → `SUPABASE_URL`
   - **Project Settings → API Keys → Secret keys** (`sb_secret_…`) → `SUPABASE_SECRET_KEY`

> New Supabase projects no longer grant table access to API roles automatically. The migration
> grants `service_role` (the role behind the secret key) explicitly, and *revokes* access from the
> browser-facing `anon` and `authenticated` roles.

*Optional, local:* with Docker and the Supabase CLI, `npx supabase start` applies the same
migration and prints a local URL and secret key.

### 2. Email: Resend

1. Create an account at [resend.com](https://resend.com) and an API key → `RESEND_API_KEY`.
2. Keep `EMAIL_FROM="Folio <onboarding@resend.dev>"` unless you have verified a domain.

> **Resend test mode:** without a verified domain, Resend only delivers to the email address of
> your Resend account. Resend's test inbox `delivered@resend.dev` also works and shows as
> delivered in the Resend dashboard. The send dialog has a one-click "Use Resend’s test inbox"
> link. If you try anyone else, the app explains the restriction instead of failing silently.

### 3. Environment variables

See [`.env.example`](.env.example); every variable is commented there.

None of them use the `NEXT_PUBLIC_` prefix, so none can reach the browser. They are validated
when first used: a missing or malformed value produces a clear message naming the variable.

## How it works

```
Browser
 ├─ page loads ──► Server Components ──► repository.ts ──► Supabase (secret key)
 └─ save/send/delete ──► /api/invoices/* Route Handlers ──► Zod ──► repository.ts ──► Supabase
                                     └─ /send ──► React Email render ──► Resend
Shared by browser and server: lib/calculate.ts · lib/money.ts · lib/invoice-schema.ts
```

- **Hybrid data access.**
  - Pages read on the server, through the same server-only repository the API uses, so reloading
    a saved invoice renders it immediately with no loading spinner.
  - Every write goes through the public REST API: create, update, delete and send.
- **One source of truth for rules.**
  - `invoice-schema.ts` validates in the browser through React Hook Form, and again in every route.
  - `calculate.ts` computes totals for the preview and the API. The server always recalculates;
    totals sent by a client are never trusted.
- **The paper.**
  - `InvoiceDocument` is a pure component used by the live preview, the customer view and print.
  - On wide screens it renders at real US Letter size, scaled with CSS `zoom`, so the preview
    and the printout match.
  - On phones it reflows with container queries instead of shrinking to unreadable text.
- **Email.**
  - The send endpoint loads the *saved* invoice from the database; if there are unsaved edits,
    the UI saves first.
  - The HTML template uses table layouts and inline styles for email clients, and includes only
    the visible custom fields.

Project layout:

```
src/
  app/                 pages, error and loading states, and the REST API (app/api/invoices)
  components/editor/   the editor: form fields, sections, send dialog, live preview
  components/invoice/  the invoice paper, the zoom-to-fit sheet, the status badge
  lib/                 shared, framework-free logic: money, totals, schema, dates (+ tests)
  server/              server-only code: env, Supabase client, repository, HTTP helpers, email
supabase/migrations/   the database schema
```

## Money and rounding

Amounts travel as **decimal strings**, exactly as typed (like Stripe’s `*_decimal` fields). They are
converted to **integers scaled by powers of ten**, using `BigInt`, so floating point never touches
money:

```
line     = roundHalfUp(quantity × unitPrice)   per line, to the cent
subtotal = Σ lines
taxable  = subtotal − discount                 (discount ≤ subtotal)
tax      = roundHalfUp(taxable × rate%)        after the discount, to the cent
total    = taxable + tax
```

The brief’s check, step by step:

| Step | Amount |
|---|---|
| 2 × $50.00 | $100.00 |
| − $10.00 discount | $90.00 |
| 10% tax | $9.00 |
| **Total** | **$99.00** |

More cases, all covered by tests in `src/lib/calculate.test.ts`:

| Input | Result | Why it matters |
|---|---|---|
| 1.5 × $9.99 | **$14.99** | $14.985 rounds half-up |
| Two lines of 0.5 × $0.01 | **$0.02** | Each line is rounded *before* summing; rounding the sum would give $0.01 |
| $15.99 at 8.875% | tax **$1.42** | Tax is rounded once, after the discount |

**Rounding:** commercial half-up.

**Input limits:**

| Field | Range | Decimal places |
|---|---|---|
| Quantity | greater than 0, up to 99,999.999 | up to 3 |
| Unit price | up to $999,999.99 | up to 2 |
| Tax rate | 0–100% | up to 3 |
| Line items | up to 100 | — |

These limits keep every result well inside JavaScript’s safe integer range.

## Validation and error handling

Problems are caught at four layers, from the most immediate to the most authoritative:

1. **At the keyboard.**
   - Money and quantity fields accept digits and one decimal point only.
   - A minus sign can’t be typed or pasted; a short notice explains why (also announced to
     screen readers).
   - There are no `type="number"` quirks such as scroll-wheel changes or `e` notation.
   - Phone numbers have a country code selector (US by default) and a digits-only number capped
     at the longest length that country allows. Pasting “+44 20 7946 0958” picks the country.
2. **In the form.** The shared Zod schema validates as you leave each field, with specific messages:
   - “Quantity must be greater than 0”
   - “Use at most 2 decimal places”
   - “Discount can’t exceed the subtotal ($100.00)”
   - “Due date can’t be before the issue date”
   - “United States numbers have 10 digits” (lengths come from libphonenumber’s metadata per
     country; numbers are stored as country + national digits and shown as +1 503 555 0142)

   Cross-field rules re-run when the fields they depend on change: editing a price re-checks the
   discount. A failed save shows an error summary that links to each field, focuses the first
   problem, and puts issue counts on the section headers.
3. **On the server.**
   - Every route re-validates with the same schema and returns field errors, which the form shows
     inline.
   - Malformed JSON gets 400; bodies over 100 KB get 413.
   - Unknown or malformed ids get 404.
4. **In the database.**
   - `CHECK` constraints: non-negative amounts, discount ≤ subtotal, due ≥ issue date.
   - A case-insensitive unique invoice number. A clash becomes a 409, shown on the field as
     “INV-0042 is already used — try INV-0043.”

All API errors share one shape: `{ "error": { "code", "message", "fieldErrors"? } }`.

- Unexpected failures are logged on the server and reported as a generic 500, so stack traces
  and database messages never leak.
- In the UI:
  - network failures and timeouts show a toast with **Retry**;
  - unknown routes get a friendly 404;
  - render errors get an error boundary with **Try again**.

## API reference

The API is public (no authentication, per the brief). All money values are decimal strings.

| Method | Path | Success | Errors |
|---|---|---|---|
| `GET` | `/api/invoices` | `200 { invoices: Summary[] }` | 500/503 |
| `POST` | `/api/invoices` | `201 { invoice }` + `Location` | 400, 409, 413, 422 |
| `GET` | `/api/invoices/:id` | `200 { invoice }` | 404 |
| `PUT` | `/api/invoices/:id` | `200 { invoice }` | 400, 404, 409, 422 |
| `DELETE` | `/api/invoices/:id` | `204` | 404 |
| `POST` | `/api/invoices/:id/send` | `200 { emailId, sentAt, activity }` | 404, 422, 429, 502, 503 |

`POST /send` takes `{ "to", "subject", "message" }`. It also accepts an optional
`Idempotency-Key` header: retrying with the same key never sends the email twice.

```bash
# Create the brief's example invoice → 201, totals.totalCents = 9900
curl -s -X POST http://localhost:3000/api/invoices -H "Content-Type: application/json" -d '{
  "invoiceNumber": "INV-1001", "issueDate": "2026-10-19", "dueDate": "2026-11-18",
  "business": { "name": "Fernleaf Studio", "email": "hello@fernleaf.example", "phoneCountry": "US", "phone": "", "address": "" },
  "customer": { "name": "Lumen & Co.", "email": "", "phoneCountry": "US", "phone": "", "address": "" },
  "lineItems": [{ "description": "Brand strategy workshop", "quantity": "2", "unitPrice": "50.00" }],
  "customFields": [{ "label": "PO number", "value": "PO-7781", "visible": true }],
  "notes": "", "discount": "10.00", "taxRate": "10", "accentColor": "#C2410C"
}'

# A negative quantity is rejected → 422
# { "error": { "code": "VALIDATION_FAILED", "fieldErrors": { "lineItems.0.quantity": "Quantity can't be negative" } } }
```

## Design notes

The direction is **editorial paper**: a calm stationery desk, where the invoice is a real sheet of
paper you are typesetting.

- **Palette:**

  | Role | Color |
  |---|---|
  | Canvas | warm bone `#F4F1EA`, with a faint grain |
  | Text | ink navy `#161B26` |
  | Accent | one vermilion, `#C2410C` |

  Text colors meet WCAG AA on the surfaces they sit on.
- **Type:** *Fraunces*, a soft optical-size serif, for headings, totals and the invoice title.
  *Inter* for the interface. Tabular figures for every amount, so columns line up.
- **Details:**
  - numbered editor sections;
  - a receipt-style running total;
  - a rubber-stamp DRAFT/SENT mark on the paper (screen only);
  - a monogram built from the business initials;
  - one-tap custom-field suggestions (PO number, Project, …);
  - small, purposeful motion, turned off under `prefers-reduced-motion`.
- **Layouts:**
  - From 1024 px up: a side-by-side editor and sticky preview.
  - Below that: an Edit/Preview toggle, line items as cards, and a sticky bottom bar with the
    running total, Save and Send.
- **Print:**
  - Only the paper prints, on US Letter with 0.5″ margins.
  - App chrome, hidden fields, the status stamp and placeholders are excluded.
  - Rows never split across pages, and table headers repeat on each page.

## Accessibility

- Every input has a visible `<label>`. Required fields are marked, and errors are linked with
  `aria-describedby` and `aria-invalid`.
- One clear focus style everywhere: a 2 px ink outline, or a dark border and ring on text fields.
- Fully keyboard operable:
  - dialogs trap and return focus;
  - adding a line focuses its description;
  - removing a line moves focus to the next one.
- Status is conveyed with text and icons, not color alone. Toasts and the save status are
  announced politely.
- Semantic landmarks, a skip link, and a real `<table>` with header cells in the invoice.

## Security and privacy

- **The secret key stays on the server.**
  - The Supabase secret key is only read by `import "server-only"` modules; importing them from
    client code fails the build.
  - Supabase also rejects secret keys sent from browsers.
- **Defense in depth on the database.**
  - Row-level security is enabled with no policies, and the browser roles have no grants, so
    even a leaked publishable key reads nothing.
- **The public send endpoint is guarded:**
  - an optional recipient allowlist (`EMAIL_ALLOWED_RECIPIENTS`);
  - a 30-second per-invoice cooldown;
  - an hourly cap;
  - idempotency keys.
- **Recipients are masked** (`de••••@resend.dev`) in API responses and the activity log.
- **Raw email-provider errors are never shown or stored.** Resend’s test-mode error includes the
  account owner’s address; the app replaces it with a safe explanation.

## Decisions and trade-offs

- **Integer cents and BigInt** instead of floating-point numbers. This is exact, and easy to
  reason about and test.
- **Decimal strings in the API** instead of JSON numbers. This avoids `0.1 + 0.2` problems at the
  boundary.
- **JSONB for line items and custom fields.**
  - Why: an invoice is a document, always read and written whole, so a single-row write is atomic
    without a multi-table transaction.
  - Trade-off: no per-item SQL reporting. I would normalize this if reporting were needed.
- **Browser print for PDFs** instead of server-side PDF generation.
  - Why: the brief allows it, and it gives a true WYSIWYG result with zero dependencies.
  - Trade-off: emails carry an HTML invoice and a link to the printable page, not a PDF
    attachment.
- **The Resend SDK** over raw SMTP, for typed errors, idempotency keys and simpler code.
- **React Email’s renderer only.** Its component packages were deprecated, so the email template
  uses a few hand-written table primitives with `@react-email/render`.
- **Cache Components off.** Every page shows live per-request data, so the classic dynamic model
  is simpler.
- **Quantity must be greater than 0; a price of $0 is allowed** (for complimentary items). Tax is
  capped at 100%.

## Testing

```bash
npm test
```

39 unit tests cover:
- the money helpers and totals (including the $99.00 check and the rounding edge cases);
- the shared validation rules;
- invoice numbering;
- email policies;
- Resend error mapping.

`npm run lint`, `npm run typecheck` and `npm run build` all pass.

The whole app was also exercised end-to-end against a real database: an isolated local Supabase
stack (`npx supabase start`, with this migration applied), plus a local stand-in for Resend’s API
(the Resend SDK honours `RESEND_BASE_URL`).

**39 API checks:**
- create, read, update and delete;
- every validation and error status (400, 404, 409, 413, 422, 429);
- duplicate numbers;
- idempotency keys forwarded to Resend;
- the send cooldown;
- the sandbox error being masked;
- hidden custom fields kept out of the email.

A separate probe confirmed that a request with no key is refused by Postgres (`42501`), which
proves the migration's grants work.

**27 browser checks in headless Chrome:**
- negative input blocked;
- inline errors and the error summary, with focus management;
- the sample invoice totalling $99.00;
- save, reload and the data persisting;
- print hiding everything but the paper, and producing a one-page PDF;
- the send flow;
- no horizontal scrolling at 390 px;
- no hydration warnings.

Real delivery through Resend needs your own API key; see the video for a live send.

## AI tools used

This project was built with **Claude Code** (Anthropic, Claude Opus 5.5) as a pair programmer.
Claude helped with planning, version research, implementation, tests and this README. Each step was
reviewed and verified by running the app, the tests, the type checker and the API checks above.

## Time spent

_To be filled in by the author before submission (the brief caps the exercise at 3 hours)._

## Limitations and unfinished work

- **No authentication or multi-tenancy (per the brief).** Anyone who can reach the API can list,
  edit or delete invoices, and the customer view relies on an unguessable UUID link. Next step:
  Supabase Auth with per-user row-level security policies.
- **Concurrent edits:** the last write wins. Next step: an `updated_at` precondition, returning
  409 when the invoice changed elsewhere.
- **Emails are sent only after you choose Send.** There are no scheduled reminders, no delivery
  webhooks (bounces, opens) and no PDF attachment.
- **Single currency (USD) and US Letter paper only.** No logo upload, no dark mode.
- **No payment tracking.** "Mark as paid" is a natural next status after Sent.
- **The end-to-end checks above were run as local scripts and aren’t part of this repository yet.**
  The next step is to port them to a Playwright suite in CI.
