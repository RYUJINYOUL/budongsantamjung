export const APARTMENT_COMPARE_STORAGE_KEY = 'apartment_compare_basket';
export const APARTMENT_COMPARE_MAX = 4;

export type ApartmentCompareBasketItem = {
  key: string;
  masterId?: string;
  rtmsAptSeq?: string;
  exclusiveAreaM2?: number | null;
  complexName?: string;
};

export type ApartmentCompareProfile = {
  budgetEok?: string;
  firstTimeBuyer: boolean;
  workplaceLabel?: string;
  workLat?: number;
  workLng?: number;
  /** Phase 3 — 홈 리스트 통근 필터(추정 분) */
  maxCommuteMinutes?: string;
};

export const APARTMENT_COMPARE_PROFILE_KEY = 'apartment_compare_profile';

function basketKey(item: Pick<ApartmentCompareBasketItem, 'masterId' | 'rtmsAptSeq' | 'exclusiveAreaM2'>) {
  const id = item.rtmsAptSeq || item.masterId || 'unknown';
  const area = item.exclusiveAreaM2 != null ? String(item.exclusiveAreaM2) : 'default';
  return `${id}:${area}`;
}

/** PropertyCard 등 — 비교함 key 계산 */
export function compareItemKey(input: {
  masterId?: string | null;
  rtmsAptSeq?: string | null;
  exclusiveAreaM2?: number | null;
  area?: number | null;
}) {
  const exclusiveAreaM2 = input.exclusiveAreaM2 ?? input.area ?? null;
  return basketKey({
    masterId: input.masterId || undefined,
    rtmsAptSeq: input.rtmsAptSeq || undefined,
    exclusiveAreaM2,
  });
}

export function loadCompareBasket(): ApartmentCompareBasketItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(APARTMENT_COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCompareBasket(items: ApartmentCompareBasketItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APARTMENT_COMPARE_STORAGE_KEY, JSON.stringify(items.slice(0, APARTMENT_COMPARE_MAX)));
  dispatchCompareBasketUpdated();
}

export function dispatchCompareBasketUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('apartment-compare-updated'));
}

export function removeFromCompareBasket(key: string) {
  const next = loadCompareBasket().filter((i) => i.key !== key);
  saveCompareBasket(next);
  return next;
}

export function addToCompareBasket(
  input: Omit<ApartmentCompareBasketItem, 'key'>,
): { ok: true; items: ApartmentCompareBasketItem[] } | { ok: false; error: string } {
  const current = loadCompareBasket();
  const key = basketKey(input);
  if (current.some((i) => i.key === key)) {
    return { ok: false, error: '이미 비교함에 담긴 단지·평형입니다.' };
  }
  if (current.length >= APARTMENT_COMPARE_MAX) {
    return { ok: false, error: `최대 ${APARTMENT_COMPARE_MAX}개까지 담을 수 있습니다.` };
  }
  if (!input.masterId && !input.rtmsAptSeq) {
    return { ok: false, error: '단지 정보가 없어 비교함에 담을 수 없습니다.' };
  }
  const item: ApartmentCompareBasketItem = { ...input, key };
  const next = [...current, item];
  saveCompareBasket(next);
  return { ok: true, items: next };
}

/** 비교함에 있는 항목의 평형만 변경 (순서·개수 유지) */
export function updateCompareBasketItemArea(
  existingKey: string,
  exclusiveAreaM2: number,
  meta: Partial<Omit<ApartmentCompareBasketItem, 'key'>> = {},
): { ok: true; items: ApartmentCompareBasketItem[] } | { ok: false; error: string } {
  const current = loadCompareBasket();
  const idx = current.findIndex((i) => i.key === existingKey);
  if (idx < 0) {
    return { ok: false, error: '비교함에서 항목을 찾을 수 없습니다.' };
  }
  const old = current[idx];
  const merged = {
    masterId: meta.masterId ?? old.masterId,
    rtmsAptSeq: meta.rtmsAptSeq ?? old.rtmsAptSeq,
    exclusiveAreaM2,
    complexName: meta.complexName ?? old.complexName,
  };
  const newKey = basketKey(merged);
  if (current.some((i, j) => j !== idx && i.key === newKey)) {
    return { ok: false, error: '이미 비교함에 있는 단지·평형입니다.' };
  }
  const next = [...current];
  next[idx] = { ...merged, key: newKey };
  saveCompareBasket(next);
  return { ok: true, items: next };
}

export function loadCompareProfile(): ApartmentCompareProfile {
  if (typeof window === 'undefined') {
    return { firstTimeBuyer: true };
  }
  try {
    const raw = localStorage.getItem(APARTMENT_COMPARE_PROFILE_KEY);
    if (!raw) return { firstTimeBuyer: true };
    const p = JSON.parse(raw) as ApartmentCompareProfile;
    return { firstTimeBuyer: p.firstTimeBuyer !== false, ...p };
  } catch {
    return { firstTimeBuyer: true };
  }
}

export function saveCompareProfile(profile: ApartmentCompareProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APARTMENT_COMPARE_PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent('apartment-compare-profile-updated'));
}

export function basketToCompareQueryItems(items: ApartmentCompareBasketItem[]) {
  return items.map((i) => ({
    masterId: i.masterId,
    rtmsAptSeq: i.rtmsAptSeq,
    area: i.exclusiveAreaM2 ?? undefined,
  }));
}
