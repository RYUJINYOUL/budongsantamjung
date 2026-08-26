'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildContextChartRows,
  buildTenYearChartContextCacheKey,
  fetchTenYearChartContext,
  getCachedTenYearChartContext,
  TEN_YEAR_CONTEXT_SERIES_ORDER,
  type TenYearChartContextResponse,
  type TenYearChartQuarterRef,
} from '@/lib/tenYearChartContext';

export type MacroContextChartsTheme = 'light' | 'dark';

export interface MacroContextChartsProps {
  /** useDefaultAxis=true 이면 생략 가능 (백엔드 10년 기본 분기 축) */
  timeRefs?: TenYearChartQuarterRef[];
  sigunguCd: string | null;
  sigunguLabel?: string | null;
  /** quarter = 아파트 분기 축, year = 공시지가 연도 축(연말) */
  axisMode?: 'quarter' | 'year';
  /** Lite 등 — sigunguCd만으로 최근 10년 분기 축 조회 */
  useDefaultAxis?: boolean;
  theme?: MacroContextChartsTheme;
  /** axisMode 기본 설명 대체 (Lite 등) */
  axisNote?: string;
}

const AXIS_NOTES: Record<'quarter' | 'year', string> = {
  quarter: '단위가 달라 차트를 겹치지 않고, 위 가격 차트와 같은 분기 축으로 세로 비교합니다.',
  year: '단위가 달라 차트를 겹치지 않고, 위 공시지가 차트와 같은 연도 축(연말 기준)으로 세로 비교합니다.',
};

const LITE_AXIS_NOTE =
  '단위가 달라 차트를 겹치지 않고, 최근 10년 분기 축으로 해당 시·군·구 거시·미분양 추이를 비교합니다.';

function chartUi(theme: MacroContextChartsTheme) {
  if (theme === 'light') {
    return {
      section: 'w-full py-3 px-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1',
      headerBorder: 'border-slate-200',
      badge: 'text-violet-600',
      title: 'text-slate-900',
      sigungu: 'text-slate-500',
      note: 'text-slate-500',
      loading: 'text-slate-500',
      error: 'text-rose-600',
      miniBorder: 'border-slate-100',
      miniTitle: 'text-slate-800',
      miniSubtitle: 'text-slate-500',
      missing: 'text-amber-600',
      empty: 'text-slate-400',
      gridStroke: '#f1f5f9',
      axisStroke: '#94a3b8',
      tooltip: {
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '10px',
        color: '#0f172a',
      },
      activeDotStroke: '#fff',
    };
  }
  return {
    section: 'w-full py-3 sm:p-6 bg-slate-900/80 border border-white/5 rounded-[24px] sm:rounded-[32px] shadow-xl space-y-1',
    headerBorder: 'border-white/[0.06]',
    badge: 'text-violet-400',
    title: 'text-white/90',
    sigungu: 'text-slate-500',
    note: 'text-slate-500',
    loading: 'text-slate-500',
    error: 'text-rose-400/90',
    miniBorder: 'border-white/[0.06]',
    miniTitle: 'text-white/80',
    miniSubtitle: 'text-slate-500',
    missing: 'text-amber-400/90',
    empty: 'text-slate-600',
    gridStroke: 'rgba(255,255,255,0.03)',
    axisStroke: '#334155',
    tooltip: {
      backgroundColor: '#111114',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      fontSize: '10px',
      color: '#fafafa',
    },
    activeDotStroke: '#fff',
  };
}

function formatValue(val: number | null | undefined, unit: string): string {
  if (val == null || Number.isNaN(val)) return '-';
  if (unit === '호') return `${Math.round(val).toLocaleString()}호`;
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 10_000) return `${(val / 10_000).toFixed(0)}만`;
  return val % 1 === 0 ? val.toLocaleString() : val.toFixed(2);
}

function ContextMiniChart({
  title,
  subtitle,
  unit,
  color,
  rows,
  missing,
  ui,
}: {
  title: string;
  subtitle: string;
  unit: string;
  color: string;
  rows: Array<{ name: string; value: number | null }>;
  missing?: boolean;
  ui: ReturnType<typeof chartUi>;
}) {
  const hasData = rows.some((r) => r.value != null);

  return (
    <div className={`border-t pt-3 first:border-t-0 first:pt-0 ${ui.miniBorder}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1 px-0.5">
        <div className="min-w-0">
          <p className={`text-[11px] font-black ${ui.miniTitle}`}>{title}</p>
          <p className={`text-[9px] truncate ${ui.miniSubtitle}`}>{subtitle}</p>
        </div>
        {missing && (
          <span className={`text-[9px] font-bold shrink-0 ${ui.missing}`}>데이터 준비 중</span>
        )}
      </div>
      <div className="h-[88px] sm:h-[96px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ui.gridStroke} vertical={false} />
              <XAxis
                dataKey="name"
                stroke={ui.axisStroke}
                fontSize={8}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                stroke={ui.axisStroke}
                fontSize={8}
                width={36}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatValue(v, unit)}
              />
              <Tooltip
                contentStyle={ui.tooltip}
                formatter={(val: number | string) => [formatValue(Number(val), unit), title]}
                labelFormatter={(label) => `${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 4, strokeWidth: 1, stroke: ui.activeDotStroke }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={`h-full flex items-center justify-center text-[10px] ${ui.empty}`}>
            {missing ? '해당 시군구 미분양 데이터 없음' : '표시할 구간 없음'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MacroContextCharts({
  timeRefs = [],
  sigunguCd,
  sigunguLabel,
  axisMode = 'quarter',
  useDefaultAxis = false,
  theme = 'dark',
  axisNote,
}: MacroContextChartsProps) {
  const ui = chartUi(theme);
  const noteText = axisNote ?? (theme === 'light' || useDefaultAxis ? LITE_AXIS_NOTE : AXIS_NOTES[axisMode]);
  const requestIdRef = useRef(0);

  const quarters = useMemo(
    () =>
      timeRefs.map((row) => ({
        year: row.year,
        quarter: row.quarter,
        name: row.name ?? String(row.year),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 축 내용만 비교 (배열 참조 변경 무시)
    [timeRefs.map((row) => `${row.year}-Q${row.quarter}:${row.name ?? ''}`).join('|')],
  );

  const fetchQuarters = useDefaultAxis ? undefined : quarters;
  const cacheKey = sigunguCd ? buildTenYearChartContextCacheKey(sigunguCd, fetchQuarters) : null;
  const canFetch = Boolean(sigunguCd && (useDefaultAxis || quarters.length > 0));

  const [context, setContext] = useState<TenYearChartContextResponse['data'] | null>(() =>
    canFetch && sigunguCd ? getCachedTenYearChartContext(sigunguCd, fetchQuarters) : null,
  );
  const [loading, setLoading] = useState(() => {
    if (!canFetch || !sigunguCd) return false;
    return !getCachedTenYearChartContext(sigunguCd, fetchQuarters);
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canFetch || !sigunguCd) {
      setContext(null);
      setLoading(false);
      return;
    }

    const cached = getCachedTenYearChartContext(sigunguCd, fetchQuarters);
    if (cached) {
      setContext(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    fetchTenYearChartContext(sigunguCd, fetchQuarters)
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setContext(data);
        if (!data) setError('거시·미분양 데이터를 불러오지 못했습니다');
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : '거시·미분양 데이터 로드 실패');
        setContext(null);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false);
      });
  }, [cacheKey, canFetch, sigunguCd]);

  if (!canFetch) return null;

  return (
    <section className={ui.section}>
      <div className={`px-0.5 pb-2 border-b mb-2 ${ui.headerBorder}`}>
        <span className={`text-[10px] font-black uppercase tracking-widest ${ui.badge}`}>동시기 맥락</span>
        <h4 className={`text-sm font-bold mt-0.5 ${ui.title}`}>
          금리 · 통화량 · 미분양 현황 · CSI · 공사비
          {sigunguLabel ? (
            <span className={`font-medium text-xs ml-1 ${ui.sigungu}`}>({sigunguLabel})</span>
          ) : null}
        </h4>
        <p className={`text-[10px] mt-1 leading-relaxed ${ui.note}`}>{noteText}</p>
      </div>

      {loading && !context && (
        <p className={`text-center text-[11px] py-6 ${ui.loading}`}>거시·미분양 데이터 불러오는 중…</p>
      )}
      {error && !context && !loading && (
        <p className={`text-center text-[11px] py-4 ${ui.error}`}>{error}</p>
      )}

      {context && (
        <div className="space-y-0">
          {TEN_YEAR_CONTEXT_SERIES_ORDER.map(({ key, shortTitle, subtitle, color }) => {
            const block = context.series[key];
            const rows = buildContextChartRows(context.timeAxis, context.series, key);
            const isUnsold = key === 'unsold_housing';
            const missing = block?.missing || (isUnsold && !context.unsold?.available);
            const regionHint = isUnsold
              ? block?.regionLabel || context.unsold?.regionLabel || sigunguLabel
              : null;
            return (
              <ContextMiniChart
                key={key}
                title={shortTitle}
                subtitle={
                  regionHint
                    ? `${subtitle} · ${regionHint}`
                    : block?.label || subtitle
                }
                unit={block?.unit || (isUnsold ? '호' : '')}
                color={color}
                rows={rows}
                missing={missing}
                ui={ui}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
