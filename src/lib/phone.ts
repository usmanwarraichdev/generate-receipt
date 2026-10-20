import {
  Metadata,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js/min";

/**
 * Phone numbers are stored as a country (ISO 3166 code, for the dialing code) plus the national
 * number as digits only. Length rules come from libphonenumber's per-country metadata, so
 * "(503) 555-0142" style fictional numbers still pass: we check length, not number ranges.
 */

export type PhoneCountry = CountryCode;

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = "US";

/** Every supported country code, as a non-empty tuple for the schema's enum. */
export const PHONE_COUNTRY_CODES = getCountries() as [PhoneCountry, ...PhoneCountry[]];

const COUNTRIES = new Set<string>(PHONE_COUNTRY_CODES);

export function isPhoneCountry(value: unknown): value is PhoneCountry {
  return typeof value === "string" && COUNTRIES.has(value);
}

export function dialCode(country: PhoneCountry): string {
  return `+${getCountryCallingCode(country)}`;
}

const regionNames = new Intl.DisplayNames(["en-US"], { type: "region" });

export function countryName(country: PhoneCountry): string {
  return regionNames.of(country) ?? country;
}

export interface PhoneCountryOption {
  code: PhoneCountry;
  name: string;
  dialCode: string;
}

/** Every supported country, sorted by name, for the country code selector. */
export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = PHONE_COUNTRY_CODES.map((code) => ({
  code,
  name: countryName(code),
  dialCode: dialCode(code),
})).sort((a, b) => a.name.localeCompare(b.name, "en-US"));

interface PhoneLengths {
  /** Shortest and longest national significant number. */
  min: number;
  max: number;
  /** Longest input we accept, leaving room for a national prefix such as the UK's leading 0. */
  maxInput: number;
}

const lengthCache = new Map<PhoneCountry, PhoneLengths>();

export function phoneLengths(country: PhoneCountry): PhoneLengths {
  const cached = lengthCache.get(country);
  if (cached) return cached;
  const metadata = new Metadata();
  metadata.selectNumberingPlan(country);
  // nationalPrefix() exists at runtime but is missing from the package's type declarations.
  const plan = metadata.numberingPlan as NonNullable<typeof metadata.numberingPlan> & {
    nationalPrefix(): string | undefined;
  };
  const possible = plan.possibleLengths();
  const prefix = plan.nationalPrefix() ?? "";
  const max = Math.max(...possible);
  const lengths = { min: Math.min(...possible), max, maxInput: max + prefix.length };
  lengthCache.set(country, lengths);
  return lengths;
}

/** Keeps digits only and caps the length for the selected country. */
export function sanitizePhoneInput(
  raw: string,
  country: PhoneCountry,
): { value: string; rejectedCharacters: boolean } {
  // Formatting characters people paste ("(503) 555-0142") are dropped silently; letters are not.
  const rejectedCharacters = /[^\d\s().+\-]/.test(raw);
  const value = raw.replace(/\D/g, "").slice(0, phoneLengths(country).maxInput);
  return { value, rejectedCharacters };
}

/** Returns why a phone number is not acceptable, or undefined when it is (blank is fine). */
export function describePhoneProblem(digits: string, country: PhoneCountry): string | undefined {
  if (digits === "") return undefined;
  if (!/^\d+$/.test(digits)) return "Use digits only";
  if (validatePhoneNumberLength(digits, country) === undefined) return undefined;
  const { min, max } = phoneLengths(country);
  const name = countryName(country);
  return min === max
    ? `${name} numbers have ${max} digits`
    : `${name} numbers have ${min} to ${max} digits`;
}

/** The national number without a national prefix ("07911 123456" in the UK → "7911123456"). */
export function normalizePhone(digits: string, country: PhoneCountry): string {
  if (digits === "") return "";
  return parsePhoneNumberFromString(digits, country)?.nationalNumber ?? digits;
}

/** "+1 503 555 0142", for the invoice, the email and the customer view. */
export function formatPhone(digits: string, country: string): string {
  const trimmed = digits.trim();
  if (trimmed === "") return "";
  if (!isPhoneCountry(country)) return trimmed;
  return (
    parsePhoneNumberFromString(trimmed, country)?.formatInternational() ??
    `${dialCode(country)} ${trimmed}`
  );
}

/**
 * A pasted international number ("+44 20 7946 0958") carries its own country. Keeps the current
 * country when it shares the dialing code (e.g. +1 for the US and Canada).
 */
export function parseInternationalInput(
  raw: string,
  current: PhoneCountry,
): { country: PhoneCountry; digits: string } | undefined {
  if (!raw.trim().startsWith("+")) return undefined;
  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed) return undefined;
  const country =
    getCountryCallingCode(current) === parsed.countryCallingCode
      ? current
      : (parsed.country ?? current);
  if (getCountryCallingCode(country) !== parsed.countryCallingCode) return undefined;
  return { country, digits: parsed.nationalNumber.slice(0, phoneLengths(country).maxInput) };
}
