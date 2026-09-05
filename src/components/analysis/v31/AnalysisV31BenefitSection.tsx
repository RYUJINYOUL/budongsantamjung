'use client';

import React from 'react';
import AnalysisV31SectionShell from './AnalysisV31SectionShell';
import { getV31SectionMeta } from '../../../lib/analysisV31Helpers';
import {
  extractBenefitCards,
  extractForecastCards,
  extractSupplyGrid,
  resolveSigunguLabel,
} from '../../../lib/analysisV31Extractors';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
  category: 'land' | 'building';
};

export default function AnalysisV31BenefitSection({
  ai,
  mergedData,
  analysisMetadata,
  category,
}: Props) {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const cards = extractBenefitCards(ai, mergedData, meta);
  const supply = extractSupplyGrid(mergedData);
  const forecasts = extractForecastCards(ai, mergedData, meta);
  const sigungu = resolveSigunguLabel(mergedData);
  const inDepth = (ai['7_inDepthReport'] || {}) as Record<string, unknown>;
  const outlook = String(inDepth.outlook || '');
  const macroOutlook = ai.macroOutlook as {
    upsideFactors?: Array<{ label?: string; reason?: string }>;
    downsideFactors?: Array<{ label?: string; reason?: string }>;
    summary?: string;
  } | undefined;

  const upside = macroOutlook?.upsideFactors?.map((f) => f.label || f.reason).filter(Boolean) || [];
  const downside = macroOutlook?.downsideFactors?.map((f) => f.label || f.reason).filter(Boolean) || [];
  const outlookProse = macroOutlook?.summary || outlook;

  return (
    <AnalysisV31SectionShell
      id="analysis-v31-benefit"
      meta={getV31SectionMeta('benefit', category)}
    >
      {cards.length > 0 && (
        <div className="analysis-v31-benefit-grid">
          {cards.map((card, i) => (
            <div key={`${card.title}-${i}`} className={`analysis-v31-benefit ${card.type}`}>
              <div className="analysis-v31-benefit-type">{card.typeLabel}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <div className="analysis-v31-benefit-distance">{card.distance}</div>
            </div>
          ))}
        </div>
      )}

      {supply.some((s) => s.value !== '-') && (
        <div className="analysis-v31-card analysis-v31-supply-card">
          <div className="analysis-v31-card-title">공급 · 미분양 ({sigungu})</div>
          <div className="analysis-v31-dev-grid cols-4">
            {supply.map((item) => (
              <div key={item.label} className="analysis-v31-dev-item">
                <div className="analysis-v31-dev-label">{item.label}</div>
                <div className={`analysis-v31-dev-value${item.label.includes('과잉') ? ' warn' : ''}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="analysis-v31-card">
        <div className="analysis-v31-card-title">미래가치 전망</div>
        <div className="analysis-v31-future-grid">
          {forecasts.map((f) => (
            <div key={f.label} className="analysis-v31-card analysis-v31-forecast">
              <div className="analysis-v31-forecast-label">{f.label}</div>
              <div className="analysis-v31-forecast-value">{f.value}</div>
              <div className="analysis-v31-forecast-desc">{f.desc}</div>
            </div>
          ))}
        </div>
        {outlookProse && (
          <p className="analysis-v31-prose-note" style={{ marginTop: '1rem' }}>
            {outlookProse.length > 220 ? `${outlookProse.slice(0, 220)}…` : outlookProse}
          </p>
        )}
      </div>

      {(upside.length > 0 || downside.length > 0) && (
        <div className="analysis-v31-card">
          <div className="analysis-v31-bull-bear">
            {upside.length > 0 && (
              <div className="analysis-v31-bull">
                <h3>▲ 상승 · 긍정 요인</h3>
                <ul>{upside.slice(0, 5).map((line, i) => <li key={i}>{line}</li>)}</ul>
              </div>
            )}
            {downside.length > 0 && (
              <div className="analysis-v31-bear">
                <h3>▼ 제한 · 리스크 요인</h3>
                <ul>{downside.slice(0, 5).map((line, i) => <li key={i}>{line}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}

      {outlook.length > 180 && (
        <details className="analysis-v31-details">
          <summary>심층 분석 · 미래가치 AI 원문</summary>
          <div className="analysis-v31-details-body whitespace-pre-wrap">{outlook}</div>
        </details>
      )}
    </AnalysisV31SectionShell>
  );
}
