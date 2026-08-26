'use client';

import { useEffect, useMemo, useState } from 'react';
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

export interface MacroContextChartsProps {
  timeRefs: TenYearChartQuarterRef[];
  sigunguCd: string | null;
  sigunguLabel?: string | null;
  /** quarter = 아파트 분기 축, year = 공시지가 연도 축(연말) */
  axisMode?: 'quarter' | 'year';
}

const AXIS_NOTES: Record<'quarter' | 'year', string> = {
  quarter: '단위가 달라 차트를 겹치지 않고, 위 가격 차트와 같은 분기 축으로 세로 비교합니다.',
  year: '단위가 달라 차트를 겹치지 않고, 위 공시지가 차트와 같은 연도 축(연말 기준)으로 세로 비교합니다.',
};

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
}: {
  title: string;
  subtitle: string;
  unit: string;
  color: string;
  rows: Array<{ name: string; value: number | null }>;
  missing?: boolean;
}) {
  const hasData = rows.some((r) => r.value != null);

  return (
    <div className="border-t border-white/[0.06] pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-2 mb-1 px-0.5">
        <div className="min-w-0">
          <p className="text-[11px] font-black text-white/80">{title}</p>
          <p className="text-[9px] text-slate-500 truncate">{subtitle}</p>
        </div>
        {missing && (
          <span className="text-[9px] font-bold text-amber-400/90 shrink-0">데이터 준비 중</span>
        )}
      </div>
      <div className="h-[88px] sm:h-[96px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#334155"
                fontSize={8}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                stroke="#334155"
                fontSize={8}
                width={36}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatValue(v, unit)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111114',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '10px',
                }}
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
                activeDot={{ r: 4, strokeWidth: 1, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] text-slate-600">
            {missing ? '해당 시군구 미분양 데이터 없음' : '표시할 구간 없음'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MacroContextCharts({
  timeRefs,
  sigunguCd,
  sigunguLabel,
  axisMode = 'quarter',
}: MacroContextChartsProps) {
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

  const cacheKey =
    sigunguCd && quarters.length ? buildTenYearChartContextCacheKey(sigunguCd, quarters) : null;

  const [context, setContext] = useState<TenYearChartContextResponse['data'] | null>(() =>
    sigunguCd ? getCachedTenYearChartContext(sigunguCd, quarters) : null,
  );
  const [loading, setLoading] = useState(() => {
    if (!sigunguCd || !quarters.length) return false;
    return !getCachedTenYearChartContext(sigunguCd, quarters);
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sigunguCd || !quarters.length) {
      setContext(null);
      setLoading(false);
      return;
    }

    const cached = getCachedTenYearChartContext(sigunguCd, quarters);
    if (cached) {
      setContext(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTenYearChartContext(sigunguCd, quarters)
      .then((data) => {
        if (!cancelled) setContext(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '거시·미분양 데이터 로드 실패');
          setContext(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, sigunguCd, quarters.length]);

  if (!sigunguCd || !timeRefs.length) return null;

  return (
    <section className="w-full py-3 sm:p-6 bg-slate-900/80 border border-white/5 rounded-[24px] sm:rounded-[32px] shadow-xl space-y-1">
      <div className="px-1 sm:px-2 pb-2 border-b border-white/[0.06] mb-2">
        <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">동시기 맥락</span>
        <h4 className="text-sm sm:text-base font-bold text-white/90 mt-0.5">
          금리 · 통화량 · 미분양 현황 · CSI · 공사비
          {sigunguLabel ? (
            <span className="text-slate-500 font-medium text-xs sm:text-sm ml-1">({sigunguLabel})</span>
          ) : null}
        </h4>
        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{AXIS_NOTES[axisMode]}</p>
      </div>

      {loading && !context && (
        <p className="text-center text-[11px] text-slate-500 py-6">거시·미분양 데이터 불러오는 중…</p>
      )}
      {error && !context && !loading && (
        <p className="text-center text-[11px] text-rose-400/90 py-4">{error}</p>
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
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
