/** Manila (UTC+8) calendar helpers for remit weeks (Monday–Sunday). */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function manilaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(), // 0-based
    day: shifted.getUTCDate(),
    dow: shifted.getUTCDay(), // 0 = Sunday … 6 = Saturday
  };
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Days since Monday for a JS Sunday-based DOW. */
function daysSinceMonday(dow: number): number {
  return (dow + 6) % 7;
}

/** Manila Monday that opens the remit week for a given instant (YYYY-MM-DD). */
export function manilaWeekStart(date = new Date()): string {
  const { year, month, day, dow } = manilaParts(date);
  const monday = new Date(Date.UTC(year, month, day - daysSinceMonday(dow)));
  return toIsoDate(
    monday.getUTCFullYear(),
    monday.getUTCMonth(),
    monday.getUTCDate(),
  );
}

/** Current Manila calendar month as `{ year, month }` (month 1–12). */
export function manilaMonth(date = new Date()): { year: number; month: number } {
  const { year, month } = manilaParts(date);
  return { year, month: month + 1 };
}

/** Mondays whose Mon–Sun week overlaps a Manila calendar month. */
export function manilaWeeksInMonth(year: number, month: number): string[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastOfMonth = new Date(Date.UTC(year, month, 0));
  const firstDow = firstOfMonth.getUTCDay();
  const cursor = new Date(
    Date.UTC(year, month - 1, 1 - daysSinceMonday(firstDow)),
  );
  const weeks: string[] = [];

  while (cursor.getTime() <= lastOfMonth.getTime()) {
    const sunday = new Date(cursor);
    sunday.setUTCDate(cursor.getUTCDate() + 6);
    if (
      sunday.getTime() >= firstOfMonth.getTime() &&
      cursor.getTime() <= lastOfMonth.getTime()
    ) {
      weeks.push(
        toIsoDate(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth(),
          cursor.getUTCDate(),
        ),
      );
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return weeks;
}

/** @deprecated Use manilaWeeksInMonth — kept for older imports. */
export const manilaSundaysInMonth = manilaWeeksInMonth;

/** Next N Manila Mondays from (and including) the current week. */
export function upcomingManilaWeeks(count = 6): string[] {
  const current = manilaWeekStart();
  const [y, m, d] = current.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const weeks: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const next = new Date(base);
    next.setUTCDate(base.getUTCDate() + i * 7);
    weeks.push(
      toIsoDate(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()),
    );
  }
  return weeks;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
