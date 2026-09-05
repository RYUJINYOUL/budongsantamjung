'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import AnalysisV31SectionShell from './AnalysisV31SectionShell';
import { getV31SectionMeta } from '../../../lib/analysisV31Helpers';
import {
  extractDevelopmentAiText,
  extractDevelopmentGrid,
  extractDevelopmentProse,
  extractZoningChangeMapListItems,
  extractZoningChangePermits,
  extractZoningChangeSummaryComment,
  buildV31MapData,
} from '../../../lib/analysisV31Extractors';
import { useZoningChangeMapMarkers } from '../../../hooks/useZoningChangeMapMarkers';

const ComparableMap = dynamic(() => import('../../ComparableMap'), { ssr: false });

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
  category: 'land' | 'building';
};

export default function AnalysisV31DevelopmentSection({
  ai,
  mergedData,
  analysisMetadata,
  category,
}: Props) {
  const [showZoningMap, setShowZoningMap] = useState(false);
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const grid = extractDevelopmentGrid(ai, mergedData, meta);
  const prose = extractDevelopmentProse(ai, mergedData);
  const aiText = extractDevelopmentAiText(ai);
  const hasChange = Number(meta.zoningChangeCount5Y || 0) > 0;
  const summaryComment = extractZoningChangeSummaryComment(meta);
  const fullComment = String(meta.zoningChangeComment || summaryComment);
  const zoningPermits = useMemo(
    () => extractZoningChangePermits(mergedData),
    [mergedData?.regulatoryData],
  );
  const mapList = extractZoningChangeMapListItems(zoningPermits, meta);
  const mapData = buildV31MapData(meta, mergedData);
  const target = (mapData.target || {}) as Record<string, unknown>;
  const hasCoords = Boolean(target.lat && target.lng);
  const { markers: zoningMarkers, loading: geocoding } = useZoningChangeMapMarkers(zoningPermits);
  const markerCount = zoningMarkers.length;

  return (
    <AnalysisV31SectionShell
      id="analysis-v31-development"
      meta={getV31SectionMeta('development', category)}
    >
      <div className="analysis-v31-card">
        <div className="analysis-v31-dev-grid">
          {grid.map((item) => (
            <div key={item.label} className="analysis-v31-dev-item">
              <div className="analysis-v31-dev-label">{item.label}</div>
              <div className={`analysis-v31-dev-value${item.positive ? ' positive' : ''}`}>{item.value}</div>
            </div>
          ))}
        </div>
        {prose && <p className="analysis-v31-prose-note">{prose}</p>}
        {aiText && (
          <details className="analysis-v31-details">
            <summary>토지 형태 · 개발 잠재력 AI 해설 (원문)</summary>
            <div className="analysis-v31-details-body whitespace-pre-wrap">{aiText}</div>
          </details>
        )}
      </div>

      <div className="analysis-v31-card">
        <div className="analysis-v31-zoning-row">
          <div>
            <div className="analysis-v31-card-title">인접 필지 용도변경 (5년 · 반경 500m)</div>
            <p className="analysis-v31-prose-note m-0">
              {hasChange
                ? `상업·숙박 용도변경 ${meta.zoningChangeCount5Y}건 — ${summaryComment}`
                : summaryComment}
            </p>
          </div>
          {hasCoords && (
            <button
              type="button"
              className="analysis-v31-outline-btn analysis-v31-map-toggle-btn"
              onClick={() => setShowZoningMap((v) => !v)}
            >
              {showZoningMap ? '지도 닫기' : '지도에서 보기'}
            </button>
          )}
        </div>

        {hasChange && fullComment.includes('\n') && !showZoningMap && (
          <details className="analysis-v31-details" style={{ marginTop: '0.75rem' }}>
            <summary>용도변경 분석 상세</summary>
            <div className="analysis-v31-details-body whitespace-pre-wrap">{fullComment}</div>
          </details>
        )}
      </div>

      {showZoningMap && hasCoords && (
        <div className="analysis-v31-card analysis-v31-map-card">
          <div className="analysis-v31-map-area">
            <ComparableMap
              mapData={mapData}
              category={category}
              customComparables={zoningMarkers}
              className="h-full min-h-[390px]"
              fitAllMarkers={markerCount > 0}
              draggable={false}
            />
          </div>
          <div className="analysis-v31-map-list">
            <h3>용도변경 리스트</h3>
            {geocoding && markerCount === 0 && zoningPermits.length > 0 && (
              <div className="analysis-v31-map-item">
                <div className="analysis-v31-map-item-title">지도 마커</div>
                <div className="analysis-v31-map-item-sub">주소 좌표 변환 중…</div>
              </div>
            )}
            {mapList.map((item) => (
              <div key={`${item.title}-${item.sub}`} className="analysis-v31-map-item">
                <div className="analysis-v31-map-item-title">{item.title}</div>
                <div className="analysis-v31-map-item-sub">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AnalysisV31SectionShell>
  );
}
