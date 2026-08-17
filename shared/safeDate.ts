/**
 * Date parsing that cannot throw.
 *
 * `date-fns`'s `format()` throws a RangeError on an invalid Date, and in a
 * React render that unmounts the tree and blanks the page. A certificate page
 * was found doing exactly this: any response where `completedAt` was missing
 * or unparseable turned the whole page white instead of showing the
 * certificate without a date.
 *
 * Parsing and validity are separated from formatting so callers can decide
 * what to show when there is no usable date, rather than being handed a
 * misleading fallback date.
 */

/** Parse anything date-like. Returns null rather than an Invalid Date. */
export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/** True when the value yields a usable Date. */
export function isValidDate(value: unknown): boolean {
  return parseDate(value) !== null;
}
