/**
 * Returns a number with its ordinal suffix, e.g. 1st, 2nd, 3rd, 11th, 23rd.
 */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Formats cents as a dollar string, e.g. 500 → "$5.00", 1050 → "$10.50".
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Short dollar format — drops cents when whole, e.g. 500 → "$5", 1050 → "$10.50".
 */
export function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
