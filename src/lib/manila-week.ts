/** Manila (UTC+8) calendar helpers for remit weeks (Sunday-start). */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function manilaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(), // 0-based
    day: shifted.getUTCDate(),
    dow: shifted.getUTCDay(), // 0 = Sunday
  };
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Manila Sunday for a given instant (YYYY-MM-DD). */
export function manilaWeekStart(date = new Date()): string {
  const { year, month, day, dow } = manilaParts(date);
  const sunday = new Date(Date.UTC(year, month, day - dow));
  return toIsoDate(
    sunday.getUTCFullYear(),
    sunday.getUTCMonth(),
    sunday.getUTCDate(),
  );
}

/** Current Manila calendar month as `{ year, month }` (month 1–12). */
export function manilaMonth(date = new Date()): { year: number; month: number } {
  const { year, month } = manilaParts(date);
  return { year, month: month + 1 };
}

/** Sundays whose week overlaps a Manila calendar month. */
export function manilaSundaysInMonth(year: number, month: number): string[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastOfMonth = new Date(Date.UTC(year, month, 0));
  const firstDow = firstOfMonth.getUTCDay();
  const cursor = new Date(Date.UTC(year, month - 1, 1 - firstDow));
  const weeks: string[] = [];

  while (cursor.getTime() <= lastOfMonth.getTime()) {
    const saturday = new Date(cursor);
    saturday.setUTCDate(cursor.getUTCDate() + 6);
    if (
      saturday.getTime() >= firstOfMonth.getTime() &&
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

/** Next N Manila Sundays from (and including) the current week. */
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
