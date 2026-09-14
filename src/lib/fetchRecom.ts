import type { ApartmentDiscoverFilters } from './apartmentDiscoverFilters';
import type { InvestmentDiscoverFilters } from './investmentDiscoverFilters';
import { RECOM_INVESTMENT_MIN_AI_SCORE } from './investmentDiscoverFilters';
import type { RecomApartmentFilters, RecomReportFilters } from './recomFilters';
import { apartmentFiltersToParams, reportFiltersToParams } from './recomFilters';
import {
  INVESTMENT_PRICE_FILTER_MAX_EOK,
  isInvestmentPriceFilterActive,
} from './investmentDiscoverFilters';
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
  listingPriceMan?: number | null;
  estimatedTotalMan?: number | null;
  exclusiveAreaM2?: number | null;
  priceGapPercent?: number | null;
  priceGapLabel?: string | null;
  zoningGroup?: string | null;
  zoningLabel?: string | null;
  aiScore: number | null;
  detectiveNote?: string | null;
  oneLiner?: string | null;
  propertyGrade?: { riskScore?: string; overall?: string; reason?: string };
  createdAt?: string;
  updatedAt?: string;
  hasReport?: boolean;
  passBadge?: string | null;
  passBadgeLabel?: string | null;
  listingRatio?: number | null;
  recomSource?: string | null;
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

export async function fetchRecomApartmentReports(
  options?: {
    limit?: number;
    geo?: GeoOpts | null;
    maxPriceGap?: number;
    minAiScore?: number;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  },
): Promise<{ items: RecomReportItem[]; meta?: Record<string, unknown> }> {
  const params = new URLSearchParams();
  params.set('limit', String(options?.limit ?? 50));
  params.set('minAiScore', String(options?.minAiScore ?? RECOM_INVESTMENT_MIN_AI_SCORE));
  if (options?.maxPriceGap != null) {
    params.set('maxPriceGap', String(options.maxPriceGap));
  }
  appendGeo(params, options?.geo);

  const res = await fetch(`/api/recom/apartment-reports?${params.toString()}`, {
    cache: 'no-store',
    signal: options?.signal,
    headers: options?.headers,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = (errBody as { message?: string }).message
      || (res.status === 404
        ? '백엔드에 /api/recom/apartment-reports 가 아직 배포되지 않았습니다.'
        : `추천 아파트 조회 실패 (${res.status})`);
    throw new Error(msg);
  }
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
  const result: RecomReportFilters = {
    minAiScore: RECOM_INVESTMENT_MIN_AI_SCORE,
    category: (allowed as readonly string[]).includes(cat) ? cat : '전체',
  };
  if (isInvestmentPriceFilterActive(filters.priceMinEok, filters.priceMaxEok)) {
    if (filters.priceMinEok > 0) result.priceMinEok = filters.priceMinEok;
    if (filters.priceMaxEok < INVESTMENT_PRICE_FILTER_MAX_EOK) {
      result.priceMaxEok = filters.priceMaxEok;
    }
  }
  return result;
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

function formatManToEokShort(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '-';
  if (man >= 10000) {
    const eok = man / 10000;
    return `${eok >= 10 ? Math.round(eok) : eok.toFixed(1).replace(/\.0$/, '')}억`;
  }
  return `${Math.round(man).toLocaleString()}만`;
}

export function buildRecomApartmentPriceDisplay(item: Pick<
  RecomReportItem,
  'listingPriceMan' | 'estimatedTotalMan' | 'priceGapPercent' | 'priceGapLabel' | 'exclusiveAreaM2'
>) {
  const gap = item.priceGapPercent;
  const gapText = gap != null && Number.isFinite(gap)
    ? `${gap > 0 ? '+' : ''}${gap.toFixed(1)}% ${item.priceGapLabel || ''}`.trim()
    : '-';
  const gapTone = gap != null && Number.isFinite(gap)
    ? (gap <= -5 ? 'text-emerald-600' : gap >= 5 ? 'text-rose-600' : 'text-slate-600')
    : 'text-slate-500';

  return {
    col1Label: '제시가',
    col1Value: formatManToEokShort(item.listingPriceMan),
    col1ValueClassName: 'text-slate-800',
    col2Label: 'AI추정',
    col2Value: formatManToEokShort(item.estimatedTotalMan),
    col2ValueClassName: 'text-amber-700',
    col3Label: item.exclusiveAreaM2 != null ? `${item.exclusiveAreaM2}㎡` : '괴리',
    col3Value: gapText,
    col3ValueClassName: gapTone,
  };
}

export function mapRecomReportToFeedItem(item: RecomReportItem) {
  const aiScore = item.aiScore ?? 0;
  const hasReport = item.hasReport !== false;
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
    propertyGrade: item.propertyGrade ?? (hasReport ? {
      overall: aiScore >= 70 ? '우수' : aiScore >= 40 ? '보통' : '주의',
      reason: '',
      riskScore: String(aiScore),
    } : undefined),
    budgetMan: item.budgetMan ?? item.listingPriceMan ?? null,
    listingPriceMan: item.listingPriceMan ?? null,
    estimatedTotalMan: item.estimatedTotalMan ?? null,
    priceGapPercent: item.priceGapPercent ?? null,
    priceGapLabel: item.priceGapLabel ?? null,
    exclusiveArea: item.exclusiveAreaM2 ?? null,
    listingRatio: item.listingRatio ?? null,
    zoningGroup: item.zoningGroup ?? null,
    zoningLabel: item.zoningLabel ?? null,
    hasReport,
    latestReportId: hasReport ? item.id : null,
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
