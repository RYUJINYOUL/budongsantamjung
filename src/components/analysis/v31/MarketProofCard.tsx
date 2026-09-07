'use client';

import React from 'react';
import { COHORT_MULTIPLIER_DISCLAIMER } from '@/lib/cohortMultiplierDisclaimer';

export type MarketProofCompareDong = {
  dong: string;
  count?: number;
  landCommercialCount?: number;
  landResidentialCount?: number;
  buildingCount?: number;
  role?: string;
};

export type MarketProofPayload = {
  status?: string;
  tradeCount36mo?: number;
  assetClass?: string;
  dongName?: string;
  bjdongCd?: string;
  flag?: string;
  uiLabel?: string;
  userMessage?: string;
  compareDongs?: MarketProofCompareDong[];
  strongUnderprice?: boolean;
  marketProofBlocked?: boolean;
  passStrictEffective?: boolean;
  dataSource?: string;
};

function formatCompareDong(d: MarketProofCompareDong): string {
  const parts: string[] = [];
  const comm = d.landCommercialCount ?? (d.role === 'land_peer' ? d.count : undefined);
  if (comm != null && comm > 0) parts.push(`상업·대 ${comm}건`);
  if ((d.landResidentialCount ?? 0) > 0) parts.push(`주거·대 ${d.landResidentialCount}건`);
  if ((d.buildingCount ?? 0) > 0) parts.push(`빌딩 ${d.buildingCount}건`);
  if (!parts.length) parts.push(`토지 ${d.count ?? 0}건`);
  return `${d.dong}(${parts.join(' · ')})`;
}

function badgeClass(status?: string, blocked?: boolean): string {
  if (blocked || status === '거래공백') return 'analysis-v31-badge-red';
  if (status === '정체') return 'analysis-v31-badge-amber';
  if (status === '활성') return 'analysis-v31-badge-green';
  return 'analysis-v31-badge-blue';
}

type Props = {
  marketProof: MarketProofPayload;
  marketProofBlocked?: boolean;
  passStrictEffective?: boolean;
};

export default function MarketProofCard({
  marketProof,
  marketProofBlocked,
  passStrictEffective,
}: Props) {
  const blocked = marketProofBlocked === true || marketProof.marketProofBlocked === true;
  const compareDongs = marketProof.compareDongs ?? [];
  const badge = badgeClass(marketProof.status, blocked);

  return (
    <div className={`analysis-v31-card analysis-v31-market-proof${blocked ? ' is-blocked' : ''}`}>
      <div className="analysis-v31-market-proof-head">
        <div>
          <div className="analysis-v31-card-title">법정동 시장 활성도 (marketProof)</div>
          <p className="analysis-v31-prose-note m-0">
            최근 36개월 동일유형 토지·빌딩 실거래 밀도로 해당 동의 시장 활성 여부를 판단합니다.
          </p>
        </div>
        <span className={`analysis-v31-badge ${badge}`}>
          {marketProof.uiLabel || marketProof.status || '—'}
        </span>
      </div>

      <div className="analysis-v31-dev-grid cols-3 analysis-v31-market-proof-metrics">
        <div className="analysis-v31-dev-item">
          <div className="analysis-v31-dev-label">법정동</div>
          <div className="analysis-v31-dev-value">{marketProof.dongName || '—'}</div>
        </div>
        <div className="analysis-v31-dev-item">
          <div className="analysis-v31-dev-label">36개월 거래</div>
          <div className={`analysis-v31-dev-value${blocked ? ' warn' : ''}`}>
            {marketProof.tradeCount36mo != null ? `${marketProof.tradeCount36mo}건` : '—'}
          </div>
        </div>
        <div className="analysis-v31-dev-item">
          <div className="analysis-v31-dev-label">저평가 추천 pass</div>
          <div className={`analysis-v31-dev-value${passStrictEffective ? '' : ' warn'}`}>
            {passStrictEffective ? '유효' : blocked ? '추천 제외' : '해당 없음'}
          </div>
        </div>
      </div>

      {marketProof.userMessage && (
        <p className="analysis-v31-market-proof-message">{marketProof.userMessage}</p>
      )}

      {blocked && (
        <div className="analysis-v31-market-proof-alert">
          거래가 매우 적은 동은 저평가 pass 추천 목록에서 제외됩니다. cohort 배율·AI 분석은
          그대로 제공되며, 인근 활성 동 거래를 참고하세요.
        </div>
      )}

      {compareDongs.length > 0 && (
        <div className="analysis-v31-market-proof-compare">
          <div className="analysis-v31-dev-label">인근 참고 법정동</div>
          <div className="analysis-v31-market-proof-tags">
            {compareDongs.map((d) => (
              <span key={d.dong} className="analysis-v31-tag">
                {formatCompareDong(d)}
              </span>
            ))}
          </div>
        </div>
      )}

      {marketProof.dataSource && (
        <p className="analysis-v31-market-proof-source">
          데이터: {marketProof.dataSource === 'dong_stats_table' ? '법정동 집계 테이블' : '실시간 조회'}
        </p>
      )}

      <p className="analysis-v31-market-proof-disclaimer">{COHORT_MULTIPLIER_DISCLAIMER}</p>
    </div>
  );
}
