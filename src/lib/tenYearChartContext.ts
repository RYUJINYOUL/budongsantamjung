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

/** 공시지가 연도 축 → API 분기 ref (연말 Q4 값) */
export function buildYearEndTimeRefs(
  years: Array<{ year: number | string }>,
): TenYearChartQuarterRef[] {
  return years
    .map((d) => {
      const year = Number(d.year);
      if (!Number.isFinite(year)) return null;
      return { year, quarter: 4, name: String(year) };
    })
    .filter((ref): ref is TenYearChartQuarterRef => ref != null);
}

export async function fetchTenYearChartContext(
  sigunguCd: string,
  quarters: TenYearChartQuarterRef[],
): Promise<TenYearChartContextResponse['data'] | null> {
  if (!sigunguCd || !quarters.length) return null;

  const params = new URLSearchParams({
    sigunguCd,
    quarters: JSON.stringify(
      quarters.map((q) => ({
        year: q.year,
        quarter: q.quarter,
        name: q.name,
      })),
    ),
  });

  const res = await fetch(`/api/land/detective/ten-year-chart-context?${params.toString()}`);
  const json = (await res.json()) as TenYearChartContextResponse;
  if (!res.ok || !json.success || !json.data) {
    return null;
  }
  return json.data;
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
