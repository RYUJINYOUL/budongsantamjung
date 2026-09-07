'use client';

import React from 'react';
import MarketProofCard, { type MarketProofPayload } from './MarketProofCard';
import {
  buildCohortMultiplierCaption,
  buildEstimateRangeLabel,
  buildComparableSub,
  extractSummaryJudgements,
  extractSummaryTags,
  extractVerdictBadge,
  formatEokCompact,
  formatPricePositionLabel,
  getScoreTierLabel,
  formatTargetAreaSubline,
  getTargetArea,
  priceBarMarkerPercent,
  resolveEstimateRange,
  resolveUserPriceWon,
} from '../../../lib/analysisV31Helpers';
import {
  resolveLandUiTrack,
  shouldShowFullMarketProof,
  shouldShowReferenceMarketProof,
  type LandUiTrack,
} from '../../../lib/landAssetTrack';
import { formatHojaeTierSummary, pickHojaeTierFields } from '@/lib/hojaeTier';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
  category: 'land' | 'building';
};

function badgeClass(tone: 'green' | 'blue' | 'amber' | 'red') {
  const map = {
    green: 'analysis-v31-badge-green',
    blue: 'analysis-v31-badge-blue',
    amber: 'analysis-v31-badge-amber',
    red: 'analysis-v31-badge-red',
  };
  return map[tone];
}

function LandTrackContextPanel({
  track,
  meta,
  hojaeSummary,
  hojaeReason,
}: {
  track: LandUiTrack;
  meta: Record<string, unknown>;
  hojaeSummary: string | null;
  hojaeReason?: string | null;
}) {
  const title = track === 'B' ? '농·임야 · 호재 중심' : '관리·녹지 · 개발 가능성';
  const lead = track === 'B'
    ? '시가지(대·상업) marketProof와 다른 기준입니다. tier 상한·호재·형질변경을 우선 확인하세요.'
    : '계획·관리·녹지 지역입니다. 도로 접근·개발계획·규제 변경을 중심으로 판단하세요.';

  return (
    <div className="analysis-v31-card analysis-v31-market-proof reference-mode">
      <div className="analysis-v31-card-title">{title}</div>
      <p className="analysis-v31-prose-note">{lead}</p>
      {hojaeSummary && (
        <div className="analysis-v31-tag-row mt-2">
          <span className="analysis-v31-tag">{hojaeSummary}</span>
        </div>
      )}
      {hojaeReason && (
        <p className="analysis-v31-market-proof-message mt-2">{hojaeReason}</p>
      )}
      {meta.marketProofBlocked === true && (
        <p className="analysis-v31-market-proof-alert mt-2">
          법정동 거래가 매우 적어 저평가 pass 추천은 제외됩니다. 추정가는 tier·cohort 참고값입니다.
        </p>
      )}
    </div>
  );
}

export default function AnalysisV31Summary({
  ai,
  mergedData,
  analysisMetadata,
  category,
}: Props) {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const priceReas = (ai['5_priceReasonableness'] || {}) as Record<string, unknown>;
  const compRisk = (ai['1_comprehensiveRisk'] || {}) as Record<string, unknown>;
  const overallScore = typeof compRisk.totalScore === 'number'
    ? compRisk.totalScore
    : (typeof compRisk.score === 'number' ? compRisk.score : 0);
  const tier = getScoreTierLabel(overallScore);
  const verdictBadge = extractVerdictBadge(ai['8_finalVerdict']);
  const tags = extractSummaryTags(ai, meta);
  const judgements = extractSummaryJudgements(ai, meta, mergedData, category);

  const userPriceWon = resolveUserPriceWon(meta, mergedData);
  const targetArea = getTargetArea(meta, mergedData, category);
  const { min, max, source } = resolveEstimateRange(meta, priceReas, mergedData, category);
  const estimateLabel = buildEstimateRangeLabel(source);
  const markerPct = priceBarMarkerPercent(userPriceWon, min, max);
  const pricePosition = formatPricePositionLabel(userPriceWon, min, max);
  const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
  const marketProof = meta.marketProof as MarketProofPayload | undefined;
  const landTrack = category === 'land' ? resolveLandUiTrack(meta, mergedData) : null;
  const hojae = pickHojaeTierFields(meta);
  const hojaeSummary = formatHojaeTierSummary(hojae);
  const rangeCaption = buildCohortMultiplierCaption(meta, priceReas);
  const comparableSub = buildComparableSub(meta);
  const perPyeong = userPriceWon > 0 && targetArea > 0
    ? Math.round(userPriceWon / (targetArea / 3.3058) / 10_000)
    : 0;

  const showFullMp = category === 'land' && marketProof?.status && landTrack && shouldShowFullMarketProof(landTrack);
  const showRefMp = category === 'land' && marketProof?.status && landTrack && shouldShowReferenceMarketProof(landTrack);
  const showTrackPanel = category === 'land' && landTrack && (landTrack === 'B' || landTrack === 'C');

  return (
    <section className="analysis-v31-summary">
      <div className="analysis-v31-summary-grid">
        <div>
          <div className="analysis-v31-decision">
            {verdictBadge && (
              <span className={`analysis-v31-badge ${badgeClass(verdictBadge.tone)}`}>
                {verdictBadge.label}
              </span>
            )}
            <span className={`analysis-v31-badge ${badgeClass(tier.tone)}`}>
              {tier.label} {overallScore}점
            </span>
            <div>
              <div className="analysis-v31-score-label">AI 종합점수</div>
              <div className="analysis-v31-score">{overallScore}</div>
            </div>
          </div>

          <div className="analysis-v31-metrics">
            <div className="analysis-v31-metric">
              <div className="analysis-v31-metric-label">제시 매매가</div>
              <div className="analysis-v31-metric-value">
                {userPriceWon > 0 ? formatEokCompact(userPriceWon) : '-'}
              </div>
              {userPriceWon > 0 && targetArea > 0 && (
                <div className="analysis-v31-metric-sub">
                  {formatTargetAreaSubline(targetArea, perPyeong, category)}
                </div>
              )}
            </div>
            <div className="analysis-v31-metric">
              <div className="analysis-v31-metric-label">{estimateLabel}</div>
              <div className="analysis-v31-metric-value">
                {min > 0 || max > 0
                  ? (min === max
                    ? formatEokCompact(min)
                    : `${formatEokCompact(min)}~${formatEokCompact(max)}`)
                  : '-'}
              </div>
              {rangeCaption && <div className="analysis-v31-metric-sub">{rangeCaption}</div>}
            </div>
            <div className={`analysis-v31-metric${comparables.length === 0 ? ' warning' : ''}`}>
              <div className="analysis-v31-metric-label">유효 비교사례</div>
              <div className="analysis-v31-metric-value">{comparables.length}건</div>
              {comparableSub && (
                <div className="analysis-v31-metric-sub">{comparableSub}</div>
              )}
            </div>
          </div>

          {(min > 0 || max > 0) && userPriceWon > 0 && (
            <div className="analysis-v31-price-bar-block">
              <div className="analysis-v31-bar-labels">
                <span>{formatEokCompact(min)}</span>
                <span>{estimateLabel}</span>
                <span>{formatEokCompact(max)}</span>
              </div>
              <div className="analysis-v31-bar-track">
                <div className="analysis-v31-bar-range" />
                <div
                  className="analysis-v31-bar-marker"
                  style={{ left: `calc(${markerPct}% - 10px)` }}
                />
              </div>
              <p className="analysis-v31-bar-current">
                제시가 {formatEokCompact(userPriceWon)}
                {pricePosition ? ` — ${pricePosition}` : ''}
              </p>
            </div>
          )}

          {tags.length > 0 && (
            <div className="analysis-v31-tag-row">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className={`analysis-v31-tag${tag.warn ? ' warn' : ''}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {showTrackPanel && landTrack && (
            <div className="analysis-v31-summary-market-proof">
              <LandTrackContextPanel
                track={landTrack}
                meta={meta}
                hojaeSummary={hojaeSummary}
                hojaeReason={hojae.hojaeTierReason}
              />
            </div>
          )}

          {showFullMp && marketProof && (
            <div className="analysis-v31-summary-market-proof">
              <MarketProofCard
                embedded
                landTrack="A"
                marketProof={marketProof}
                marketProofBlocked={meta.marketProofBlocked === true}
                passStrictEffective={meta.passStrictEffective === true}
              />
            </div>
          )}

          {showRefMp && marketProof && (
            <div className="analysis-v31-summary-market-proof">
              <MarketProofCard
                embedded
                referenceOnly
                landTrack={landTrack || 'B'}
                marketProof={marketProof}
                marketProofBlocked={meta.marketProofBlocked === true}
                passStrictEffective={meta.passStrictEffective === true}
              />
            </div>
          )}
        </div>

        {judgements.length > 0 && (
          <div className="analysis-v31-summary-right">
            <h3>탐정 요약</h3>
            <div className="analysis-v31-judgements">
              {judgements.map((item) => (
                <div key={item.text} className="analysis-v31-judgement">
                  <span className={item.warn ? 'analysis-v31-warning' : 'analysis-v31-check'}>
                    {item.warn ? '⚠' : '✓'}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
