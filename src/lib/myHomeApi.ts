import { basketToCompareQueryItems, type ApartmentCompareBasketItem } from './apartmentCompareBasket';
import { parseCompareScoring, type CompareScoringItem, type CompareScoringPayload } from './apartmentCompareScoring';
import type { MyApartmentRegistration, MyHomeCompareItem, MyHomeCompareSlot, MyHomeWorkplace } from './myHomeTypes';

function slotToBasket(
  slot: Pick<MyApartmentRegistration | MyHomeCompareSlot, 'masterId' | 'rtmsAptSeq' | 'r114PropId' | 'exclusiveAreaM2' | 'complexName'>,
  key: string,
): ApartmentCompareBasketItem {
  return {
    key,
    masterId: slot.masterId ?? undefined,
    rtmsAptSeq: slot.rtmsAptSeq ?? undefined,
    r114PropId: slot.r114PropId ?? undefined,
    exclusiveAreaM2: slot.exclusiveAreaM2,
    complexName: slot.complexName,
  };
}

export function buildMyHomeCompareBasket(
  registration: MyApartmentRegistration,
  compareSlots: MyHomeCompareSlot[],
): ApartmentCompareBasketItem[] {
  const items: ApartmentCompareBasketItem[] = [
    slotToBasket(registration, 'home'),
  ];
  compareSlots.forEach((s, i) => {
    items.push(slotToBasket(s, `compare-${i}`));
  });
  return items;
}

export type MyHomeCompareFetchResult = {
  items: MyHomeCompareItem[];
  scoring: CompareScoringPayload | null;
};

export async function fetchMyHomeCompareData(
  registration: MyApartmentRegistration,
  compareSlots: MyHomeCompareSlot[],
  workplace: MyHomeWorkplace,
): Promise<MyHomeCompareFetchResult> {
  const basket = buildMyHomeCompareBasket(registration, compareSlots);
  const params = new URLSearchParams();
  params.set('items', JSON.stringify(basketToCompareQueryItems(basket)));
  params.set('extended', '1');
  params.set('firstTimeBuyer', '0');
  if (workplace.workLat != null && workplace.workLng != null) {
    params.set('workLat', String(workplace.workLat));
    params.set('workLng', String(workplace.workLng));
  }

  const res = await fetch(`/api/land/detective/apartment-compare?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '비교 데이터를 불러오지 못했습니다.');
  }
  if (data.success === false) {
    throw new Error(data.error || '비교 데이터를 불러오지 못했습니다.');
  }
  return {
    items: (data.items || []) as MyHomeCompareItem[],
    scoring: parseCompareScoring(data.scoring),
  };
}

export function scoringItemAt(
  scoring: CompareScoringPayload | null,
  index: number,
): CompareScoringItem | null {
  const items = scoring?.items;
  if (!items || index < 0 || index >= items.length) return null;
  return items[index];
}

export function formatMyHomePriceMan(v: number | null | undefined) {
  if (v == null || v <= 0) return '-';
  return `${(v / 10000).toFixed(1)}억`;
}

export function formatMyHomeRise(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}
