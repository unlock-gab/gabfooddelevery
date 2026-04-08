/**
 * Format a number as Algerian Dinar with French-style thousands separator.
 * Examples: 250 → "250 DA", 1500 → "1 500 DA", 3200 → "3 200 DA"
 */
export function formatDA(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (isNaN(n)) return "— DA";
  const rounded = Math.round(n);
  return `${rounded.toLocaleString("fr-FR")} DA`;
}

/**
 * Format a number as Algerian Dinar with decimals (for exact amounts).
 * Examples: 1500.5 → "1 500,50 DA"
 */
export function formatDAExact(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (isNaN(n)) return "— DA";
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DA`;
}
