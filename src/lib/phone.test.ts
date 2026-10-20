import { describe, expect, it } from "vitest";
import {
  describePhoneProblem,
  formatPhone,
  normalizePhone,
  parseInternationalInput,
  phoneLengths,
  sanitizePhoneInput,
} from "./phone";

describe("phone numbers", () => {
  it("knows each country's length limits", () => {
    expect(phoneLengths("US")).toEqual({ min: 10, max: 10, maxInput: 11 });
    expect(phoneLengths("GB")).toMatchObject({ max: 10, maxInput: 11 });
  });

  it("keeps digits only and caps the length", () => {
    expect(sanitizePhoneInput("(503) 555-0142", "US")).toEqual({
      value: "5035550142",
      rejectedCharacters: false,
    });
    expect(sanitizePhoneInput("503abc555", "US")).toEqual({
      value: "503555",
      rejectedCharacters: true,
    });
    expect(sanitizePhoneInput("123456789012345", "US").value).toHaveLength(11);
  });

  it("checks the length for the selected country", () => {
    expect(describePhoneProblem("", "US")).toBeUndefined();
    expect(describePhoneProblem("5035550142", "US")).toBeUndefined();
    expect(describePhoneProblem("503555", "US")).toBe("United States numbers have 10 digits");
    expect(describePhoneProblem("50355501420", "US")).toBe("United States numbers have 10 digits");
    expect(describePhoneProblem("12345678", "GB")).toBe(
      "United Kingdom numbers have 7 to 10 digits",
    );
  });

  it("drops a national prefix when storing", () => {
    expect(normalizePhone("07911123456", "GB")).toBe("7911123456");
    expect(normalizePhone("15035550142", "US")).toBe("5035550142");
  });

  it("formats with the dialing code", () => {
    expect(formatPhone("5035550142", "US")).toBe("+1 503 555 0142");
    expect(formatPhone("", "US")).toBe("");
  });

  it("takes the country from a pasted international number", () => {
    expect(parseInternationalInput("+44 20 7946 0958", "US")).toEqual({
      country: "GB",
      digits: "2079460958",
    });
    // +1 is shared, so the current country stays.
    expect(parseInternationalInput("+1 416 555 0199", "US")).toEqual({
      country: "US",
      digits: "4165550199",
    });
    expect(parseInternationalInput("503 555 0142", "US")).toBeUndefined();
  });
});
