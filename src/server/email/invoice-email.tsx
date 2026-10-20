/* eslint-disable @next/next/no-head-element -- this renders a standalone HTML email, not a Next.js page */
import { render, toPlainText } from "@react-email/render";
import type { CSSProperties, ReactNode } from "react";
import { formatDate } from "@/lib/dates";
import type { Invoice } from "@/lib/invoice";
import { formatCents, formatPercent, toScaledOrZero } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

/**
 * The invoice email. Email clients need table layouts and inline styles, so this is a separate,
 * deliberately plain template that mirrors the on-screen invoice (same palette, serif headings,
 * accent color). Only visible custom fields are included.
 */

const COLORS = {
  canvas: "#F4F1EA",
  paper: "#FFFFFF",
  panel: "#FAF8F3",
  ink: "#161B26",
  muted: "#5B6170",
  line: "#E3DED3",
};
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', Times, serif";

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: SANS,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: COLORS.muted,
};

export interface InvoiceEmailProps {
  invoice: Invoice;
  /** Optional personal note from the sender. */
  message: string;
  /** Public link to the printable invoice. */
  viewUrl: string;
}

export function InvoiceEmail({ invoice, message, viewUrl }: InvoiceEmailProps) {
  const { totals, business, customer } = invoice;
  const accent = invoice.accentColor;
  const total = formatCents(totals.totalCents);
  const dueDate = formatDate(invoice.dueDate);
  const visibleFields = invoice.customFields.filter((field) => field.visible);
  const hasTax = toScaledOrZero(invoice.taxRate, 3) > 0n;

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light only" />
        <title>{`Invoice ${invoice.invoiceNumber} from ${business.name}`}</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: COLORS.canvas }}>
        <Preheader>{`${total} due ${dueDate} · Invoice ${invoice.invoiceNumber} from ${business.name}`}</Preheader>
        <Table style={{ backgroundColor: COLORS.canvas }}>
          <tr>
            <td align="center" style={{ padding: "32px 12px" }}>
              <Table
                style={{
                  maxWidth: 600,
                  backgroundColor: COLORS.paper,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 12,
                }}
              >
                <tr>
                  <td
                    style={{
                      height: 6,
                      backgroundColor: accent,
                      borderRadius: "12px 12px 0 0",
                      fontSize: 0,
                      lineHeight: "6px",
                    }}
                  >
                    &nbsp;
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "32px 36px 0" }}>
                    <p style={eyebrow}>Invoice {invoice.invoiceNumber}</p>
                    <h1
                      style={{
                        margin: "8px 0 0",
                        fontFamily: SERIF,
                        fontSize: 28,
                        fontWeight: 400,
                        lineHeight: "34px",
                        color: COLORS.ink,
                      }}
                    >
                      {business.name}
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td
                    style={{
                      padding: "20px 36px 0",
                      fontFamily: SANS,
                      fontSize: 15,
                      lineHeight: "24px",
                      color: COLORS.ink,
                    }}
                  >
                    <p style={{ margin: 0 }}>Hi {customer.name},</p>
                    <p
                      style={{
                        margin: "12px 0 0",
                        whiteSpace: "pre-line",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {message.trim() ||
                        `Here's your invoice from ${business.name}. The summary is below, and you can view, print or download the full invoice at any time.`}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "24px 36px 0" }}>
                    <Table
                      style={{
                        backgroundColor: COLORS.panel,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 10,
                      }}
                    >
                      <tr>
                        <td style={{ padding: "22px 24px" }}>
                          <p style={eyebrow}>Amount due</p>
                          <p
                            style={{
                              margin: "6px 0 0",
                              fontFamily: SERIF,
                              fontSize: 36,
                              lineHeight: "42px",
                              color: accent,
                            }}
                          >
                            {total}
                          </p>
                          <p
                            style={{
                              margin: "6px 0 18px",
                              fontFamily: SANS,
                              fontSize: 14,
                              color: COLORS.muted,
                            }}
                          >
                            Due {dueDate} · Issued {formatDate(invoice.issueDate)}
                          </p>
                          <a
                            href={viewUrl}
                            style={{
                              display: "inline-block",
                              padding: "12px 20px",
                              borderRadius: 8,
                              backgroundColor: accent,
                              color: "#FFFFFF",
                              fontFamily: SANS,
                              fontSize: 15,
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            View &amp; download invoice
                          </a>
                        </td>
                      </tr>
                    </Table>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "28px 36px 0" }}>
                    <Table>
                      <tr>
                        <th
                          align="left"
                          style={{
                            ...eyebrow,
                            paddingBottom: 8,
                            borderBottom: `2px solid ${COLORS.ink}`,
                          }}
                        >
                          Description
                        </th>
                        <th
                          align="right"
                          style={{
                            ...eyebrow,
                            paddingBottom: 8,
                            borderBottom: `2px solid ${COLORS.ink}`,
                          }}
                        >
                          Amount
                        </th>
                      </tr>
                      {invoice.lineItems.map((item, index) => (
                        <tr key={index}>
                          <td
                            style={{
                              padding: "12px 12px 12px 0",
                              borderBottom: `1px solid ${COLORS.line}`,
                              fontFamily: SANS,
                              fontSize: 14,
                              color: COLORS.ink,
                            }}
                          >
                            {item.description}
                            <br />
                            <span style={{ fontSize: 13, color: COLORS.muted }}>
                              {item.quantity} × {formatCents(toScaledOrZero(item.unitPrice, 2))}
                            </span>
                          </td>
                          <td
                            align="right"
                            valign="top"
                            style={{
                              padding: "12px 0",
                              borderBottom: `1px solid ${COLORS.line}`,
                              fontFamily: SANS,
                              fontSize: 14,
                              color: COLORS.ink,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatCents(totals.lineTotalsCents[index] ?? 0)}
                          </td>
                        </tr>
                      ))}
                      <SummaryRow label="Subtotal" value={formatCents(totals.subtotalCents)} />
                      {totals.discountCents > 0 && (
                        <SummaryRow
                          label="Discount"
                          value={`−${formatCents(totals.discountCents)}`}
                        />
                      )}
                      {hasTax && (
                        <SummaryRow
                          label={`Tax (${formatPercent(invoice.taxRate)})`}
                          value={formatCents(totals.taxCents)}
                        />
                      )}
                      <tr>
                        <td colSpan={2} style={{ height: 12, fontSize: 0, lineHeight: "12px" }}>
                          &nbsp;
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            paddingTop: 12,
                            borderTop: `2px solid ${accent}`,
                            fontFamily: SANS,
                            fontSize: 15,
                            fontWeight: 700,
                            color: COLORS.ink,
                          }}
                        >
                          Total due
                        </td>
                        <td
                          align="right"
                          style={{
                            paddingTop: 12,
                            borderTop: `2px solid ${accent}`,
                            fontFamily: SERIF,
                            fontSize: 22,
                            color: COLORS.ink,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {total}
                        </td>
                      </tr>
                    </Table>
                  </td>
                </tr>

                {visibleFields.length > 0 && (
                  <tr>
                    <td style={{ padding: "28px 36px 0" }}>
                      <p style={eyebrow}>Details</p>
                      <Table style={{ marginTop: 8 }}>
                        {visibleFields.map((field, index) => (
                          <tr key={index}>
                            <td
                              style={{
                                padding: "4px 12px 4px 0",
                                fontFamily: SANS,
                                fontSize: 14,
                                color: COLORS.muted,
                                width: "40%",
                              }}
                            >
                              {field.label}
                            </td>
                            <td
                              style={{
                                padding: "4px 0",
                                fontFamily: SANS,
                                fontSize: 14,
                                color: COLORS.ink,
                              }}
                            >
                              {field.value}
                            </td>
                          </tr>
                        ))}
                      </Table>
                    </td>
                  </tr>
                )}

                {invoice.notes.trim() && (
                  <tr>
                    <td style={{ padding: "28px 36px 0" }}>
                      <p style={eyebrow}>Notes</p>
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontFamily: SANS,
                          fontSize: 14,
                          lineHeight: "22px",
                          color: COLORS.ink,
                          whiteSpace: "pre-line",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {invoice.notes}
                      </p>
                    </td>
                  </tr>
                )}

                <tr>
                  <td style={{ padding: "32px 36px 32px" }}>
                    <p
                      style={{
                        margin: 0,
                        paddingTop: 20,
                        borderTop: `1px solid ${COLORS.line}`,
                        fontFamily: SANS,
                        fontSize: 13,
                        lineHeight: "20px",
                        color: COLORS.muted,
                        whiteSpace: "pre-line",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <strong style={{ color: COLORS.ink }}>{business.name}</strong>
                      {[
                        business.email,
                        formatPhone(business.phone, business.phoneCountry),
                        business.address,
                      ]
                        .filter(Boolean)
                        .map((line) => `\n${line}`)}
                    </p>
                  </td>
                </tr>
              </Table>
              <p
                style={{ margin: "16px 0 0", fontFamily: SANS, fontSize: 12, color: COLORS.muted }}
              >
                Sent with Folio
              </p>
            </td>
          </tr>
        </Table>
      </body>
    </html>
  );
}

function Table({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ borderCollapse: "separate", ...style }}
    >
      <tbody>{children}</tbody>
    </table>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const cell: CSSProperties = {
    padding: "8px 0 0",
    fontFamily: SANS,
    fontSize: 14,
    color: COLORS.muted,
  };
  return (
    <tr>
      <td style={cell}>{label}</td>
      <td align="right" style={{ ...cell, color: COLORS.ink, whiteSpace: "nowrap" }}>
        {value}
      </td>
    </tr>
  );
}

/** Inbox preview text, hidden in the body. */
function Preheader({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "none",
        maxHeight: 0,
        overflow: "hidden",
        opacity: 0,
        fontSize: 1,
        lineHeight: "1px",
        color: COLORS.canvas,
      }}
    >
      {children}
    </div>
  );
}

export async function renderInvoiceEmail(
  props: InvoiceEmailProps,
): Promise<{ html: string; text: string }> {
  const html = await render(<InvoiceEmail {...props} />);
  return { html, text: toPlainText(html) };
}
