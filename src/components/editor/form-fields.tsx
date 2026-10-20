"use client";

import { ChevronDown, CircleAlert } from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  useController,
  useFormContext,
  type FieldPath,
  type FieldPathByValue,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exceedsMax, sanitizeDecimalInput } from "@/lib/decimal-input";
import { fieldId } from "@/lib/form-errors";
import type { DecimalRule, InvoiceInput } from "@/lib/invoice-schema";
import {
  PHONE_COUNTRY_OPTIONS,
  dialCode,
  parseInternationalInput,
  phoneLengths,
  sanitizePhoneInput,
  type PhoneCountry,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

export type InvoiceTextPath = FieldPathByValue<InvoiceInput, string>;

interface FieldShellProps {
  id: string;
  label: ReactNode;
  labelClassName?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label, control and message, linked for assistive technology via aria-describedby. */
export function FieldShell({
  id,
  label,
  labelClassName,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", className)}>
      <Label
        htmlFor={id}
        className={cn("gap-0.5 text-[0.8125rem] leading-5 font-medium text-ink", labelClassName)}
      >
        {label}
        {required && (
          <span aria-hidden className="text-brand">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-xs leading-5 font-medium text-destructive"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

type NativeInputProps = Omit<
  ComponentProps<typeof Input>,
  "id" | "name" | "value" | "defaultValue" | "onChange" | "onBlur"
>;

interface TextFieldProps extends NativeInputProps {
  name: InvoiceTextPath;
  label: ReactNode;
  labelClassName?: string;
  hint?: ReactNode;
  /** Fields to re-validate when this one changes (e.g. the discount when a price changes). */
  deps?: FieldPath<InvoiceInput>[];
  /** Stops input at this length and shows a counter as the limit gets close. */
  maxCharacters?: number;
  /** Shows the counter from the first character instead of near the limit. */
  alwaysShowCount?: boolean;
  className?: string;
  inputClassName?: string;
}

/** "54 / 60", shown once a field is within 80% of its limit. */
export function CharacterCount({
  length,
  max,
  always = false,
}: {
  length: number;
  max: number;
  always?: boolean;
}) {
  if (!always && length < max * 0.8) return null;
  return (
    <span className={cn("ml-auto shrink-0 tabular-nums", length >= max && "text-brand-strong")}>
      {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </span>
  );
}

export function withCount(hint: ReactNode, count: ReactNode): ReactNode {
  if (!count) return hint;
  return (
    <span className="flex justify-between gap-3">
      <span>{hint}</span>
      {count}
    </span>
  );
}

/** A text input bound to the invoice form. Controlled, so server-rendered HTML has its value. */
export function TextField({
  name,
  label,
  labelClassName,
  hint,
  required,
  deps,
  maxCharacters,
  alwaysShowCount,
  className,
  inputClassName,
  ...inputProps
}: TextFieldProps) {
  const { control } = useFormContext<InvoiceInput>();
  const {
    field: { ref, ...field },
    fieldState,
  } = useController({ control, name, rules: { deps } });
  const id = fieldId(name);
  const error = fieldState.error?.message;
  const message =
    maxCharacters === undefined
      ? hint
      : withCount(
          hint,
          <CharacterCount
            length={field.value.length}
            max={maxCharacters}
            always={alwaysShowCount}
          />,
        );

  return (
    <FieldShell
      id={id}
      label={label}
      labelClassName={labelClassName}
      hint={message}
      error={error}
      required={required}
      className={className}
    >
      <Input
        {...inputProps}
        id={id}
        ref={ref}
        name={field.name}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        maxLength={maxCharacters}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, message)}
        aria-required={required || undefined}
        className={inputClassName}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<
  ComponentProps<typeof Textarea>,
  "id" | "name" | "value" | "defaultValue" | "onChange" | "onBlur"
> {
  name: InvoiceTextPath;
  label: ReactNode;
  hint?: ReactNode;
  /** Shows a live character count against this limit. */
  maxCharacters?: number;
  className?: string;
}

export function TextAreaField({
  name,
  label,
  hint,
  required,
  maxCharacters,
  className,
  ...textareaProps
}: TextAreaFieldProps) {
  const { control } = useFormContext<InvoiceInput>();
  const {
    field: { ref, ...field },
    fieldState,
  } = useController({ control, name });
  const id = fieldId(name);
  const error = fieldState.error?.message;
  const message =
    maxCharacters === undefined
      ? hint
      : withCount(hint, <CharacterCount length={field.value.length} max={maxCharacters} always />);

  return (
    <FieldShell
      id={id}
      label={label}
      hint={message}
      error={error}
      required={required}
      className={className}
    >
      <Textarea
        {...textareaProps}
        id={id}
        ref={ref}
        name={field.name}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        maxLength={maxCharacters}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, message)}
        aria-required={required || undefined}
      />
    </FieldShell>
  );
}

interface DecimalFieldProps extends Omit<TextFieldProps, "type" | "inputMode"> {
  /** The schema rule: its label, decimal places and maximum also drive what can be typed. */
  rule: DecimalRule;
  prefix?: string;
  suffix?: string;
}

/**
 * A numeric text field for money, quantities and rates. It keeps input to digits and one decimal
 * point, so a minus sign can never be typed or pasted, and refuses input above the rule's maximum;
 * either way a short notice explains why (and is announced to screen readers). The schema still
 * validates on save.
 */
export function DecimalField({
  name,
  label,
  rule,
  prefix,
  suffix,
  hint,
  labelClassName,
  required,
  deps,
  className,
  inputClassName,
  ...inputProps
}: DecimalFieldProps) {
  const { control } = useFormContext<InvoiceInput>();
  const {
    field: { ref, ...field },
    fieldState,
  } = useController({ control, name, rules: { deps } });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const id = fieldId(name);
  const error = fieldState.error?.message;
  const message = notice ? <span className="font-medium text-brand-strong">{notice}</span> : hint;

  return (
    <FieldShell
      id={id}
      label={label}
      labelClassName={labelClassName}
      hint={message}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        {prefix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink/55"
          >
            {prefix}
          </span>
        )}
        <Input
          {...inputProps}
          id={id}
          ref={ref}
          name={field.name}
          value={field.value}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            const { value, rejectedNegative } = sanitizeDecimalInput(
              event.target.value,
              rule.scale,
            );
            if (exceedsMax(value, rule.max, rule.scale)) {
              // Refuse the keystroke or paste; the field keeps its last valid value.
              setNotice(`${rule.label} can't be more than ${rule.maxLabel}`);
              return;
            }
            if (rejectedNegative) setNotice(`${rule.label} can't be negative`);
            field.onChange(value);
          }}
          onBlur={field.onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, message)}
          aria-required={required || undefined}
          className={cn(
            "text-right tabular-nums",
            prefix && "pl-7",
            suffix && "pr-8",
            inputClassName,
          )}
        />
        {suffix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink/55"
          >
            {suffix}
          </span>
        )}
      </div>
      <span role="status" className="sr-only">
        {notice}
      </span>
    </FieldShell>
  );
}

const subscribeNever = () => () => {};

/** False during server rendering and hydration, true once the page is interactive. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

interface PhoneFieldProps {
  role: "business" | "customer";
  autoComplete?: string;
}

/**
 * A country code selector (US by default) beside a digits-only national number. The input is
 * capped at the longest number the selected country allows; the schema checks the exact length.
 */
export function PhoneField({ role, autoComplete }: PhoneFieldProps) {
  const { control, getValues, setValue } = useFormContext<InvoiceInput>();
  const phoneName = `${role}.phone` as const;
  const countryName = `${role}.phoneCountry` as const;
  const {
    field: { ref, ...field },
    fieldState,
  } = useController({ control, name: phoneName });
  const {
    field: { ref: countryRef, ...countryField },
  } = useController({ control, name: countryName, rules: { deps: [phoneName] } });
  const [notice, setNotice] = useState("");
  // Country names come from Intl, whose data differs between Node and browsers, so the full list
  // is only rendered in the browser (the server renders just the selected code).
  const hydrated = useHydrated();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const country = countryField.value;
  const { min, max, maxInput } = phoneLengths(country);
  const id = fieldId(phoneName);
  const countryId = fieldId(countryName);
  const error = fieldState.error?.message;
  const message = notice ? <span className="font-medium text-brand-strong">{notice}</span> : null;
  const roleLabel = role === "business" ? "Business" : "Customer";

  return (
    <FieldShell id={id} label="Phone" hint={message} error={error}>
      <div className="flex min-w-0">
        <div className="relative shrink-0 focus-within:z-10">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center gap-1.5 text-base text-ink md:text-sm"
          >
            <span className="font-medium">{country}</span>
            <span className="text-ink/60 tabular-nums">{dialCode(country)}</span>
          </span>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-2.5 z-10 size-3.5 -translate-y-1/2 text-ink/55"
          />
          <select
            id={countryId}
            ref={countryRef}
            name={countryField.name}
            value={country}
            onChange={(event) => {
              const next = event.target.value as PhoneCountry;
              countryField.onChange(next);
              // Keep the number within the new country's limit.
              const digits = getValues(phoneName);
              const capped = digits.slice(0, phoneLengths(next).maxInput);
              if (capped !== digits) setValue(phoneName, capped, { shouldDirty: true });
            }}
            onBlur={countryField.onBlur}
            aria-label={`${roleLabel} phone country code`}
            autoComplete={autoComplete ? `${autoComplete}-country-code` : "off"}
            className="h-10 w-[6.75rem] cursor-pointer appearance-none rounded-l-lg border border-r-0 border-input/55 bg-white text-transparent shadow-xs transition-[border-color,box-shadow] outline-none hover:border-input/80 focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-ink/12"
          >
            {hydrated ? (
              PHONE_COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code} className="text-ink">
                  {option.name} ({option.dialCode})
                </option>
              ))
            ) : (
              <option value={country}>
                {country} {dialCode(country)}
              </option>
            )}
          </select>
        </div>
        <Input
          id={id}
          ref={ref}
          name={field.name}
          value={field.value}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete ? `${autoComplete}-national` : "off"}
          maxLength={maxInput}
          placeholder={min === max ? `${max} digits` : `${min}–${max} digits`}
          onChange={(event) => {
            const raw = event.target.value;
            const international = parseInternationalInput(raw, country);
            if (international) {
              if (international.country !== country) setValue(countryName, international.country);
              field.onChange(international.digits);
              return;
            }
            const { value, rejectedCharacters } = sanitizePhoneInput(raw, country);
            if (rejectedCharacters) setNotice("Phone numbers can only contain digits");
            field.onChange(value);
          }}
          onBlur={field.onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, message)}
          className="rounded-l-none tabular-nums"
        />
      </div>
      <span role="status" className="sr-only">
        {notice}
      </span>
    </FieldShell>
  );
}
