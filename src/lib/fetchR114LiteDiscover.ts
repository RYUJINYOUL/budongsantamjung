/**
 * r114 Lite discover — viewport 내 단지 목록
 */
import type { ApartmentDiscoverFilters } from './apartmentDiscoverFilters';
import { defaultApartmentDiscoverFilters } from './apartmentDiscoverFilters';
import { discoverFiltersToSearchParams } from './fetchApartmentDiscover';

export type R114LiteDiscoverItem = {
  r114PropId: string;
  title: string;
  city?: string | null;
  gu?: string | null;
  dong?: string | null;
  address?: string | null;
  lat: number | null;
  lng: number | null;
  householdCount?: number | null;
  exclusiveAreaM2?: number | null;
  saleCount6m: number;
  riseRate6m?: number | null;
  riseRate5y?: number | null;
  riseRate10y?: number | null;
  avgPrice1m?: number | null;
  avgPriceMonth?: string | null;
  latestSaleMan?: number | null;
  tradeSparse: boolean;
  cardStatsMessage?: string | null;
  jeonseRiseRate6m?: number | null;
  avgJeonseDeposit1m?: number | null;
  jeonseCount6m?: number;
  wolseRiseRate6m?: number | null;
  avgWolseMonthlyRent1m?: number | null;
  wolseCount6m?: number;
  hasReport?: boolean;
  latestReportId?: string | null;
  riskScore?: string | null;
  variantCount?: number;
  defaultPropId?: string | null;
};

export async function fetchR114LiteDiscover(
  geo: { lat: number; lng: number; radiusKm: number },
  init?: RequestInit,
  options?: { limit?: number; filters?: ApartmentDiscoverFilters },
): Promise<{ items: R114LiteDiscoverItem[]; meta?: { count?: number } }> {
  const params = discoverFiltersToSearchParams(
    options?.filters ?? defaultApartmentDiscoverFilters(),
    geo,
    { analyzedOnly: false },
  );
  params.set('limit', String(options?.limit ?? 50));
  const res = await fetch(`/api/r114/discover?${params.toString()}`, {
    ...init,
    cache: 'no-store',
  });
  if (!res.ok) {
    return { items: [] };
  }
  const data = await res.json();
  return {
    items: Array.isArray(data.items) ? data.items : [],
    meta: data.meta,
  };
}

type MergeFeedItem = {
  r114PropId?: string | null;
  id?: string;
  propertyTitle?: string;
  householdCount?: number | null;
  lat?: number;
  lng?: number;
  hasReport?: boolean;
  latestReportId?: string | null;
  aptSeq?: string | null;
  rtmsAptSeq?: string | null;
};

const MERGE_NEAR_KM = 0.35;

function householdSortKey(item: MergeFeedItem): number {
  return item.householdCount ?? 0;
}

function normalizeComplexTitle(title: string | undefined | null): string {
  return (title || '').trim().replace(/\s+/g, '').toLowerCase();
}

function haversineKm(
  a: { lat?: number; lng?: number },
  b: { lat?: number; lng?: number },
): number | null {
  const lat1 = a.lat;
  const lng1 = a.lng;
  const lat2 = b.lat;
  const lng2 = b.lng;
  if (
    lat1 == null || lng1 == null || lat2 == null || lng2 == null
    || !Number.isFinite(lat1) || !Number.isFinite(lng1)
    || !Number.isFinite(lat2) || !Number.isFinite(lng2)
  ) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isSameComplex(a: MergeFeedItem, b: MergeFeedItem): boolean {
  const pidA = a.r114PropId?.trim();
  const pidB = b.r114PropId?.trim();
  if (pidA && pidB && pidA === pidB) return true;

  const rtmsA = (a.rtmsAptSeq || a.aptSeq || '').trim();
  const rtmsB = (b.rtmsAptSeq || b.aptSeq || '').trim();
  if (rtmsA && rtmsB && rtmsA === rtmsB) return true;

  const titleA = normalizeComplexTitle(a.propertyTitle);
  const titleB = normalizeComplexTitle(b.propertyTitle);
  if (!titleA || titleA !== titleB) return false;

  const dist = haversineKm(a, b);
  return dist != null && dist <= MERGE_NEAR_KM;
}

function enrichAnalyzedWithLiteR114<T extends MergeFeedItem>(
  analyzed: T[],
  liteItems: T[],
): T[] {
  return analyzed.map((item) => {
    if (item.r114PropId?.trim()) return item;
    const match = liteItems.find(
      (lite) => lite.r114PropId?.trim() && isSameComplex(item, lite),
    );
    if (!match?.r114PropId) return item;
    return {
      ...item,
      r114PropId: match.r114PropId,
      variantCount: (match as { variantCount?: number }).variantCount ?? (item as { variantCount?: number }).variantCount,
      lat: match.lat ?? item.lat,
      lng: match.lng ?? item.lng,
    };
  });
}

/** discover feed → 홈 Analysis 행 */
export function mapR114LiteDiscoverToFeedItem(item: R114LiteDiscoverItem) {
  const subtitle = (item.address || [item.gu, item.dong].filter(Boolean).join(' ')).trim();
  const hasReport = !!item.hasReport && !!item.latestReportId;
  const riskScore = item.riskScore && item.riskScore !== '0' ? item.riskScore : '0';
  return {
    id: hasReport ? String(item.latestReportId) : `lite-${item.r114PropId}`,
    r114PropId: item.r114PropId,
    variantCount: item.variantCount ?? 1,
    category: '아파트',
    propertyTitle: item.title,
    lat: item.lat ?? undefined,
    lng: item.lng ?? undefined,
    hasReport: hasReport ? true : false,
    latestReportId: item.latestReportId ?? null,
    liteBadge: !hasReport,
    householdCount: item.householdCount ?? null,
    avgPrice1m: item.avgPrice1m ?? item.latestSaleMan ?? null,
    riseRate6m: item.riseRate6m ?? null,
    riseRate5y: item.riseRate5y ?? null,
    riseRate10y: item.riseRate10y ?? null,
    exclusiveArea: item.exclusiveAreaM2 ?? null,
    area: item.exclusiveAreaM2 ?? null,
    jeonseRiseRate6m: item.jeonseRiseRate6m ?? null,
    avgJeonseDeposit1m: item.avgJeonseDeposit1m ?? null,
    wolseRiseRate6m: item.wolseRiseRate6m ?? null,
    avgWolseMonthlyRent1m: item.avgWolseMonthlyRent1m ?? null,
    createdAt: new Date().toISOString(),
    location: subtitle ? { name: subtitle, address: subtitle } : undefined,
    propertyGrade: hasReport
      ? { overall: '-', reason: '', riskScore }
      : { overall: '-', reason: '', riskScore: '0' },
    tradeSparse: item.tradeSparse,
    saleCount6m: item.saleCount6m,
  };
}

export type MergeDiscoverSort = 'household' | 'distance';

/** analyzed discover + Lite — 중복 제거 후 정렬 (기본: 세대수, 검색 시: 센터 거리) */
export function mergeDiscoverWithR114Lite<T extends MergeFeedItem>(
  analyzed: T[],
  liteItems: T[],
  options?: { sort?: MergeDiscoverSort; center?: { lat: number; lng: number } },
): T[] {
  const enrichedAnalyzed = enrichAnalyzedWithLiteR114(analyzed, liteItems);

  const extra = liteItems.filter(
    (lite) => !enrichedAnalyzed.some((item) => isSameComplex(item, lite)),
  );

  const merged = [...enrichedAnalyzed, ...extra];
  const sortMode = options?.sort ?? 'household';
  const center = options?.center;

  if (sortMode === 'distance' && center) {
    merged.sort((a, b) => {
      const distA = haversineKm(a, center) ?? Infinity;
      const distB = haversineKm(b, center) ?? Infinity;
      if (distA !== distB) return distA - distB;
      return (a.propertyTitle || '').localeCompare(b.propertyTitle || '', 'ko');
    });
  } else {
    merged.sort((a, b) => {
      const byHousehold = householdSortKey(b) - householdSortKey(a);
      if (byHousehold !== 0) return byHousehold;
      return (a.propertyTitle || '').localeCompare(b.propertyTitle || '', 'ko');
    });
  }
  return merged;
}
