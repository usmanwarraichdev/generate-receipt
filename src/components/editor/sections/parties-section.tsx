"use client";

import { EditorSection, useErrorCount } from "../editor-section";
import { LIMITS } from "@/lib/invoice-schema";
import { PhoneField, TextAreaField, TextField } from "../form-fields";

export function PartiesSection() {
  const errorCount = useErrorCount(["business", "customer"]);
  return (
    <EditorSection
      id="section-parties"
      index={1}
      title="Who’s involved"
      description="Your business details and who you’re billing."
      errorCount={errorCount}
    >
      <div className="grid gap-8 md:grid-cols-2 md:gap-6">
        <PartyFields role="business" legend="From" />
        <PartyFields role="customer" legend="Bill to" />
      </div>
    </EditorSection>
  );
}

function PartyFields({ role, legend }: { role: "business" | "customer"; legend: string }) {
  const isBusiness = role === "business";
  return (
    <fieldset className="grid min-w-0 content-start gap-4">
      <legend className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {legend}
      </legend>
      <TextField
        name={`${role}.name`}
        label={isBusiness ? "Business name" : "Customer name"}
        required
        maxCharacters={LIMITS.name}
        autoComplete={isBusiness ? "organization" : "off"}
        placeholder={isBusiness ? "Your business" : "Customer or company"}
      />
      <TextField
        name={`${role}.email`}
        label="Email"
        type="email"
        maxCharacters={LIMITS.email}
        alwaysShowCount
        autoComplete={isBusiness ? "email" : "off"}
        placeholder="name@company.com"
        hint={isBusiness ? "Customers' replies go here." : "Pre-fills the recipient when you send."}
      />
      <PhoneField role={role} autoComplete={isBusiness ? "tel" : undefined} />
      <TextAreaField
        name={`${role}.address`}
        label="Address"
        rows={3}
        maxCharacters={LIMITS.address}
        autoComplete={isBusiness ? "street-address" : "off"}
      />
    </fieldset>
  );
}
