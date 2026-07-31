import type { ApartmentCompareProfile } from './apartmentCompareBasket';

export const MORTGAGE_DISCLAIMER =
  '2026년 7월 기준 · 실제 대출 조건은 금융기관에 확인하세요';

/** @deprecated 예산 필터 제거 — 발굴 「가격」 사용 */
export function computeMaxPurchasableMan(_profile: ApartmentCompareProfile): number | null {
  return null;
}

export function estimateCommuteMinutesCar(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const R = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((fromLat * Math.PI) / 180)
    * Math.cos((toLat * Math.PI) / 180)
    * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35;
  return Math.max(1, Math.round((km / 35) * 60));
}

export function passesCompareProfileFilters(
  item: {
    category?: string;
    lat?: number;
    lng?: number;
  },
  profile: ApartmentCompareProfile,
  options: { commuteFilter: boolean },
): boolean {
  const cat = (item.category || '').toLowerCase();
  const isApartment = !cat || cat === 'apartment' || cat === '아파트';
  if (!isApartment) return true;

  if (options.commuteFilter) {
    const maxMin = profile.maxCommuteMinutes?.trim()
      ? parseInt(profile.maxCommuteMinutes, 10)
      : NaN;
    if (
      Number.isFinite(maxMin)
      && maxMin > 0
      && profile.workLat != null
      && profile.workLng != null
      && item.lat != null
      && item.lng != null
    ) {
      const est = estimateCommuteMinutesCar(item.lat, item.lng, profile.workLat, profile.workLng);
      if (est > maxMin) return false;
    }
  }

  return true;
}
