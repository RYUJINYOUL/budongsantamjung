/** 발굴 「가격」 필터 상한 (억) — 호갱노노식 0~40+최대 */
export const PRICE_FILTER_MAX_EOK = 40;

export function isPriceFilterActive(priceMinEok: number, priceMaxEok: number): boolean {
  return priceMinEok > 0 || priceMaxEok < PRICE_FILTER_MAX_EOK;
}

export function formatPriceFilterLabel(priceMinEok: number, priceMaxEok: number): string {
  if (!isPriceFilterActive(priceMinEok, priceMaxEok)) return '가격';
  if (priceMinEok <= 0 && priceMaxEok < PRICE_FILTER_MAX_EOK) return `~${priceMaxEok}억`;
  if (priceMinEok > 0 && priceMaxEok >= PRICE_FILTER_MAX_EOK) return `${priceMinEok}억~`;
  return `${priceMinEok}~${priceMaxEok}억`;
}
