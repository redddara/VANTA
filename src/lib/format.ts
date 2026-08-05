const wholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const centsMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** In-game cash. Cents are shown only when an amount actually has them. */
export function formatMoney(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(amount)) return "$0";
  return Number.isInteger(amount) ? wholeMoney.format(amount) : centsMoney.format(amount);
}

/** Reputation is always signed, so a zero-change entry still reads clearly. */
export function formatPoints(points: number): string {
  return `${points > 0 ? "+" : points < 0 ? "\u2212" : ""}${Math.abs(points)}`;
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  return dateOnly.format(new Date(iso));
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "\u2014";

  const diff = new Date(iso).getTime() - Date.now();
  const magnitude = Math.abs(diff);

  for (const [unit, ms] of UNITS) {
    if (magnitude >= ms) return relative.format(Math.round(diff / ms), unit);
  }

  return "just now";
}
