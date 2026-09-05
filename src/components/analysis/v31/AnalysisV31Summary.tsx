'use client';

import React from 'react';
import {
  buildComparableSub,
  buildEstimateRangeLabel,
  buildPriceRangeCaption,
  extractSummaryJudgements,
  extractSummaryTags,
  extractVerdictBadge,
  formatEokCompact,
  formatPricePositionLabel,
  getScoreTierLabel,
  getTargetArea,
  priceBarMarkerPercent,
  resolveEstimateRange,
  resolveUserPriceWon,
} from '../../../lib/analysisV31Helpers';

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
  const rangeCaption = buildPriceRangeCaption(meta, priceReas);
  const comparableSub = buildComparableSub(meta);
  const perPyeong = userPriceWon > 0 && targetArea > 0
    ? Math.round(userPriceWon / (targetArea / 3.3058) / 10_000)
    : 0;

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
                  평당 약 {perPyeong.toLocaleString()}만 · {Math.round(targetArea)}㎡
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
