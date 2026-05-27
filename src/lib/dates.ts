/**
 * Business-day helpers. The studio works Mon–Fri, so streaks and auto due
 * dates ignore weekends: a Friday→Monday gap is one working day, and a due
 * date never lands on a Saturday or Sunday.
 */

/** Midnight (local) at the start of the given day. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** True for Saturday (6) and Sunday (0). */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Adds `n` business days to `date`, skipping weekends. With `n === 0` (or any
 * result that would land on a weekend) the date rolls forward to the next
 * weekday, so the returned date is always a working day.
 */
export function addBusinessDays(date: Date, n: number): Date {
  const d = new Date(date);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added++;
  }
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Number of business days between `from` and `to` (counting working days
 * crossed when moving forward from `from` to `to`). Weekends contribute 0, so
 * Friday→Monday is 1. Returns 0 when `to` is on or before `from`.
 */
export function businessDaysBetween(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  if (b <= a) return 0;
  let count = 0;
  const cur = new Date(a);
  while (cur < b) {
    cur.setDate(cur.getDate() + 1);
    if (!isWeekend(cur)) count++;
  }
  return count;
}
