"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronRight,
  ExternalLink,
  Eye,
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  Printer,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand/wordmark";
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
import { ApiError, errorMessage, invoicesApi } from "@/lib/api-client";
import { calculateTotals } from "@/lib/calculate";
import { addDays, daysBetween, formatDate, todayIso } from "@/lib/dates";
import { flattenErrors } from "@/lib/form-errors";
import {
  toInvoiceInput,
  type EmailActivity,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/invoice";
import { invoiceInputSchema, type InvoiceInput, type SendInvoiceInput } from "@/lib/invoice-schema";
import { maskEmail } from "@/lib/mask-email";
import { formatCents } from "@/lib/money";
import { createSampleInvoice } from "@/lib/sample-invoice";
import { cn } from "@/lib/utils";
import { ActivityCard } from "./activity-card";
import { ErrorSummary } from "./error-summary";
import { LivePreview } from "./live-preview";
import { SaveStatus, type SaveState } from "./save-status";
import { CustomFieldsSection } from "./sections/custom-fields-section";
import { DetailsSection } from "./sections/details-section";
import { LineItemsSection } from "./sections/line-items-section";
import { NotesSection } from "./sections/notes-section";
import { PartiesSection } from "./sections/parties-section";
import { TotalsSection } from "./sections/totals-section";
import { SendInvoiceDialog } from "./send-invoice-dialog";

interface InvoiceEditorProps {
  /** The saved invoice being edited; omitted for a new one. */
  invoice?: Invoice;
  initialValues: InvoiceInput;
  activity?: EmailActivity[];
}

interface SavedInvoice {
  id: string;
  status: InvoiceStatus;
}

const UNSAVED_WARNING = "You have unsaved changes. Leave without saving?";

export function InvoiceEditor({
  invoice,
  initialValues,
  activity: initialActivity = [],
}: InvoiceEditorProps) {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedInvoice | null>(
    invoice ? { id: invoice.id, status: invoice.status } : null,
  );
  const [activity, setActivity] = useState(initialActivity);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [sendOpen, setSendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceInputSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });
  const { isDirty, isSubmitting, errors, submitCount } = form.formState;

  // New invoices are server-rendered with the server's date; switch to the viewer's local date.
  useEffect(() => {
    if (invoice) return;
    const values = form.getValues();
    const today = todayIso();
    if (values.issueDate === today || form.getFieldState("issueDate").isDirty) return;
    const termsDays = daysBetween(values.issueDate, values.dueDate);
    form.reset({ ...values, issueDate: today, dueDate: addDays(today, termsDays) });
  }, [form, invoice]);

  /* ------------------------------------------------------------------------------------------ */
  /* Saving                                                                                     */
  /* ------------------------------------------------------------------------------------------ */

  const retrySaveRef = useRef<() => void>(() => {});

  const showSaveError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        // Server-side validation (e.g. a duplicate invoice number) shows inline, like client errors.
        const paths = Object.keys(error.fieldErrors) as FieldPath<InvoiceInput>[];
        for (const path of paths) {
          form.setError(path, { type: "server", message: error.fieldErrors[path] });
        }
        form.setFocus(paths[0]);
        toast.error(error.message, { id: "save-error" });
        return;
      }
      toast.error(errorMessage(error), {
        id: "save-error",
        action: { label: "Retry", onClick: () => retrySaveRef.current() },
      });
    },
    [form],
  );

  const persist = useCallback(
    async (values: InvoiceInput): Promise<Invoice | null> => {
      const submitted = JSON.stringify(form.getValues());
      try {
        const { invoice: result } = saved
          ? await invoicesApi.update(saved.id, values)
          : await invoicesApi.create(values);
        // Load the server's normalized copy, unless the user kept typing while we were saving.
        const typedDuringSave = JSON.stringify(form.getValues()) !== submitted;
        form.reset(toInvoiceInput(result), typedDuringSave ? { keepValues: true } : undefined);
        setSaved({ id: result.id, status: result.status });
        if (!saved) window.history.replaceState(null, "", `/invoices/${result.id}`);
        toast.success(saved ? "Invoice saved" : `Invoice ${result.invoiceNumber} created`, {
          id: "save-error",
        });
        return result;
      } catch (error) {
        showSaveError(error);
        return null;
      }
    },
    [form, saved, showSaveError],
  );

  const onInvalid = useCallback((formErrors: FieldErrors<InvoiceInput>) => {
    const count = flattenErrors(formErrors).length;
    toast.error(
      count === 1
        ? "1 field needs attention before saving."
        : `${count} fields need attention before saving.`,
      { id: "save-error" },
    );
  }, []);

  const save = useCallback(async (): Promise<Invoice | null> => {
    let result: Invoice | null = null;
    await form.handleSubmit(async (values) => {
      result = await persist(values);
    }, onInvalid)();
    return result;
  }, [form, persist, onInvalid]);

  useEffect(() => {
    retrySaveRef.current = () => void save();
  }, [save]);

  /* ------------------------------------------------------------------------------------------ */
  /* Sending, deleting, sample data, printing                                                   */
  /* ------------------------------------------------------------------------------------------ */

  const handleSend = useCallback(
    async (input: SendInvoiceInput, idempotencyKey: string): Promise<boolean> => {
      let id = saved?.id;
      if (!id || form.formState.isDirty) {
        const result = await save();
        if (!result) {
          setSendOpen(false); // reveal the invalid fields
          return false;
        }
        id = result.id;
      }
      const result = await invoicesApi.send(id, input, idempotencyKey);
      setSaved((current) => (current ? { ...current, status: "sent" } : current));
      setActivity((items) => [result.activity, ...items]);
      toast.success(`Invoice emailed to ${maskEmail(input.to)}`);
      return true;
    },
    [form, save, saved],
  );

  async function handleDelete() {
    if (!saved) return;
    try {
      await invoicesApi.remove(saved.id);
      form.reset(form.getValues()); // nothing left to lose; skip the unsaved-changes prompt
      toast.success(`Invoice ${form.getValues("invoiceNumber")} deleted`);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function fillSample() {
    if (isDirty && !window.confirm("Replace your current changes with sample data?")) return;
    form.reset(createSampleInvoice(form.getValues("invoiceNumber"), todayIso()), {
      keepDefaultValues: true,
    });
    toast("Sample invoice loaded", {
      description: "2 × $50.00 − $10.00 discount + 10% tax = $99.00",
    });
  }

  function openSendDialog() {
    if (form.getValues("lineItems").length === 0) {
      toast.error("Add at least one line item before sending.");
      return;
    }
    setSendOpen(true);
  }

  // Name the printout/PDF after the invoice number ("INV-0042.pdf") for Ctrl+P and our button.
  useEffect(() => {
    let previousTitle = document.title;
    const beforePrint = () => {
      previousTitle = document.title;
      document.title = form.getValues("invoiceNumber").trim() || "Invoice";
    };
    const afterPrint = () => {
      document.title = previousTitle;
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [form]);

  // Ctrl/⌘ + S saves.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function confirmLeave(event: MouseEvent) {
    if (isDirty && !window.confirm(UNSAVED_WARNING)) event.preventDefault();
  }

  const saveState: SaveState = isSubmitting
    ? "saving"
    : isDirty
      ? "unsaved"
      : saved
        ? "saved"
        : "new";
  const status = saved?.status ?? "draft";
  const flatErrors = submitCount > 0 ? flattenErrors(errors) : [];

  return (
    <FormProvider {...form}>
      <EditorHeader
        status={status}
        saveState={saveState}
        isSaving={isSubmitting}
        viewUrl={saved ? `/invoices/${saved.id}/view` : undefined}
        onSave={() => void save()}
        onSend={openSendDialog}
        onPrint={() => window.print()}
        onFillSample={fillSample}
        onDelete={saved ? () => setDeleteOpen(true) : undefined}
        onLeave={confirmLeave}
      />
      <ViewSwitcher view={view} onChange={setView} />

      <main id="main" className="pb-28 lg:pb-0 print:p-0">
        <div className="mx-auto grid max-w-[1680px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          <form
            noValidate
            aria-label="Invoice editor"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            className={cn(
              "min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10 print:hidden",
              view === "preview" && "max-lg:hidden",
            )}
          >
            <div className="mx-auto grid max-w-3xl gap-6">
              <EditorTitle isSaved={Boolean(saved)} onFillSample={fillSample} />
              <ErrorSummary errors={flatErrors} submitCount={submitCount} />
              <PartiesSection />
              <DetailsSection />
              <LineItemsSection />
              <TotalsSection />
              <CustomFieldsSection />
              <NotesSection />
              {saved && <ActivityCard activity={activity} />}
            </div>
          </form>

          <aside
            aria-label="Invoice preview"
            className={cn(
              "min-w-0 border-line bg-desk/70 px-3 py-6 sm:px-6 lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:border-l lg:px-10 lg:py-10",
              "print:static print:block! print:h-auto print:overflow-visible print:border-0 print:bg-transparent print:p-0",
              view === "edit" && "max-lg:hidden",
            )}
          >
            <div className="mx-auto mb-4 flex max-w-[816px] items-center justify-between gap-3 print:hidden">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Live preview
              </p>
              <p className="text-xs text-muted-foreground">US Letter · prints exactly as shown</p>
            </div>
            <LivePreview status={status} />
          </aside>
        </div>
      </main>

      <MobileActionBar isSaving={isSubmitting} onSave={() => void save()} onSend={openSendDialog} />

      <SendDialogContainer
        open={sendOpen}
        onOpenChange={setSendOpen}
        needsSave={!saved || isDirty}
        onSend={handleSend}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-normal">
              Delete this invoice?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {form.getValues("invoiceNumber")} and its email history will be permanently removed.
              This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invoice</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>
              <Trash2 aria-hidden />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
}

/* -------------------------------------------------------------------------------------------- */
/* Pieces                                                                                       */
/* -------------------------------------------------------------------------------------------- */

interface EditorHeaderProps {
  status: InvoiceStatus;
  saveState: SaveState;
  isSaving: boolean;
  viewUrl?: string;
  onSave: () => void;
  onSend: () => void;
  onPrint: () => void;
  onFillSample: () => void;
  onDelete?: () => void;
  onLeave: (event: MouseEvent) => void;
}

function EditorHeader({
  status,
  saveState,
  isSaving,
  viewUrl,
  onSave,
  onSend,
  onPrint,
  onFillSample,
  onDelete,
  onLeave,
}: EditorHeaderProps) {
  const { control } = useFormContext<InvoiceInput>();
  const invoiceNumber = useWatch({ control, name: "invoiceNumber" });

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          onClick={onLeave}
          className="shrink-0 rounded-md"
          aria-label="Folio, all invoices"
        >
          <Wordmark />
        </Link>
        <nav
          aria-label="Breadcrumb"
          className="hidden min-w-0 items-center gap-1.5 text-sm md:flex"
        >
          <ChevronRight aria-hidden className="size-4 text-ink/30" />
          <Link href="/" onClick={onLeave} className="rounded text-muted-foreground hover:text-ink">
            Invoices
          </Link>
          <ChevronRight aria-hidden className="size-4 text-ink/30" />
          <span aria-current="page" className="truncate font-medium text-ink">
            {invoiceNumber || "New invoice"}
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SaveStatus state={saveState} />
          <StatusBadge status={status} className="hidden sm:inline-flex" />
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="outline" onClick={onPrint}>
              <Printer aria-hidden />
              Print / PDF
            </Button>
            <Button
              variant="outline"
              onClick={onSave}
              disabled={isSaving}
              aria-keyshortcuts="Control+S Meta+S"
            >
              {isSaving ? (
                <LoaderCircle aria-hidden className="animate-spin" />
              ) : (
                <Save aria-hidden />
              )}
              Save
            </Button>
            <Button variant="brand" onClick={onSend}>
              <Send aria-hidden />
              Send
            </Button>
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onSelect={onFillSample}>
                <Sparkles aria-hidden />
                Fill with sample data
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onPrint}>
                <Printer aria-hidden />
                Print / Save as PDF
              </DropdownMenuItem>
              {viewUrl && (
                <DropdownMenuItem asChild>
                  <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden />
                    Open customer view
                  </a>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 aria-hidden />
                    Delete invoice
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function EditorTitle({ isSaved, onFillSample }: { isSaved: boolean; onFillSample: () => void }) {
  const { control } = useFormContext<InvoiceInput>();
  const [invoiceNumber, customerName] = useWatch({
    control,
    name: ["invoiceNumber", "customer.name"],
  });

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
          {isSaved ? "Editing invoice" : "New invoice"}
        </p>
        <h1 className="mt-1.5 truncate font-display text-4xl tracking-tight text-ink sm:text-[2.75rem]">
          <span className="sr-only">{isSaved ? "Edit invoice " : "New invoice "}</span>
          {invoiceNumber || "Untitled"}
        </h1>
        {customerName.trim() && <p className="mt-1 text-muted-foreground">for {customerName}</p>}
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={onFillSample}>
        <Sparkles aria-hidden />
        Fill sample data
      </Button>
    </div>
  );
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view: "edit" | "preview";
  onChange: (view: "edit" | "preview") => void;
}) {
  const options = [
    { value: "edit", label: "Edit", Icon: PencilLine },
    { value: "preview", label: "Preview", Icon: Eye },
  ] as const;

  return (
    <div className="sticky top-16 z-30 border-b border-line/80 bg-canvas/90 px-4 py-2 backdrop-blur-md lg:hidden print:hidden">
      <div
        role="group"
        aria-label="Show"
        className="mx-auto grid max-w-sm grid-cols-2 rounded-lg bg-ink/[0.06] p-1"
      >
        {options.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => {
              onChange(value);
              window.scrollTo({ top: 0 });
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium text-ink/70 transition-colors aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileActionBar({
  isSaving,
  onSave,
  onSend,
}: {
  isSaving: boolean;
  onSave: () => void;
  onSend: () => void;
}) {
  const { control } = useFormContext<InvoiceInput>();
  const [lineItems, discount, taxRate] = useWatch({
    control,
    name: ["lineItems", "discount", "taxRate"],
  });
  const { totalCents } = calculateTotals({ lineItems, discount, taxRate });
  const total = formatCents(totalCents);
  // Large totals step down in size so the whole amount stays visible beside the buttons.
  const totalSize = total.length <= 10 ? "text-xl" : total.length <= 14 ? "text-lg" : "text-sm";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden print:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Total due
          </p>
          <p
            title={total}
            className={cn("truncate font-display leading-tight text-ink tabular-nums", totalSize)}
          >
            {total}
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={onSave} disabled={isSaving}>
          {isSaving ? <LoaderCircle aria-hidden className="animate-spin" /> : <Save aria-hidden />}
          Save
        </Button>
        <Button variant="brand" size="lg" onClick={onSend}>
          <Send aria-hidden />
          Send
        </Button>
      </div>
    </div>
  );
}

/** Builds the dialog's defaults from the current form values each time it opens. */
function SendDialogContainer({
  open,
  onOpenChange,
  needsSave,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  needsSave: boolean;
  onSend: (input: SendInvoiceInput, idempotencyKey: string) => Promise<boolean>;
}) {
  const { getValues } = useFormContext<InvoiceInput>();
  if (!open)
    return (
      <SendInvoiceDialog
        open={false}
        onOpenChange={onOpenChange}
        {...EMPTY_SEND_PROPS}
        onSend={onSend}
      />
    );

  const invoice = getValues();
  const { totalCents } = calculateTotals(invoice);
  const dueDate = formatDate(invoice.dueDate);
  const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.business.name || "us"} · ${formatCents(totalCents)}${dueDate ? ` due ${dueDate}` : ""}`;

  return (
    <SendInvoiceDialog
      open
      onOpenChange={onOpenChange}
      invoiceNumber={invoice.invoiceNumber}
      defaults={{ to: invoice.customer.email, subject, message: "" }}
      replyTo={invoice.business.email}
      needsSave={needsSave}
      onSend={onSend}
    />
  );
}

const EMPTY_SEND_PROPS = {
  invoiceNumber: "",
  defaults: { to: "", subject: "", message: "" },
  replyTo: "",
  needsSave: false,
};
