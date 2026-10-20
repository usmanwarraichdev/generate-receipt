import type { InvoiceStatus } from "@/lib/invoice";
import type { CustomField, LineItem, Party } from "@/lib/invoice-schema";

/**
 * Hand-written types for the two tables in supabase/migrations. (In a larger project these would
 * be generated with `supabase gen types typescript`.) Type aliases rather than interfaces, so they
 * satisfy supabase-js's Record<string, unknown> row constraint.
 */

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  business: Party;
  customer: Party;
  line_items: LineItem[];
  custom_fields: CustomField[];
  notes: string;
  accent_color: string;
  discount_cents: number;
  tax_rate: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type ServerManaged = "id" | "status" | "sent_at" | "created_at" | "updated_at";
export type InvoiceInsert = Omit<InvoiceRow, ServerManaged> &
  Partial<Pick<InvoiceRow, ServerManaged>>;

export type InvoiceEmailRow = {
  id: string;
  invoice_id: string;
  recipient: string;
  subject: string;
  provider_id: string | null;
  status: "sent" | "failed";
  error: string | null;
  created_at: string;
};

type EmailOptional = "id" | "provider_id" | "error" | "created_at";
export type InvoiceEmailInsert = Omit<InvoiceEmailRow, EmailOptional> &
  Partial<Pick<InvoiceEmailRow, EmailOptional>>;

export type Database = {
  public: {
    Tables: {
      invoices: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: Partial<InvoiceRow>;
        Relationships: [];
      };
      invoice_emails: {
        Row: InvoiceEmailRow;
        Insert: InvoiceEmailInsert;
        Update: Partial<InvoiceEmailRow>;
        Relationships: [
          {
            foreignKeyName: "invoice_emails_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
