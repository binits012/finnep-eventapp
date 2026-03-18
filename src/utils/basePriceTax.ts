/**
 * Single source of truth for tax on ticket base price.
 * Backend / CMS use either `entertainmentTax` or `vat` for the same role; prefer entertainment when set.
 */
export function basePriceTaxPercent(
  vat: number,
  entertainmentTax?: number | null
): number {
  const et = entertainmentTax ?? 0;
  if (et > 0) return et;
  return vat ?? 0;
}

export function isEntertainmentTaxOnBase(
  entertainmentTax?: number | null
): boolean {
  return (entertainmentTax ?? 0) > 0;
}

/** e.g. 13.5 → "13.5", 14 → "14" */
export function formatTaxRateDisplay(rate: number): string {
  if (!rate || rate === 0) return '0';
  const s = rate.toFixed(2);
  return s.replace(/\.?0+$/, '');
}
