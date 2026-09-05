import type { ApartmentDiscoverFilters } from './apartmentDiscoverFilters';
import type { InvestmentDiscoverFilters } from './investmentDiscoverFilters';
import { RECOM_INVESTMENT_MIN_AI_SCORE } from './investmentDiscoverFilters';
import type { RecomApartmentFilters, RecomReportFilters } from './recomFilters';
import { apartmentFiltersToParams, reportFiltersToParams } from './recomFilters';
import { mapR114LiteDiscoverToFeedItem, type R114LiteDiscoverItem } from './fetchR114LiteDiscover';

export type RecomApartmentItem = {
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
  riseRate1y?: number | null;
  riseRate3y?: number | null;
  riseRate5y?: number | null;
  riseRate10y?: number | null;
  avgPrice1m?: number | null;
  avgPriceMonth?: string | null;
  tradeSparse?: boolean;
  hasReport?: boolean;
  latestReportId?: string | null;
};

export type RecomReportItem = {
  id: string;
  category: string;
  propertyTitle: string;
  address?: string | null;
  lat: number | null;
  lng: number | null;
  bldNm?: string | null;
  budgetMan?: number | null;
  aiScore: number;
  detectiveNote?: string | null;
  oneLiner?: string | null;
  propertyGrade?: { riskScore?: string; overall?: string; reason?: string };
  createdAt?: string;
  updatedAt?: string;
  hasReport?: boolean;
};

type GeoOpts = { lat: number; lng: number; radiusKm: number };

function appendGeo(params: URLSearchParams, geo?: GeoOpts | null) {
  if (!geo) return;
  params.set('lat', String(geo.lat));
  params.set('lng', String(geo.lng));
  params.set('radius', String(geo.radiusKm));
}

export async function fetchRecomApartments(
  filters: RecomApartmentFilters,
  options?: {
    limit?: number;
    geo?: GeoOpts | null;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  },
): Promise<{ items: RecomApartmentItem[]; meta?: Record<string, unknown> }> {
  const params = apartmentFiltersToParams(filters);
  params.set('limit', String(options?.limit ?? 50));
  appendGeo(params, options?.geo);

  const res = await fetch(`/api/recom/apartments?${params.toString()}`, {
    cache: 'no-store',
    signal: options?.signal,
    headers: options?.headers,
  });
  if (!res.ok) return { items: [] };
  const data = await res.json();
  return {
    items: Array.isArray(data.items) ? data.items : [],
    meta: data.meta,
  };
}

export async function fetchRecomReports(
  filters: RecomReportFilters,
  options?: {
    limit?: number;
    geo?: GeoOpts | null;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  },
): Promise<{ items: RecomReportItem[]; meta?: Record<string, unknown> }> {
  const params = reportFiltersToParams(filters);
  params.set('limit', String(options?.limit ?? 50));
  appendGeo(params, options?.geo);

  const res = await fetch(`/api/recom/reports?${params.toString()}`, {
    cache: 'no-store',
    signal: options?.signal,
    headers: options?.headers,
  });
  if (!res.ok) return { items: [] };
  const data = await res.json();
  return {
    items: Array.isArray(data.items) ? data.items : [],
    meta: data.meta,
  };
}

export function apartmentDiscoverToRecomFilters(
  filters: ApartmentDiscoverFilters,
): RecomApartmentFilters {
  return {
    minRiseRate1y: filters.minRiseRate1y != null,
    minRiseRate3y: filters.minRiseRate3y != null,
    minRiseRate10y: filters.minRiseRate10y != null,
    minRiseRate5y: filters.minRiseRate5y != null,
  };
}

export function investmentDiscoverToRecomFilters(
  filters: InvestmentDiscoverFilters,
  category: string,
): RecomReportFilters {
  const cat = category as RecomReportFilters['category'];
  const allowed = ['전체', '토지', '빌딩'] as const;
  const minAiScore = filters.minAiScore ?? RECOM_INVESTMENT_MIN_AI_SCORE;
  return {
    minAiScore: Math.max(RECOM_INVESTMENT_MIN_AI_SCORE, minAiScore),
    category: (allowed as readonly string[]).includes(cat) ? cat : '전체',
  };
}

export function mapRecomApartmentToFeedItem(item: RecomApartmentItem) {
  const lite: R114LiteDiscoverItem = {
    r114PropId: item.r114PropId,
    title: item.title,
    city: item.city,
    gu: item.gu,
    dong: item.dong,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    householdCount: item.householdCount,
    exclusiveAreaM2: item.exclusiveAreaM2,
    saleCount6m: item.saleCount6m,
    riseRate6m: item.riseRate6m,
    riseRate1y: item.riseRate1y,
    riseRate3y: item.riseRate3y,
    riseRate5y: item.riseRate5y,
    riseRate10y: item.riseRate10y,
    avgPrice1m: item.avgPrice1m,
    avgPriceMonth: item.avgPriceMonth,
    tradeSparse: item.tradeSparse ?? false,
    hasReport: item.hasReport,
    latestReportId: item.latestReportId,
  };
  return mapR114LiteDiscoverToFeedItem(lite);
}

export function mapRecomReportToFeedItem(item: RecomReportItem) {
  const aiScore = item.aiScore ?? 0;
  return {
    id: item.id,
    category: item.category,
    propertyTitle: item.propertyTitle,
    bldNm: item.bldNm ?? undefined,
    lat: item.lat ?? undefined,
    lng: item.lng ?? undefined,
    location: item.address
      ? { name: item.address, address: item.address }
      : undefined,
    detectiveNote: item.detectiveNote ?? undefined,
    oneLiner: item.oneLiner ?? undefined,
    propertyGrade: item.propertyGrade ?? {
      overall: aiScore >= 70 ? '우수' : aiScore >= 40 ? '보통' : '주의',
      reason: '',
      riskScore: String(aiScore),
    },
    budgetMan: item.budgetMan ?? null,
    hasReport: true,
    latestReportId: item.id,
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
}

export function buildRecomAptCardDisplay(item: RecomApartmentItem) {
  const areaStr = item.exclusiveAreaM2 != null && item.exclusiveAreaM2 > 0
    ? `${Number(item.exclusiveAreaM2).toFixed(2)}㎡`
    : '-';
  const rise5y = item.riseRate5y;
  const rise10y = item.riseRate10y;
  const fmt = (v: number | null | undefined) => {
    if (v == null || !Number.isFinite(v)) return '-';
    return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  };
  const tone = (v: number | null | undefined) => {
    if (v == null || !Number.isFinite(v)) return 'text-slate-500';
    if (v >= 30) return 'text-emerald-600';
    if (v > 0) return 'text-sky-600';
    if (v < 0) return 'text-rose-600';
    return 'text-slate-500';
  };

  return {
    col1Label: '5년',
    col1Value: fmt(rise5y),
    col1ValueClassName: tone(rise5y),
    col2Label: '10년',
    col2Value: fmt(rise10y),
    col2ValueClassName: tone(rise10y),
    col3Label: '전용면적',
    col3Value: areaStr,
  };
}
