/**
 * 10년스토리 · 공시지가 — 거시·미분양 시계열 (가격 차트와 동일 시간축)
 */

export interface TenYearChartQuarterRef {
  year: number;
  quarter: number;
  name?: string;
}

export interface TenYearChartSeriesPoint {
  key: string;
  value: number | null;
  missing: boolean;
}

export interface TenYearChartSeriesBlock {
  key: string;
  label: string;
  unit: string;
  missing?: boolean;
  regionLabel?: string | null;
  points: TenYearChartSeriesPoint[];
}

export interface TenYearChartContextResponse {
  success: boolean;
  data?: {
    sigunguCd: string;
    timeAxis: Array<{ key: string; name: string; year: number; quarter: number }>;
    series: Record<string, TenYearChartSeriesBlock>;
    unsold: {
      available: boolean;
      sigunguCd: string;
      regionLabel?: string | null;
      rowCount?: number;
      source?: string;
    };
  };
  message?: string;
}

export const TEN_YEAR_CONTEXT_SERIES_ORDER = [
  { key: 'unsold_housing', shortTitle: '미분양 현황', subtitle: '시·군·구 미분양(호)', color: '#a855f7' },
  { key: 'loan_rate', shortTitle: '금리', subtitle: '예금은행 대출금리', color: '#f97316' },
  { key: 'm2', shortTitle: 'M2', subtitle: '통화량 말잔', color: '#eab308' },
  { key: 'csi_housing_sale', shortTitle: 'CSI', subtitle: '주택매매 소비심리', color: '#ec4899' },
  { key: 'construction_cost_index', shortTitle: '공사비', subtitle: '건설공사비지수', color: '#94a3b8' },
] as const;

function quarterAxisLabel(year: number, quarter: number): string {
  const shortYear = String(year).slice(-2);
  return `${shortYear}-${quarter}Q`;
}

/** 최근 10년 분기 축 (백엔드 buildDefaultTimeAxis와 동일) */
export function buildDefaultQuarterTimeRefs(): TenYearChartQuarterRef[] {
  const end = new Date();
  end.setMonth(end.getMonth() - 1);
  const endYear = end.getFullYear();
  const endQuarter = Math.ceil((end.getMonth() + 1) / 3);
  const startYear = endYear - 9;

  const refs: TenYearChartQuarterRef[] = [];
  for (let y = startYear; y <= endYear; y += 1) {
    const qMax = y === endYear ? endQuarter : 4;
    for (let q = 1; q <= qMax; q += 1) {
      refs.push({ year: y, quarter: q, name: quarterAxisLabel(y, q) });
    }
  }
  return refs;
}

/** 공시지가 연도 축 → API 분기 ref (연말 Q4 값) */
export function buildYearEndTimeRefs(
  years: Array<{ year: number | string }>,
): TenYearChartQuarterRef[] {
  return years.flatMap((d) => {
    const year = Number(d.year);
    if (!Number.isFinite(year)) return [];
    return [{ year, quarter: 4, name: String(year) }];
  });
}

const DEFAULT_AXIS_CACHE_SUFFIX = 'default';
const FETCH_TIMEOUT_MS = 30_000;

/** fetch 캐시 키 — 배열 참조가 아닌 축 내용만 사용 */
export function buildTenYearChartContextCacheKey(
  sigunguCd: string,
  quarters?: TenYearChartQuarterRef[],
): string {
  if (!quarters?.length) return `${sigunguCd}|${DEFAULT_AXIS_CACHE_SUFFIX}`;
  const axis = quarters.map((q) => `${q.year}-Q${q.quarter}`).join(',');
  return `${sigunguCd}|${axis}`;
}

type TenYearChartContextData = NonNullable<TenYearChartContextResponse['data']>;

const contextCache = new Map<string, TenYearChartContextData>();
const inflightRequests = new Map<string, Promise<TenYearChartContextData | null>>();

export function getCachedTenYearChartContext(
  sigunguCd: string,
  quarters?: TenYearChartQuarterRef[],
): TenYearChartContextData | null {
  if (!sigunguCd) return null;
  return contextCache.get(buildTenYearChartContextCacheKey(sigunguCd, quarters)) ?? null;
}

export async function fetchTenYearChartContext(
  sigunguCd: string,
  quarters?: TenYearChartQuarterRef[],
): Promise<TenYearChartContextResponse['data'] | null> {
  if (!sigunguCd) return null;

  const cacheKey = buildTenYearChartContextCacheKey(sigunguCd, quarters);
  const cached = contextCache.get(cacheKey);
  if (cached) return cached;

  const pending = inflightRequests.get(cacheKey);
  if (pending) return pending;

  const params = new URLSearchParams({ sigunguCd });
  if (quarters?.length) {
    params.set(
      'quarters',
      JSON.stringify(
        quarters.map((q) => ({
          year: q.year,
          quarter: q.quarter,
          name: q.name,
        })),
      ),
    );
  }

  const request = (async () => {
    const res = await fetch(`/api/land/detective/ten-year-chart-context?${params.toString()}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const json = (await res.json()) as TenYearChartContextResponse;
    if (!res.ok || !json.success || !json.data) {
      return null;
    }
    contextCache.set(cacheKey, json.data);
    return json.data;
  })().finally(() => {
    inflightRequests.delete(cacheKey);
  });

  inflightRequests.set(cacheKey, request);
  return request;
}

/** API timeAxis + series → recharts용 행 (name = 가격 차트 X축 라벨) */
export function buildContextChartRows(
  timeAxis: TenYearChartContextResponse['data']['timeAxis'],
  series: TenYearChartContextResponse['data']['series'],
  seriesKey: string,
): Array<{ name: string; value: number | null }> {
  if (!timeAxis?.length) return [];
  const block = series?.[seriesKey];
  if (!block) {
    return timeAxis.map((t) => ({ name: t.name, value: null }));
  }
  const byKey = new Map(block.points.map((p) => [p.key, p.value]));
  return timeAxis.map((t) => ({
    name: t.name,
    value: byKey.get(t.key) ?? null,
  }));
}
