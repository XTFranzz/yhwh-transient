// All dates are "YYYY-MM-DD" strings compared lexicographically (which matches
// chronological order for zero-padded ISO dates).

// Half-open interval overlap: [aStart, aEnd) intersects [bStart, bEnd).
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export function nightsBetween(startDate: string, endDate: string): number {
  const nights = daysBetween(startDate, endDate);
  if (nights <= 0) throw new Error("endDate must be after startDate");
  return nights;
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
