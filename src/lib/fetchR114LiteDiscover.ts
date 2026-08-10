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
};

function householdSortKey(item: MergeFeedItem): number {
  return item.householdCount ?? 0;
}

/** discover feed → 홈 Analysis 행 */
export function mapR114LiteDiscoverToFeedItem(item: R114LiteDiscoverItem) {
  const subtitle = (item.address || [item.gu, item.dong].filter(Boolean).join(' ')).trim();
  const hasReport = !!item.hasReport && !!item.latestReportId;
  const riskScore = item.riskScore && item.riskScore !== '0' ? item.riskScore : '0';
  return {
    id: hasReport ? String(item.latestReportId) : `lite-${item.r114PropId}`,
    r114PropId: item.r114PropId,
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

/** analyzed discover + Lite — 세대수 기준 섞기 (Lite가 목록 맨 아래로 밀리지 않도록) */
export function mergeDiscoverWithR114Lite<T extends MergeFeedItem>(
  analyzed: T[],
  liteItems: T[],
): T[] {
  const seen = new Set<string>();
  for (const a of analyzed) {
    if (a.r114PropId) seen.add(a.r114PropId);
    if (a.id?.startsWith('lite-')) seen.add(a.id.slice(5));
  }
  const extra = liteItems.filter((l) => {
    const pid = l.r114PropId || (l.id?.startsWith('lite-') ? l.id.slice(5) : '');
    if (!pid || seen.has(pid)) return false;
    seen.add(pid);
    return true;
  });
  const merged = [...analyzed, ...extra];
  merged.sort((a, b) => {
    const byHousehold = householdSortKey(b) - householdSortKey(a);
    if (byHousehold !== 0) return byHousehold;
    return (a.propertyTitle || '').localeCompare(b.propertyTitle || '', 'ko');
  });
  return merged;
}
