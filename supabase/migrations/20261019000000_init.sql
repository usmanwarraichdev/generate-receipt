-- Folio invoice generator: initial schema.
-- Run once in the Supabase SQL editor (or with `supabase db push`).

-- ---------------------------------------------------------------------------------------------
-- Invoices
-- An invoice is a document that is always read and written as a whole, so line items and custom
-- fields live in JSONB columns: a single-row write is atomic without a multi-table transaction.
-- Money is stored as integer cents. Totals are computed by the API (src/lib/calculate.ts) and
-- stored so lists can show them without recalculating.
-- ---------------------------------------------------------------------------------------------
create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_number  text not null check (char_length(invoice_number) between 1 and 40),
  status          text not null default 'draft' check (status in ('draft', 'sent')),
  issue_date      date not null,
  due_date        date not null,
  business        jsonb not null check (jsonb_typeof(business) = 'object'),
  customer        jsonb not null check (jsonb_typeof(customer) = 'object'),
  line_items      jsonb not null check (jsonb_typeof(line_items) = 'array'),
  custom_fields   jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_fields) = 'array'),
  notes           text not null default '' check (char_length(notes) <= 2000),
  accent_color    text not null default '#C2410C' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  discount_cents  bigint not null default 0 check (discount_cents >= 0),
  tax_rate        numeric(6, 3) not null default 0 check (tax_rate between 0 and 100),
  subtotal_cents  bigint not null check (subtotal_cents >= 0),
  tax_cents       bigint not null check (tax_cents >= 0),
  total_cents     bigint not null check (total_cents >= 0),
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint invoices_discount_within_subtotal check (discount_cents <= subtotal_cents),
  constraint invoices_due_on_or_after_issue check (due_date >= issue_date)
);

-- Invoice numbers are unique regardless of case ("INV-0001" and "inv-0001" clash).
create unique index invoices_invoice_number_key on public.invoices (lower(invoice_number));
create index invoices_updated_at_idx on public.invoices (updated_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Email log: one row per delivery attempt. Powers the activity list and send rate limits.
-- ---------------------------------------------------------------------------------------------
create table public.invoice_emails (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  recipient    text not null,
  subject      text not null,
  provider_id  text,
  status       text not null check (status in ('sent', 'failed')),
  error        text,
  created_at   timestamptz not null default now()
);

create index invoice_emails_invoice_id_created_at_idx
  on public.invoice_emails (invoice_id, created_at desc);
create index invoice_emails_created_at_idx on public.invoice_emails (created_at);

-- ---------------------------------------------------------------------------------------------
-- Access control
-- The app only reaches the database from server code using the project's secret key (the
-- service_role). Row level security is enabled with no policies and the browser-facing roles get
-- no grants, so a leaked publishable key can read nothing. New Supabase projects no longer grant
-- table access automatically, so the service_role grant below is required.
-- ---------------------------------------------------------------------------------------------
alter table public.invoices enable row level security;
alter table public.invoice_emails enable row level security;

revoke all on table public.invoices, public.invoice_emails from anon, authenticated;
grant select, insert, update, delete on table public.invoices, public.invoice_emails to service_role;
