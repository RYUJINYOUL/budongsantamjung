'use client';

import { ArrowRight, TrendingDown, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { buildPriceStorySummary, type ChangeDirection } from '@/lib/apartmentTenYearNarrative';
import type { ChartQuarterPoint } from '@/lib/apartmentTenYearStory';

interface ApartmentTenYearNarrativeProps {
  chartData: ChartQuarterPoint[];
  complexName: string;
  exclusiveArea?: number | null;
}

function changeStyles(direction: ChangeDirection) {
  switch (direction) {
    case 'up':
      return {
        badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
        price: 'text-emerald-300',
        icon: TrendingUpIcon,
      };
    case 'down':
      return {
        badge: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
        price: 'text-rose-300',
        icon: TrendingDown,
      };
    case 'flat':
      return {
        badge: 'bg-white/5 border-white/10 text-white/50',
        price: 'text-white/80',
        icon: null,
      };
    default:
      return {
        badge: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
        price: 'text-white',
        icon: null,
      };
  }
}

function badgeStyles(badge?: string) {
  switch (badge) {
    case '고점':
      return 'bg-amber-500/15 border-amber-500/25 text-amber-300';
    case '저점':
      return 'bg-rose-500/15 border-rose-500/25 text-rose-300';
    case '현재':
      return 'bg-sky-500/15 border-sky-500/25 text-sky-300';
    case '상승':
      return 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300';
    default:
      return 'bg-white/5 border-white/10 text-white/40';
  }
}

export default function ApartmentTenYearNarrative({
  chartData,
  complexName,
  exclusiveArea = null,
}: ApartmentTenYearNarrativeProps) {
  const summary = buildPriceStorySummary(chartData);
  if (!summary?.beats.length) return null;

  const areaLabel = exclusiveArea ? `전용 ${exclusiveArea}㎡` : '';
  const totalChange = summary.totalChangePct;
  const totalLabel =
    totalChange == null
      ? null
      : Math.abs(totalChange) < 3
        ? '보합'
        : totalChange > 0
          ? `+${Math.round(totalChange)}%`
          : `${Math.round(totalChange)}%`;

  return (
    <section className="w-full py-4 sm:p-6 bg-gradient-to-br from-sky-950/30 to-slate-900/50 border border-sky-500/20 rounded-[24px] sm:rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all duration-300 hover:border-sky-500/30 space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 text-center sm:text-left">
        <div className="flex flex-col items-center sm:items-start">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <TrendingUpIcon className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-400">핵심 시세 흐름</p>
          </div>
          <h3 className="text-white text-base sm:text-lg font-black tracking-tight pl-0 sm:pl-7">
            {complexName}
            {areaLabel && <span className="text-white/40 font-bold text-base ml-2">{areaLabel}</span>}
          </h3>
        </div>
        {totalLabel && (
          <div className="flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 mx-auto sm:mx-0">
            <span className="text-[10px] text-sky-400/70 font-semibold">시작 대비</span>
            <span
              className={`text-sm font-black ${
                totalChange != null && totalChange >= 3
                  ? 'text-emerald-300'
                  : totalChange != null && totalChange <= -3
                    ? 'text-rose-300'
                    : 'text-white/70'
              }`}
            >
              {totalLabel}
            </span>
          </div>
        )}
      </div>

      {/* 여정 요약: 시작 → 고점 → 현재 */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-2xl bg-sky-500/[0.04] border border-sky-500/15">
        {[
          { label: '시작', ...summary.opening },
          { label: '고점', ...summary.peak },
          { label: '현재', ...summary.current },
        ].map((node, idx, arr) => (
          <div key={node.label} className="contents">
            <div className="text-center min-w-0 flex-1">
              <p className="text-[10px] text-white/35 font-bold">{node.label}</p>
              <p className="text-[11px] text-white/50 font-semibold mt-0.5">{node.year}</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">{node.display}</p>
            </div>
            {idx < arr.length - 1 && (
              <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* 컬럼 헤더 */}
      <div className="hidden sm:grid grid-cols-[72px_1fr_88px] gap-3 px-4 text-[10px] font-black uppercase tracking-wider text-white/30">
        <span>연도</span>
        <span className="text-center">매매 평균</span>
        <span className="text-right">전년 대비</span>
      </div>

      {/* 핵심 연도 카드 리스트 (타임라인 앵커 연도 포함) */}
      <div className="space-y-2">
        {summary.beats.map((beat) => {
          const styles = changeStyles(beat.direction);
          const ChangeIcon = styles.icon;

          return (
            <article
              key={beat.id}
              className="grid grid-cols-[56px_1fr_72px] sm:grid-cols-[72px_1fr_88px] gap-2 sm:gap-3 items-center p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-sky-500/10 hover:border-sky-500/25 hover:bg-sky-500/[0.04] transition-all"
            >
              {/* 연도 */}
              <div>
                <p className="text-lg font-black text-white leading-none">{beat.year}</p>
                {beat.badge && (
                  <span
                    className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-black border ${badgeStyles(beat.badge)}`}
                  >
                    {beat.badge}
                  </span>
                )}
              </div>

              {/* 가격 — 히어로 */}
              <div className="text-center min-w-0">
                <p className={`text-2xl sm:text-3xl font-black tracking-tight ${styles.price}`}>
                  {beat.priceDisplay}
                </p>
                <p className="text-[11px] text-white/40 font-medium mt-0.5">{beat.theme}</p>
              </div>

              {/* 변동률 */}
              <div className="flex justify-end">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-sm font-black ${styles.badge}`}
                >
                  {ChangeIcon && <ChangeIcon className="w-3.5 h-3.5" />}
                  {beat.changeDisplay}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {summary.peakToCurrentPct != null && Math.abs(summary.peakToCurrentPct) >= 3 && (
        <p className="text-center text-[11px] text-white/40 font-medium">
          고점({summary.peak.year} {summary.peak.display}) 대비 현재{' '}
          <span className={summary.peakToCurrentPct < 0 ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>
            {summary.peakToCurrentPct > 0 ? '+' : ''}
            {Math.round(summary.peakToCurrentPct)}%
          </span>
        </p>
      )}
    </section>
  );
}
