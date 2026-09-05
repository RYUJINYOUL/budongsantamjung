'use client';

import React from 'react';
import {
  extractSummaryTags,
  formatEokCompact,
  formatPricePositionLabel,
  getTargetArea,
  isCohortOfficialPricing,
  priceBarMarkerPercent,
  resolveEstimateRange,
  resolveUserPriceWon,
} from '../../lib/analysisV31Helpers';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
  category?: string;
};

function resolveV31Category(category?: string): 'land' | 'building' {
  const cat = String(category || 'land').toLowerCase();
  if (cat === 'building' || cat === '빌딩' || cat === 'store' || cat === '상가') return 'building';
  return 'land';
}

export default function AnalysisPriceSnapshot({
  ai,
  mergedData,
  analysisMetadata,
  category,
}: Props) {
  const v31Cat = resolveV31Category(category || String(mergedData?.category || ''));
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const priceReas = (ai['5_priceReasonableness'] || {}) as Record<string, unknown>;
  const tags = extractSummaryTags(ai, meta);

  const userPriceWon = resolveUserPriceWon(meta, mergedData);
  const targetArea = getTargetArea(meta, mergedData, v31Cat);
  const { min, max } = resolveEstimateRange(meta, priceReas, mergedData, v31Cat);
  const markerPct = priceBarMarkerPercent(userPriceWon, min, max);
  const pricePosition = formatPricePositionLabel(userPriceWon, min, max);
  const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
  const obsRatio = (meta.officialPriceRatio as Record<string, unknown> | undefined)?.observedRatio as Record<string, unknown> | undefined;
  const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
  const cohort = isCohortOfficialPricing(meta);
  const confidenceGrade = String(meta.confidenceGrade || obsRatio?.confidenceGrade || priceReas.reliabilityGrade || '').trim();
  const searchRadius = Number(meta.searchRadiusM ?? meta.comparableRadiusM ?? 1000);
  const totalDetected = Number(meta.totalDetected ?? 0);
  const relax = Number(meta.conditionRelaxLevel) || 0;
  const perPyeong = userPriceWon > 0 && targetArea > 0
    ? Math.round(userPriceWon / (targetArea / 3.3058) / 10_000)
    : 0;

  const rangeCaption = cohort
    ? [
        '동일수급권 median',
        Number(opr?.appliedMultiplier) > 0 ? `${Number(opr?.appliedMultiplier).toFixed(1)}배` : null,
        confidenceGrade ? `신뢰 ${confidenceGrade}` : '',
      ].filter(Boolean).join(' · ')
    : [
        '공시지가 배율',
        confidenceGrade ? `신뢰 ${confidenceGrade}` : '',
      ].filter(Boolean).join(' · ');

  const comparableSub = [
    searchRadius >= 1000 ? `${Math.round(searchRadius / 1000)}km` : `${searchRadius}m`,
    totalDetected > 0 ? `${totalDetected}건 탐지` : null,
    relax > 0 ? `L${relax}` : null,
  ].filter(Boolean).join(' · ');

  const hasPriceData = userPriceWon > 0 || min > 0 || max > 0 || comparables.length > 0;
  if (!hasPriceData) return null;

  return (
    <section className="rounded-[20px] border border-white/[0.08] bg-[#0f172a]/55 p-5 sm:p-6 shadow-[0_0_25px_rgba(14,165,233,0.04)]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
          <div className="text-[11px] font-medium text-white/45 mb-1.5">제시 매매가</div>
          <div className="text-xl sm:text-[1.35rem] font-extrabold text-white tracking-tight">
            {userPriceWon > 0 ? formatEokCompact(userPriceWon) : '-'}
          </div>
          {userPriceWon > 0 && targetArea > 0 && (
            <div className="mt-1 text-[11px] text-white/40">
              평당 약 {perPyeong.toLocaleString()}만 · 전용 {Math.round(targetArea)}㎡
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
          <div className="text-[11px] font-medium text-white/45 mb-1.5">AI 추정 범위</div>
          <div className="text-xl sm:text-[1.35rem] font-extrabold text-white tracking-tight">
            {min > 0 || max > 0
              ? (min === max
                ? formatEokCompact(min)
                : `${formatEokCompact(min)}~${formatEokCompact(max)}`)
              : '-'}
          </div>
          {rangeCaption && (
            <div className="mt-1 text-[11px] text-white/40">{rangeCaption}</div>
          )}
        </div>

        <div className={`rounded-xl border p-4 ${
          comparables.length === 0
            ? 'border-amber-500/25 bg-amber-500/[0.08]'
            : 'border-white/[0.06] bg-white/[0.04]'
        }`}>
          <div className="text-[11px] font-medium text-white/45 mb-1.5">유효 비교사례</div>
          <div className={`text-xl sm:text-[1.35rem] font-extrabold tracking-tight ${
            comparables.length === 0 ? 'text-amber-300' : 'text-white'
          }`}>
            {comparables.length}건
          </div>
          {comparableSub && (
            <div className="mt-1 text-[11px] text-white/40">{comparableSub}</div>
          )}
        </div>
      </div>

      {(min > 0 || max > 0) && userPriceWon > 0 && (
        <div className="mt-5">
          <div className="flex justify-between text-[11px] text-white/40 mb-2">
            <span>{formatEokCompact(min)}</span>
            <span>추정 범위</span>
            <span>{formatEokCompact(max)}</span>
          </div>
          <div className="relative h-2.5 rounded-full bg-white/[0.08]">
            <div
              className="absolute inset-y-0 left-[5%] right-[5%] rounded-full"
              style={{ background: 'linear-gradient(90deg, #34d399, #fbbf24, #f87171)' }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-[3px] border-[#0f172a] shadow-md"
              style={{ left: `calc(${markerPct}% - 10px)` }}
            />
          </div>
          <p className="mt-2 text-center text-xs font-bold text-white/70">
            제시가 {formatEokCompact(userPriceWon)}
            {pricePosition ? ` — ${pricePosition}` : ''}
          </p>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                tag.warn
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/55'
              }`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
