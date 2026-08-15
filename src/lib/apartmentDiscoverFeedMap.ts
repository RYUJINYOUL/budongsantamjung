import type { ApartmentDiscoverItem } from './fetchApartmentDiscover';
import type { ApartmentCardSnapshot } from './apartmentDiscoverFilters';

/** propertyTitle 선두에서 동·읍·면·리·가 추출 — "삼성동 힐스테이트" → "삼성동" */
export function extractDongFromAptTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const spaced = trimmed.match(/^([가-힣]+(?:동|읍|면|리|가))\s+/);
  if (spaced) return spaced[1];
  const merged = trimmed.match(/^([가-힣]{2,6}(?:동|읍|면|리|가))/);
  return merged ? merged[1] : null;
}

/** discover 아이템 → 카드 부제목(주소·지역). 타이틀과 동일한 값은 반환하지 않음 */
export function resolveDiscoverLocationLabel(item: ApartmentDiscoverItem): string {
  const address = (item.address || item.locationName || '').trim();
  if (address && address !== item.propertyTitle.trim()) return address;

  const dong = extractDongFromAptTitle(item.propertyTitle);
  if (dong && dong !== item.propertyTitle.trim()) return dong;

  return '';
}

export type DiscoverMappedAnalysis = {
  id: string;
  category: string;
  propertyTitle: string;
  lat?: number;
  lng?: number;
  aptSeq?: string;
  rtmsAptSeq?: string;
  masterId?: string;
  r114PropId?: string | null;
  householdCount?: number | null;
  avgPrice1m?: number | null;
  riseRate6m?: number | null;
  exclusiveArea?: number | null;
  area?: number | null;
  createdAt: string;
  hasReport?: boolean;
  latestReportId?: string | null;
  location: { name: string; address: string };
  propertyGrade: { overall: string; reason: string; riskScore: string };
};

export function mapDiscoverItemsToFeed(
  items: ApartmentDiscoverItem[],
  cacheKeyFn: (aptSeq: string, centerM2: number | null) => string,
): { list: DiscoverMappedAnalysis[]; cardUpdates: Record<string, ApartmentCardSnapshot> } {
  const cardUpdates: Record<string, ApartmentCardSnapshot> = {};
  const list = items.map((item) => {
    const centerM2 = item.centerM2 ?? item.exclusiveArea ?? item.area ?? null;
    if (item.aptSeq && centerM2 != null && item.card) {
      cardUpdates[cacheKeyFn(String(item.aptSeq), centerM2)] = item.card;
    }
    return {
      id: item.id,
      category: item.category || '아파트',
      propertyTitle: item.propertyTitle,
      lat: item.lat ?? undefined,
      lng: item.lng ?? undefined,
      aptSeq: item.aptSeq,
      rtmsAptSeq: item.rtmsAptSeq ?? item.aptSeq,
      masterId: item.masterId ?? undefined,
      r114PropId: item.r114PropId ?? undefined,
      householdCount: item.card?.hardware?.householdCount ?? null,
      avgPrice1m: item.avgPrice1m ?? item.card?.avgPrice1m ?? null,
      riseRate6m: item.riseRate6m ?? item.card?.riseRate6m ?? null,
      exclusiveArea: centerM2,
      area: centerM2,
      createdAt: item.createdAt ?? new Date().toISOString(),
      hasReport: item.hasReport,
      latestReportId: item.latestReportId,
      location: (() => {
        const subtitle = resolveDiscoverLocationLabel(item);
        return { name: subtitle, address: subtitle };
      })(),
      propertyGrade: {
        overall: item.propertyGrade?.overall ?? '-',
        reason: item.propertyGrade?.reason ?? '',
        riskScore: item.propertyGrade?.riskScore ?? String(item.aiScore ?? 0),
      },
    };
  });
  return { list, cardUpdates };
}
