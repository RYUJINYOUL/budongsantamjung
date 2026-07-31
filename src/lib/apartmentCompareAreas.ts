export type ApartmentAreaOption = {
  exclusiveAreaM2: number;
  tradeCount6m: number;
  /** false = 3y seed-only 등 — 시세·6m 거래 없음 */
  cardStatsAvailable?: boolean;
};

export const APARTMENT_AREA_NO_SALE_COPY = '최근 6개월 매매 없음';

export function formatAreaTradeSubtitle(area: ApartmentAreaOption): string {
  const hasSale =
    area.cardStatsAvailable === true
    || (area.cardStatsAvailable !== false && (area.tradeCount6m ?? 0) > 0);
  if (!hasSale) return APARTMENT_AREA_NO_SALE_COPY;
  return `최근 6개월 매매 ${area.tradeCount6m}건`;
}

export type ApartmentAreasResponse = {
  success?: boolean;
  rtmsAptSeq?: string | null;
  masterId?: string | null;
  complexName?: string | null;
  areas: ApartmentAreaOption[];
  error?: string | null;
};

/** areas API — aptKey = master id 또는 RTMS aptSeq (11410-73) */
export async function fetchApartmentAreas(aptKey: string): Promise<ApartmentAreasResponse> {
  const encoded = encodeURIComponent(aptKey.trim());
  const res = await fetch(`/api/land/detective/apartment/${encoded}/areas`, { cache: 'no-store' });
  const data = (await res.json().catch(() => ({}))) as ApartmentAreasResponse;
  if (!res.ok) {
    return {
      areas: [],
      error: (data as { error?: string }).error || '평형 목록을 불러오지 못했습니다.',
    };
  }
  return {
    ...data,
    areas: Array.isArray(data.areas) ? data.areas : [],
  };
}

/** discover는 masterId + rtms 둘 다 있음 — areas API는 둘 다 동일 row set (master 경로가 rtms-only 버그 회피에 유리했음) */
export function resolveAptKeyForAreas(input: {
  masterId?: string | null;
  rtmsAptSeq?: string | null;
}): string | null {
  const master = input.masterId?.trim();
  if (master) return master;
  const rtms = input.rtmsAptSeq?.trim();
  if (rtms) return rtms;
  return null;
}

/** 제안 면적과 가장 가까운 옵션 index */
export function pickDefaultAreaIndex(
  areas: ApartmentAreaOption[],
  suggestedM2?: number | null,
): number {
  if (areas.length === 0) return 0;
  if (suggestedM2 == null || !Number.isFinite(suggestedM2) || suggestedM2 <= 0) return 0;
  let bestIdx = 0;
  let bestDiff = Infinity;
  areas.forEach((a, i) => {
    const d = Math.abs(a.exclusiveAreaM2 - suggestedM2);
    if (d < bestDiff) {
      bestDiff = d;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export function formatAreaLabel(m2: number): string {
  const py = m2 / 3.3058;
  return `${m2.toFixed(1)}㎡ (약 ${py.toFixed(0)}평)`;
}
