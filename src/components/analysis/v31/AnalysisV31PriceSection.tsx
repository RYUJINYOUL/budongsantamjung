'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import AnalysisV31SectionTitle from './AnalysisV31SectionTitle';
import {
  buildPriceLedgerRows,
  computeLedgerFactorProduct,
  extractLedgerFactorItems,
  extractPriceMethods,
  formatEokCompact,
  getTargetArea,
} from '../../../lib/analysisV31Helpers';
import { buildComparableEmptyCopy, extractPriceMapListItems } from '../../../lib/analysisV31Extractors';

const ComparableMap = dynamic(() => import('../../ComparableMap'), { ssr: false });

type Props = {
  ai: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
  category: 'land' | 'building';
};

export default function AnalysisV31PriceSection({
  ai,
  mergedData,
  analysisMetadata,
  category,
}: Props) {
  const [showPriceMap, setShowPriceMap] = useState(false);
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const priceReas = (ai['5_priceReasonableness'] || {}) as Record<string, unknown>;
  const methods = extractPriceMethods(meta, priceReas, mergedData, category);
  const ledgerRows = buildPriceLedgerRows(meta, priceReas);
  const ledgerFactors = extractLedgerFactorItems(meta, category);
  const ledgerProduct = computeLedgerFactorProduct(meta);
  const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
  const detected = Number(meta.totalDetected ?? 0);
  const relax = Number(meta.conditionRelaxLevel) || 0;
  const attached = meta.uiAttachedMultiplier as Record<string, unknown> | undefined;
  const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
  const targetArea = getTargetArea(meta, mergedData, category);
  const midTotal = Number(attached?.midTotal) || Number(opr?.estimatedPrice) || 0;
  const perPyeongMan = midTotal > 0 && targetArea > 0
    ? Math.round(midTotal / (targetArea / 3.3058) / 10_000)
    : 0;
  const emptyCopy = buildComparableEmptyCopy(meta);
  const mapList = extractPriceMapListItems(meta);

  const hasCoords = meta.lat && meta.lng;

  const renderEmptyComparableDesc = () => {
    if (emptyCopy.note) return emptyCopy.note;
    const km = emptyCopy.radius >= 1000
      ? `${Math.round(emptyCopy.radius / 1000)}km`
      : `${emptyCopy.radius}m`;
    return (
      <>
        반경 <strong>{km}</strong>
        {emptyCopy.detected > 0 && (
          <> · <strong>{emptyCopy.detected}건</strong> 탐지 → 조건 부합 <strong>{emptyCopy.matched}건</strong></>
        )}
        {relax > 0 && <> (완화 Level {relax})</>}
      </>
    );
  };

  let caption = '';
  if (midTotal > 0 && targetArea > 0) {
    caption = `보수적 추정 약 ${formatEokCompact(midTotal)}`;
    if (perPyeongMan > 0) caption += ` (평당 ${perPyeongMan.toLocaleString()}만)`;
  }

  const narrative = [
    priceReas.conclusion,
    priceReas.opinion,
  ].filter(Boolean).join('\n\n');

  return (
    <section id="analysis-v31-price" className="analysis-v31-section">
      <AnalysisV31SectionTitle
        number="01"
        title={category === 'building' ? '가격·수익 분석' : '가격분석'}
        description="산출 방법 · 근거 · 지도 — 요약 숫자는 위 가격 블록 참고"
      />

      <div className="analysis-v31-price-methods">
        {methods.map((card) => (
          <div key={card.label} className="analysis-v31-pm-box">
            <div className="analysis-v31-pm-label">{card.label}</div>
            <div className={`analysis-v31-pm-value${card.muted ? ' muted' : ''}`}>{card.value}</div>
            {card.sub && <div className="analysis-v31-pm-sub">{card.sub}</div>}
            {card.badge && <span className="analysis-v31-pm-badge">{card.badge}</span>}
          </div>
        ))}
      </div>

      {caption && (
        <p className="analysis-v31-valuation-note">{caption}</p>
      )}

      <details className="analysis-v31-details">
        <summary>가격 산출 근거 · 비교사례 상세</summary>
        <div className="analysis-v31-details-body">
          <table className="analysis-v31-valuation-table">
            <tbody>
              {ledgerRows.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {comparables.length === 0 ? (
            <div className="analysis-v31-empty-comparable muted">
              <div className="analysis-v31-empty-left">
                <div className="analysis-v31-empty-icon">⚠</div>
                <div>
                  <div className="analysis-v31-empty-title">유효한 비교사례 없음</div>
                  <div className="analysis-v31-empty-desc">{renderEmptyComparableDesc()}</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="analysis-v31-prose-note m-0">
              유효 비교사례 <strong>{comparables.length}건</strong>
              {detected > 0 ? ` · 탐지 ${detected}건` : ''}
            </p>
          )}

          {ledgerFactors.length > 0 && (
            <details className="analysis-v31-details nested">
              <summary>6개 요인 보정 상세 (합산 {ledgerProduct.toFixed(3)}x)</summary>
              <div className="analysis-v31-details-body">
                <ul className="analysis-v31-ledger-list">
                  {ledgerFactors.map((item) => (
                    <li key={item.label} className="analysis-v31-ledger-item">
                      <div className="analysis-v31-ledger-head">
                        <span>{item.index} {item.label}</span>
                        <span className="analysis-v31-ledger-coef">{item.factor.toFixed(3)}x</span>
                      </div>
                      <div className="analysis-v31-ledger-reason">{item.reason}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>
      </details>

      {hasCoords && (
        <div className="analysis-v31-map-toggle-row">
          <button
            type="button"
            className="analysis-v31-outline-btn analysis-v31-map-toggle-btn"
            onClick={() => setShowPriceMap((v) => !v)}
          >
            {showPriceMap ? '지도 닫기' : '지도 · 주변 실거래 보기'}
          </button>
        </div>
      )}

      {hasCoords && showPriceMap && (
        <div className="analysis-v31-card analysis-v31-map-card">
          <div className="analysis-v31-map-area">
            <ComparableMap
              mapData={meta}
              category={category}
              targetArea={Number(meta.targetArea) || undefined}
              className="h-full min-h-[390px]"
              fitAllMarkers
            />
          </div>
          <div className="analysis-v31-map-list">
            <h3>가격 · 주변 데이터</h3>
            {mapList.map((item) => (
              <div key={item.title} className="analysis-v31-map-item">
                <div className="analysis-v31-map-item-title">{item.title}</div>
                <div className="analysis-v31-map-item-sub">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {narrative && (
        <details className="analysis-v31-details">
          <summary>AI 가격 해설 (원문)</summary>
          <div className="analysis-v31-details-body whitespace-pre-wrap">{narrative}</div>
        </details>
      )}
    </section>
  );
}
