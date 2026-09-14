'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import {
  extractReferenceAppraisal,
  formatReferenceAppraisalGap,
  formatReferenceAppraisalPrice,
  resolveServerEstimateDisplay,
} from '../../lib/referenceAppraisalHelpers';
import { formatManwon } from '../../lib/formatAuctionPrice';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  category?: string;
  compact?: boolean;
};

export default function ReferenceAppraisalBlock({
  ai,
  mergedData,
  category,
  compact = false,
}: Props) {
  const ref = extractReferenceAppraisal(ai);
  if (!ref) return null;

  const gapLabel = formatReferenceAppraisalGap(ref);
  const serverEstimate = resolveServerEstimateDisplay(ai, { mergedData, category });

  if (compact) {
    return (
      <div className="rounded-xl border border-slate-400/25 bg-slate-500/[0.08] px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Scale className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {ref.label || '법원 감정가'} · 참고
            </p>
            <p className="text-lg font-black text-slate-100 mt-0.5">
              {formatReferenceAppraisalPrice(ref)}
            </p>
            {serverEstimate && (
              <p className="text-[10px] text-amber-200/90 mt-1.5">
                AI 추정가 {serverEstimate.primary}
              </p>
            )}
            {gapLabel && (
              <p className="text-[10px] text-slate-400 mt-1">{gapLabel}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[20px] border border-slate-400/20 bg-slate-500/[0.06] p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-xl border border-slate-400/25 bg-slate-500/10">
          <Scale className="w-4 h-4 text-slate-300" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100">{ref.label || '법원 감정가'}</p>
          <p className="text-[10px] text-slate-400">경매 공고 참고값 · 서버 추정가와 별도</p>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-3 ${
          serverEstimate && ref.minPriceMan != null && ref.minPriceMan > 0
            ? 'sm:grid-cols-3'
            : serverEstimate || (ref.minPriceMan != null && ref.minPriceMan > 0)
              ? 'sm:grid-cols-2'
              : ''
        }`}
      >
        <div className="rounded-xl border border-slate-400/15 bg-black/10 p-4">
          <p className="text-[11px] text-slate-400 mb-1">감정평가액</p>
          <p className="text-2xl font-black text-slate-100">{formatReferenceAppraisalPrice(ref)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {Number(ref.appraisalPriceMan).toLocaleString('ko-KR')}만원
          </p>
        </div>
        {serverEstimate && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
            <p className="text-[11px] text-amber-200/80 mb-1">AI 추정가</p>
            <p className="text-2xl font-black text-amber-100">{serverEstimate.primary}</p>
            {serverEstimate.subline && (
              <p className="text-[10px] text-amber-200/50 mt-1">{serverEstimate.subline}</p>
            )}
          </div>
        )}
        {ref.minPriceMan != null && ref.minPriceMan > 0 && (
          <div className="rounded-xl border border-slate-400/15 bg-black/10 p-4">
            <p className="text-[11px] text-slate-400 mb-1">최저입찰가</p>
            <p className="text-xl font-black text-slate-200">{formatManwon(ref.minPriceMan)}</p>
            {ref.caseNumber && (
              <p className="text-[10px] text-slate-500 mt-1">{ref.caseNumber}</p>
            )}
          </div>
        )}
      </div>

      {gapLabel && (
        <p className="mt-3 text-xs font-semibold text-slate-300">{gapLabel}</p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        {ref.note || '경매 공고상 감정평가액입니다. 탐정 서버 추정가·적정가와 별개의 참고값입니다.'}
        {' '}
        {ref.disclaimer || '입찰·매수 판단의 기준가격이 아닙니다.'}
      </p>
    </section>
  );
}
