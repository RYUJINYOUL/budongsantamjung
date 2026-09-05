'use client';

import React from 'react';
import {
  extractDataSourcePills,
  extractFinalVerdictDetails,
} from '../../../lib/analysisV31Extractors';

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
};

export default function AnalysisV31Footer({ ai, mergedData, analysisMetadata }: Props) {
  const verdict = extractFinalVerdictDetails(ai);
  const pills = extractDataSourcePills(ai, mergedData, analysisMetadata);

  return (
    <footer className="analysis-v31-sources">
      <div className="analysis-v31-sources-title">데이터 출처 · 분석 기준 · 최종 판정</div>
      <p>
        국토교통부 실거래가 · 개별공시지가 · 건축물대장 · 토지이용계획 · 한국부동산원 · KOSIS/ECOS 거시 · 호재 고시 · 인구 · 미분양.
      </p>
      {verdict && (
        <p>
          <strong>결론: {verdict.verdict}{verdict.grade !== '-' ? ` (${verdict.grade})` : ''}</strong>
          {verdict.reason !== '-' ? ` — ${verdict.reason}` : ''}
          {verdict.condition ? `. 전제: ${verdict.condition}` : ''}
        </p>
      )}
      {pills.length > 0 && (
        <div className="analysis-v31-data-pills">
          {pills.map((pill) => (
            <span key={pill} className="analysis-v31-data-pill">{pill}</span>
          ))}
        </div>
      )}
    </footer>
  );
}
