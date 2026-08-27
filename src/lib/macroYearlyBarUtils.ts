import type { TenYearChartContextResponse } from '@/lib/tenYearChartContext';

export type MacroYearlyAgg = 'sum' | 'mean' | 'last';

export interface MacroYearlySeriesSpec {
  key: string;
  shortTitle: string;
  color: string;
  agg: MacroYearlyAgg;
}

export const LITE_YEARLY_MACRO_SERIES_ORDER: MacroYearlySeriesSpec[] = [
  { key: 'apt_median_price', shortTitle: '가격', color: '#ef4444', agg: 'mean' },
  { key: 'unsold_housing', shortTitle: '미분양', color: '#a855f7', agg: 'last' },
  { key: 'apt_trade_volume', shortTitle: '거래량', color: '#22c55e', agg: 'sum' },
  { key: 'loan_rate', shortTitle: '금리', color: '#f97316', agg: 'mean' },
  { key: 'm2', shortTitle: 'M2', color: '#eab308', agg: 'last' },
  { key: 'csi_housing_sale', shortTitle: 'CSI', color: '#ec4899', agg: 'mean' },
  { key: 'construction_cost_index', shortTitle: '공사비', color: '#94a3b8', agg: 'mean' },
  { key: 'construction_permit', shortTitle: '허가', color: '#0ea5e9', agg: 'sum' },
  { key: 'construction_start', shortTitle: '착공', color: '#6366f1', agg: 'sum' },
];

export interface MacroYearlyMetricBar {
  key: string;
  label: string;
  color: string;
  raw: number | null;
  /** 막대 높이용 (표시 구간 내 min-max) */
  barRatio: number | null;
  display: string;
  missing: boolean;
}

export interface MacroYearlyBarGroup {
  year: number;
  metrics: MacroYearlyMetricBar[];
}

function aggregateYear(values: Array<number | null | undefined>, agg: MacroYearlyAgg): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return null;
  switch (agg) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0);
    case 'last':
      return nums[nums.length - 1];
    default:
      return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}

/** Lite 막대 높이 — 같은 지표·표시 구간 내 상대 크기 */
export function normalizeBarRatio(value: number | null, min: number, max: number): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (max === min) return 0.55;
  const t = (value - min) / (max - min);
  return 0.12 + t * 0.88;
}

/** 만원 총액 → 억 */
export function totalManToEok(amountMan: number): number {
  return amountMan / 10_000;
}

/** ㎡당 만원 → 대표 전용㎡ → 억 (시군구 fallback) */
export function pricePerSqmToEok(ppsMan: number, exclusiveAreaM2: number): number {
  return (ppsMan * exclusiveAreaM2) / 10_000;
}

/** Lite yearly bar 셀 — 가격만 「억」, 나머지 숫자만 */
export function formatLiteMacroCell(
  key: string,
  raw: number | null,
  unit?: string,
  representativeAreaM2?: number | null,
): string {
  if (raw == null || !Number.isFinite(raw)) return '-';

  if (key === 'apt_median_price') {
    if (unit === '만원') {
      return `${totalManToEok(raw).toFixed(1)}억`;
    }
    const area = representativeAreaM2 != null && representativeAreaM2 > 0 ? representativeAreaM2 : null;
    if (!area) return '-';
    return `${pricePerSqmToEok(raw, area).toFixed(1)}억`;
  }

  if (key === 'loan_rate') {
    return raw % 1 === 0 ? String(raw) : raw.toFixed(1);
  }

  if (key === 'csi_housing_sale') {
    return String(Math.round(raw));
  }

  if (key === 'm2') {
    if (raw >= 1_000_000) return String(Math.round(raw / 1_000_000));
    if (raw >= 10_000) return String(Math.round(raw / 1_000));
    return String(Math.round(raw));
  }

  if (raw >= 10_000) return (raw / 10_000).toFixed(1);
  if (Number.isInteger(raw)) return String(raw);
  return raw.toFixed(1);
}

/** 막대 높이·추이 비교용 수치 (가격=억) */
function rawToChartValue(
  key: string,
  raw: number | null,
  unit?: string,
  representativeAreaM2?: number | null,
): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  if (key === 'apt_median_price') {
    if (unit === '만원') return totalManToEok(raw);
    const area = representativeAreaM2 != null && representativeAreaM2 > 0 ? representativeAreaM2 : null;
    if (!area) return null;
    return pricePerSqmToEok(raw, area);
  }
  return raw;
}

type ContextData = NonNullable<TenYearChartContextResponse['data']>;

export type BuildYearlyMacroBarsOptions = {
  minDisplayYear?: number | null;
  /** Lite 대표 전용㎡ — 가격 억 환산 (평형 picker 무관) */
  representativeAreaM2?: number | null;
};

export function buildYearlyMacroBars(
  ctx: ContextData,
  options?: BuildYearlyMacroBarsOptions,
): MacroYearlyBarGroup[] {
  const timeAxis = ctx.timeAxis || [];
  if (!timeAxis.length) return [];

  const representativeAreaM2 = options?.representativeAreaM2 ?? null;

  const byYear = new Map<number, typeof timeAxis>();
  for (const t of timeAxis) {
    const list = byYear.get(t.year) || [];
    list.push(t);
    byYear.set(t.year, list);
  }
  const allYears = [...byYear.keys()].sort((a, b) => a - b);
  const minYear = options?.minDisplayYear ?? null;
  const years =
    minYear != null ? allYears.filter((year) => year >= minYear) : allYears;
  if (!years.length) return [];

  const yearlyRaw: Record<string, Record<number, number | null>> = {};
  for (const spec of LITE_YEARLY_MACRO_SERIES_ORDER) {
    const block = ctx.series[spec.key];
    const pointMap = new Map((block?.points || []).map((p) => [p.key, p.value]));
    yearlyRaw[spec.key] = {};
    for (const year of years) {
      const quarters = [...(byYear.get(year) || [])].sort((a, b) => a.quarter - b.quarter);
      yearlyRaw[spec.key][year] = aggregateYear(
        quarters.map((q) => pointMap.get(q.key) ?? null),
        spec.agg,
      );
    }
  }

  const chartValuesByKey: Record<string, number[]> = {};
  for (const spec of LITE_YEARLY_MACRO_SERIES_ORDER) {
    const block = ctx.series[spec.key];
    chartValuesByKey[spec.key] = years
      .map((year) =>
        rawToChartValue(
          spec.key,
          yearlyRaw[spec.key]?.[year] ?? null,
          block?.unit,
          representativeAreaM2,
        ),
      )
      .filter((v): v is number => v != null && Number.isFinite(v));
  }

  const rangeByKey: Record<string, { min: number; max: number }> = {};
  for (const spec of LITE_YEARLY_MACRO_SERIES_ORDER) {
    const vals = chartValuesByKey[spec.key];
    if (!vals.length) {
      rangeByKey[spec.key] = { min: 0, max: 0 };
    } else {
      rangeByKey[spec.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
  }

  return years.map((year) => ({
    year,
    metrics: LITE_YEARLY_MACRO_SERIES_ORDER.map((spec) => {
      const block = ctx.series[spec.key];
      const raw = yearlyRaw[spec.key]?.[year] ?? null;
      const chartVal = rawToChartValue(spec.key, raw, block?.unit, representativeAreaM2);
      const { min, max } = rangeByKey[spec.key];
      return {
        key: spec.key,
        label: spec.shortTitle,
        color: spec.color,
        raw,
        barRatio: normalizeBarRatio(chartVal, min, max),
        display: formatLiteMacroCell(spec.key, raw, block?.unit, representativeAreaM2),
        missing: Boolean(block?.missing) && raw == null,
      };
    }),
  }));
}

/** @deprecated analyze 등 — 호/건 접미 표시 */
export function formatMacroYearlyRawDisplay(key: string, value: number | null, unit: string): string {
  if (value == null || !Number.isFinite(value)) return '-';
  if (unit === '호') return `${Math.round(value)}호`;
  if (unit === '건') return `${Math.round(value)}건`;
  if (unit === '동') return `${Math.round(value)}동`;
  if (key === 'apt_median_price') return `${Math.round(value)}만/㎡`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}
