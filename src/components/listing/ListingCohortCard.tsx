'use client';

import type { ListingLiteCohort } from '@/lib/listingInventory';

function isNationalLevel(level?: string | null): boolean {
  return !!level && (level.startsWith('L3') || level.includes('national'));
}

export default function ListingCohortCard({
  cohort,
  nearbyRows = [],
}: {
  cohort: ListingLiteCohort | null | undefined;
  nearbyRows?: Record<string, unknown>[];
}) {
  if (cohort?.appliedMultiplier != null) {
    const isRule = cohort.status === 'rule_fallback';
    const isRelaxed = cohort.status === 'cohort_relaxed';
    const isNational = isNationalLevel(cohort.level);
    const multiplierLabel = `${Number(cohort.appliedMultiplier).toFixed(2)}배`;
    const medianSampleN = cohort.usedFilter
      ? (cohort.filteredSampleCount ?? 0)
      : (cohort.cohortSampleCount ?? 0);
    const tradeSamples = cohort.tradeSamples ?? [];

    return (
      <section
        className={`rounded-2xl border p-4 shadow-sm ${
          isRelaxed
            ? 'border-amber-300 bg-gradient-to-br from-amber-50/90 to-white'
            : 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white'
        }`}
      >
        {isRelaxed && (
          <div className="mb-3 rounded-xl border border-amber-300 bg-amber-100/80 px-3 py-2">
            <p className="text-[11px] font-extrabold text-amber-900">
              {isNational ? '전국 참고 · 타지역 포함' : '유사 공시 표본 부족 · 완화 적용'}
            </p>
            <p className="text-[10px] text-amber-800/90 mt-0.5 leading-relaxed">
              {isNational
                ? '읍·면 인근 거래가 적어 전국 동일 용도·지목 실거래 median입니다. 아래 개별 건과 수치가 다를 수 있습니다.'
                : '공시 수준이 비슷한 표본이 적어 전체 풀 median을 사용했습니다.'}
            </p>
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p
              className={`text-[10px] font-black uppercase tracking-wider ${
                isRelaxed ? 'text-amber-800' : 'text-emerald-700'
              }`}
            >
              동일수급권 시장 참고
            </p>
            <p
              className={`text-2xl font-black mt-0.5 ${
                isRelaxed ? 'text-amber-900' : 'text-emerald-700'
              }`}
            >
              {multiplierLabel}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              실거래 ÷ 공시지가 · median 배율
            </p>
          </div>
          {!isRelaxed && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 shrink-0">
              {isRule ? '규칙 추정' : '동일수급권'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {medianSampleN > 0 && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
              median n={medianSampleN}
            </span>
          )}
          {isRelaxed && (cohort.filteredSampleCount ?? 0) > 0 && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-800">
              유사 공시 n={cohort.filteredSampleCount}
            </span>
          )}
          {cohort.confidenceGrade && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
              신뢰 {cohort.confidenceGrade}
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-500 font-medium mt-3 leading-relaxed">
          {isRule
            ? '동일수급권 실거래가 부족해 규칙 배율을 적용했습니다. 추정 매매가는 AI 분석에서 확인하세요.'
            : '필지별 추정가·상세 근거는 AI 분석에서 확인하세요.'}
        </p>

        {tradeSamples.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
            <p className="text-[10px] font-bold text-slate-500">
              median에 가까운 유사 공시 표본
            </p>
            {tradeSamples.map((trade, i) => {
              const ratio = trade.observedRatio ?? trade.ratio;
              const loc = [trade.sggNm, trade.umdNm].filter(Boolean).join(' ');
              const area = trade.dealArea ?? trade.area;
              return (
                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-semibold truncate">
                    {loc || String(trade.jimok || '-')}
                    {area != null ? ` · ${area}㎡` : ''}
                  </span>
                  <span
                    className={`font-bold shrink-0 ${
                      isRelaxed ? 'text-amber-800' : 'text-emerald-700'
                    }`}
                  >
                    {ratio != null ? `${Number(ratio).toFixed(2)}배` : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  if (nearbyRows.length > 0) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
        <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">
          동일수급권 표본 부족
        </p>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          이 지역은 동일 용도·지목 수급권 거래가 적습니다. 주변 실거래를 참고하거나 로드뷰·토지이음으로 현장을 확인해 주세요.
        </p>
        <div className="space-y-2">
          {nearbyRows.slice(0, 4).map((trade, i) => {
            const year = trade.dealYear;
            const month = trade.dealMonth;
            const day = trade.dealDay;
            const date = year ? `${year}.${month}.${day}` : '-';
            const amt = parseFloat(String(trade.dealAmount || '0').replace(/[^0-9]/g, '')) || 0;
            let priceLabel = `${amt.toLocaleString()}만`;
            if (amt >= 10000) {
              const eok = Math.floor(amt / 10000);
              const rest = Math.round(amt % 10000);
              priceLabel = rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
            }
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-amber-100"
              >
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold">{date}</p>
                  <p className="text-xs font-bold text-slate-700 truncate">
                    {String(trade.jimok || '-')} · {String(trade.dealArea || trade.area || '-')}㎡
                  </p>
                </div>
                <span className="text-sm font-black text-amber-700 shrink-0">
                  {priceLabel}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-700">시장 비교 데이터가 부족합니다</p>
      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
        로드뷰·토지이음으로 현장을 확인하거나, AI 분석으로 입지·가격을 검토해 보세요.
      </p>
    </section>
  );
}
