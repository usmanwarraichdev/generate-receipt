"use client";

import { ExternalLink, MoreHorizontal, PencilLine, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/invoice/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { errorMessage, invoicesApi } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import type { InvoiceSummary } from "@/lib/invoice";
import { formatCents } from "@/lib/money";

export function InvoiceList({ invoices }: { invoices: InvoiceSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<InvoiceSummary | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return invoices;
    return invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(needle) ||
        invoice.customerName.toLowerCase().includes(needle),
    );
  }, [invoices, query]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await invoicesApi.remove(pendingDelete.id);
      toast.success(`Invoice ${pendingDelete.invoiceNumber} deleted`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <section aria-labelledby="all-invoices" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="all-invoices" className="font-display text-2xl tracking-tight">
          All invoices
        </h2>
        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/45"
          />
          <label htmlFor="invoice-search" className="sr-only">
            Search by invoice number or customer
          </label>
          <Input
            id="invoice-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search number or customer"
            className="pl-9"
          />
        </div>
      </div>

      <p role="status" className="sr-only">
        {query ? `${filtered.length} of ${invoices.length} invoices match` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-ink/15 px-6 py-10 text-center text-muted-foreground">
          No invoices match “{query}”.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          {/* Desktop: a real table */}
          <table className="hidden w-full text-left text-sm lg:table">
            <thead className="border-b border-line bg-muted/40">
              <tr className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                <th scope="col" className="px-5 py-3 font-semibold">
                  Invoice
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Customer
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Issued
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Due
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  Amount
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="w-14 px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="relative border-b border-line/70 transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-5 py-4">
                    {/* The link stretches over the whole row; the menu sits above it. */}
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-semibold text-ink after:absolute after:inset-0 after:content-['']"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="max-w-56 truncate px-5 py-4 text-ink">{invoice.customerName}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="px-5 py-4 text-right font-medium whitespace-nowrap text-ink tabular-nums">
                    {formatCents(invoice.totalCents)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="relative z-10 px-3 py-4">
                    <RowActions invoice={invoice} onDelete={() => setPendingDelete(invoice)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: cards */}
          <ul className="divide-y divide-line/70 lg:hidden">
            {filtered.map((invoice) => (
              <li
                key={invoice.id}
                className="relative grid grid-cols-[minmax(0,1fr)] gap-1 px-4 py-4"
              >
                <div className="flex items-start gap-2">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="min-w-0 flex-1 truncate font-semibold text-ink after:absolute after:inset-0 after:content-['']"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                  <div className="relative z-10 -mt-1.5 -mr-2 shrink-0">
                    <RowActions invoice={invoice} onDelete={() => setPendingDelete(invoice)} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-ink">{invoice.customerName}</p>
                  <StatusBadge status={invoice.status} />
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-xs text-muted-foreground">Due {formatDate(invoice.dueDate)}</p>
                  <p className="ml-auto min-w-0 text-right font-display text-lg [overflow-wrap:anywhere] text-ink tabular-nums">
                    {formatCents(invoice.totalCents)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-normal">
              Delete {pendingDelete?.invoiceNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The invoice and its email history will be permanently removed. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invoice</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>
              <Trash2 aria-hidden />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function RowActions({ invoice, onDelete }: { invoice: InvoiceSummary; onDelete: () => void }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${invoice.invoiceNumber}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/invoices/${invoice.id}`}>
            <PencilLine aria-hidden />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/invoices/${invoice.id}/view`} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden />
            Customer view
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
