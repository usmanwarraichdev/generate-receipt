"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, LoaderCircle, Send } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, errorMessage } from "@/lib/api-client";
import { LIMITS, sendInvoiceSchema, type SendInvoiceInput } from "@/lib/invoice-schema";
import { CharacterCount, FieldShell, describedBy, withCount } from "./form-fields";

const TEST_INBOX = "delivered@resend.dev";

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  defaults: SendInvoiceInput;
  replyTo: string;
  /** The form has unsaved edits (or was never saved): the button saves first. */
  needsSave: boolean;
  /** Saves if needed, then sends. Resolves false if saving failed; throws ApiError on send errors. */
  onSend: (input: SendInvoiceInput, idempotencyKey: string) => Promise<boolean>;
}

export function SendInvoiceDialog({ open, onOpenChange, ...props }: SendInvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {/* Mounted only while open, so every opening starts fresh. */}
        <SendInvoiceForm {...props} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SendInvoiceForm({
  invoiceNumber,
  defaults,
  replyTo,
  needsSave,
  onSend,
  onClose,
}: Omit<SendInvoiceDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const form = useForm<SendInvoiceInput>({
    resolver: zodResolver(sendInvoiceSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  // One key per attempt: retries after a network failure reuse it, so Resend never sends twice.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [serverError, setServerError] = useState<string | null>(null);
  const { errors, isSubmitting } = form.formState;
  const toValue = useWatch({ control: form.control, name: "to" }) ?? "";

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (await onSend(values, idempotencyKey)) onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors.to)
          form.setError("to", { type: "server", message: error.fieldErrors.to });
        // The server answered, so this attempt is finished; a retry is a new attempt.
        if (!error.isNetworkError) setIdempotencyKey(crypto.randomUUID());
      }
      setServerError(errorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl font-normal">
          Send invoice {invoiceNumber}
        </DialogTitle>
        <DialogDescription>
          Your customer gets a branded summary with a link to view, print or download the full
          invoice.
        </DialogDescription>
      </DialogHeader>

      {serverError && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/25 bg-destructive/[0.05] p-3 text-sm text-destructive"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>{serverError}</p>
        </div>
      )}

      <FieldShell
        id="send-to"
        label="To"
        required
        error={errors.to?.message}
        hint={withCount(
          <>
            Testing?{" "}
            <button
              type="button"
              className="font-medium text-ink underline underline-offset-2"
              onClick={() =>
                form.setValue("to", TEST_INBOX, { shouldValidate: true, shouldDirty: true })
              }
            >
              Use Resend’s test inbox
            </button>{" "}
            or the email on your Resend account.
          </>,
          <CharacterCount length={toValue.length} max={LIMITS.email} always />,
        )}
      >
        <Input
          id="send-to"
          type="email"
          autoComplete="email"
          placeholder="customer@company.com"
          maxLength={LIMITS.email}
          aria-invalid={errors.to ? true : undefined}
          aria-describedby={describedBy("send-to", errors.to?.message, true)}
          aria-required
          {...form.register("to")}
        />
      </FieldShell>

      <FieldShell id="send-subject" label="Subject" required error={errors.subject?.message}>
        <Input
          id="send-subject"
          autoComplete="off"
          maxLength={LIMITS.emailSubject}
          aria-invalid={errors.subject ? true : undefined}
          aria-describedby={describedBy("send-subject", errors.subject?.message)}
          aria-required
          {...form.register("subject")}
        />
      </FieldShell>

      <FieldShell
        id="send-message"
        label="Message"
        error={errors.message?.message}
        hint={`Optional. Up to ${LIMITS.emailMessage.toLocaleString("en-US")} characters.`}
      >
        <Textarea
          id="send-message"
          rows={3}
          placeholder="Add a personal note (optional)"
          maxLength={LIMITS.emailMessage}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy("send-message", errors.message?.message, true)}
          {...form.register("message")}
        />
      </FieldShell>

      <p className="text-xs text-muted-foreground">
        {replyTo ? (
          <>
            Replies go to <span className="font-medium text-ink">{replyTo}</span>.
          </>
        ) : (
          "Add your business email to receive replies."
        )}
        {needsSave && " Your latest changes will be saved before sending."}
      </p>

      <DialogFooter className="-mx-4 -mb-4 sm:-mx-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <Send aria-hidden />
          )}
          {isSubmitting ? "Sending…" : needsSave ? "Save & send" : "Send invoice"}
        </Button>
      </DialogFooter>
    </form>
  );
}
