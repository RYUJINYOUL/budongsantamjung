'use client';

import React from 'react';
import { Search } from 'lucide-react';
import PremiumRiskGauge from '../../PremiumRiskGauge';
import {
  extractShortPriceLabel,
  extractVerdictBadge,
  getInlineBadgeStyle,
  getScoreTierLabel,
} from '../../../lib/analysisV31Helpers';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
};

export default function AnalysisV31DetectiveHero({ ai, mergedData }: Props) {
  const compRisk = (ai['1_comprehensiveRisk'] || {}) as Record<string, unknown>;
  const priceReas = (ai['5_priceReasonableness'] || {}) as Record<string, unknown>;
  const overallScore = typeof compRisk.totalScore === 'number'
    ? compRisk.totalScore
    : (typeof compRisk.score === 'number' ? compRisk.score : 0);
  const summaryText = String(compRisk.coreJudgement || mergedData?.detectiveNote || '').trim()
    || 'AI 분석 요약을 불러오는 중입니다.';
  const tier = getScoreTierLabel(overallScore);
  const verdictBadge = extractVerdictBadge(ai['8_finalVerdict']);
  const finalVerdict = ai['8_finalVerdict'];
  const verdictText = typeof finalVerdict === 'object' && finalVerdict
    ? String((finalVerdict as Record<string, unknown>).verdict || (finalVerdict as Record<string, unknown>).verdic || '')
    : (typeof finalVerdict === 'string' ? finalVerdict : undefined);
  const priceLabel = extractShortPriceLabel(
    String(priceReas.conclusion || ''),
    String(priceReas.gap || ''),
    String(priceReas.opinion || ''),
    verdictText,
  );

  const badges: { label: string; color: string; borderColor: string; backgroundColor: string }[] = [
    {
      label: tier.label,
      ...getInlineBadgeStyle(tier.label),
    },
  ];
  if (verdictBadge && !badges.some((b) => b.label === verdictBadge.label)) {
    const toneColor = {
      green: '#34d399',
      blue: '#0EA5E9',
      amber: '#fbbf24',
      red: '#f87171',
    }[verdictBadge.tone];
    badges.unshift({
      label: verdictBadge.label,
      color: toneColor,
      borderColor: `${toneColor}44`,
      backgroundColor: `${toneColor}14`,
    });
  }
  if (priceLabel && !badges.some((b) => b.label === priceLabel)) {
    badges.push({ label: priceLabel, ...getInlineBadgeStyle(priceLabel) });
  }

  return (
    <section className="analysis-v31-detective-hero relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0f172a]/50 p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.04] via-transparent to-transparent" />
      <div className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-sky-400/25 to-transparent" />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10">
        <div className="shrink-0 flex justify-center">
          <PremiumRiskGauge score={overallScore} />
        </div>
        <div className="flex-1 min-w-0 text-center lg:text-left">
          <div className="flex items-center gap-3 mb-5 flex-wrap justify-center lg:justify-start">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/25 via-cyan-500/10 to-transparent border border-sky-400/30 shadow-[0_0_16px_rgba(14,165,233,0.18)]">
                <div className="absolute inset-0 rounded-xl bg-sky-400/[0.06] pointer-events-none" />
                <Search className="relative w-[18px] h-[18px] text-sky-300" strokeWidth={2.25} />
              </div>
              <span className="text-sm lg:text-[15px] font-bold tracking-tight text-white/95">
                AI 탐정{' '}
                <span className="bg-gradient-to-r from-sky-200 via-cyan-200 to-sky-300 bg-clip-text text-transparent">
                  분석 결과
                </span>
              </span>
            </div>
            {badges.map(({ label, color, borderColor, backgroundColor }) => (
              <span
                key={label}
                className="text-[11px] font-black px-2.5 py-1 rounded-full border"
                style={{ color, borderColor, backgroundColor }}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="text-white/90 text-[15px] lg:text-base leading-[1.75] font-medium m-0">
            {summaryText}
          </p>
        </div>
      </div>
    </section>
  );
}
