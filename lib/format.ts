/** Shared number / date formatting for the dashboard (en-IN, IST). */

export const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export function price(value: number | null | undefined) {
  return value == null ? "—" : `₹${numberFormatter.format(value)}`;
}

/** Indian short form: 950 · 12.4K · 3.2L (lakh) · 1.1Cr (crore). */
export function quantity(value: number | null | undefined) {
  if (value == null) return "—";
  const size = Math.abs(value);
  if (size >= 1e7) return `${oneDecimal.format(value / 1e7)}Cr`;
  if (size >= 1e5) return `${oneDecimal.format(value / 1e5)}L`;
  if (size >= 1e3) return `${oneDecimal.format(value / 1e3)}K`;
  return oneDecimal.format(value);
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function expiry(value: string | number | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
