'use client';

import React from 'react';
import MacroContextCharts from '../../MacroContextCharts';
import AnalysisV31SectionShell from './AnalysisV31SectionShell';
import { getV31SectionMeta, isApartmentAnalysisCategory } from '../../../lib/analysisV31Helpers';
import {
  extractAmenityPopulationGrid,
  extractMarketTradeGrid,
  extractMarketVolumeHero,
  resolveSigunguCd,
} from '../../../lib/analysisV31Extractors';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
  category: 'land' | 'building';
};

export default function AnalysisV31MarketSection({
  ai,
  mergedData,
  analysisMetadata,
  category,
}: Props) {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const priceAnalysis = (ai['3_priceAnalysisReport'] || {}) as Record<string, unknown>;
  const tradeGrid = extractMarketTradeGrid(ai, meta);
  const amenPop = extractAmenityPopulationGrid(ai, mergedData);
  const sigunguCd = resolveSigunguCd(mergedData, meta);
  const volumeHero = extractMarketVolumeHero(mergedData);
  const firesale = String(priceAnalysis.landFiresaleSummary || priceAnalysis.comparableSummary || priceAnalysis.comparableAnalysis || '');
  const tradeVolume = String(priceAnalysis.buildingTradeVolume || priceAnalysis.tradeVolume || '');
  const showMacroContext = isApartmentAnalysisCategory(category, mergedData);

  return (
    <AnalysisV31SectionShell
      id="analysis-v31-market"
      meta={getV31SectionMeta('market', category)}
    >
      {volumeHero && (
        <div className="analysis-v31-card">
          <div className="analysis-v31-market-main">
            <div>
              <div className="analysis-v31-volume-number">{volumeHero.value}</div>
              <div className="analysis-v31-volume-label">{volumeHero.label}</div>
              {volumeHero.changeLines.map((line) => (
                <div key={line} className="analysis-v31-change up">{line}</div>
              ))}
            </div>
            <div>
              <div className="analysis-v31-chart-caption">월별 순수토지 필지수 추이</div>
              <p className="analysis-v31-prose-note m-0">
                반경 내 순수토지 거래 필지수 월별 추이입니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="analysis-v31-card">
        <div className="analysis-v31-card-title">반경 내 거래 · 동일유형</div>
        <div className="analysis-v31-dev-grid cols-4">
          {tradeGrid.map((item) => (
            <div key={item.label} className="analysis-v31-dev-item">
              <div className="analysis-v31-dev-label">{item.label}</div>
              <div className={`analysis-v31-dev-value${item.positive === false ? ' warn' : ''}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="analysis-v31-card">
        <div className="analysis-v31-card-title">생활 편의 · 인구</div>
        <div className="analysis-v31-dev-grid cols-4">
          {amenPop.map((item) => (
            <div key={item.label} className="analysis-v31-dev-item">
              <div className="analysis-v31-dev-label">{item.label}</div>
              <div className="analysis-v31-dev-value">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {showMacroContext && sigunguCd && (
        <div className="analysis-v31-card">
          <div className="analysis-v31-card-title">거시 시계열 (MacroContext · 10년 분기 축)</div>
          <p className="analysis-v31-prose-note" style={{ marginBottom: '0.875rem' }}>
            미분양 · 아파트거래량 · 금리 · M2 · CSI · 공사비 · 허가 · 착공 — 가격 차트와 동일 시간축 비교
          </p>
          <MacroContextCharts
            sigunguCd={sigunguCd}
            useDefaultAxis
            theme="dark"
            layoutMode="yearlyBars"
            sectionBadge="거시 · 미분양 · 지수"
            axisNote="해당 시·군·구 기준 거시·미분양 추이 (10년 분기 축)"
          />
        </div>
      )}

      {(firesale || tradeVolume) && (
        <details className="analysis-v31-details">
          <summary>지역 거래량 · 시장 AI 해설 (원문)</summary>
          <div className="analysis-v31-details-body whitespace-pre-wrap">
            {[firesale, tradeVolume].filter(Boolean).join('\n\n')}
          </div>
        </details>
      )}
    </AnalysisV31SectionShell>
  );
}
