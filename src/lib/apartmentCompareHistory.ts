import type { ApartmentCompareBasketItem, ApartmentCompareProfile } from './apartmentCompareBasket';
import { saveCompareBasket, saveCompareProfile } from './apartmentCompareBasket';

export const APARTMENT_COMPARE_HISTORY_KIND = 'apartment_compare';

export type ApartmentCompareHistoryPayload = {
  kind: typeof APARTMENT_COMPARE_HISTORY_KIND;
  version: number;
  savedAt: string;
  items: ApartmentCompareBasketItem[];
  profile: ApartmentCompareProfile;
  snapshot?: {
    scoring?: unknown;
    itemCount?: number;
  } | null;
};

export function basketItemsForSave(items: ApartmentCompareBasketItem[]) {
  return items.map((i) => ({
    key: i.key,
    masterId: i.masterId,
    rtmsAptSeq: i.rtmsAptSeq,
    exclusiveAreaM2: i.exclusiveAreaM2 ?? null,
    complexName: i.complexName,
  }));
}

export function isApartmentCompareHistoryResult(raw: unknown): raw is ApartmentCompareHistoryPayload {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as ApartmentCompareHistoryPayload;
  return o.kind === APARTMENT_COMPARE_HISTORY_KIND && Array.isArray(o.items) && o.items.length > 0;
}

/** 저장된 발견 기록 → 비교함·프로필 복원 */
export function restoreCompareFromHistory(payload: ApartmentCompareHistoryPayload) {
  const items: ApartmentCompareBasketItem[] = payload.items.map((i) => ({
    key: i.key,
    masterId: i.masterId,
    rtmsAptSeq: i.rtmsAptSeq,
    exclusiveAreaM2: i.exclusiveAreaM2 ?? null,
    complexName: i.complexName,
  }));
  saveCompareBasket(items);
  if (payload.profile && typeof payload.profile === 'object') {
    saveCompareProfile({
      firstTimeBuyer: payload.profile.firstTimeBuyer !== false,
      ...payload.profile,
    });
  }
  return items;
}

export function formatCompareHistorySubtitle(item: {
  category?: string | null;
  direction?: string | null;
  region?: string | null;
}) {
  if (item.category === 'apartment_compare') {
    return item.direction || '아파트 단지 비교';
  }
  return item.region || '지역 발굴';
}
