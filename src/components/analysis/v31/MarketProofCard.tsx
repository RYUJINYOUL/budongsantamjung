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
  uiTrack?: 'A' | 'B' | 'C';
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

function embeddedBadgeClass(status?: string, blocked?: boolean): string {
  if (blocked || status === '거래공백') {
    return 'bg-red-500/15 border-red-500/35 text-red-300';
  }
  if (status === '정체') return 'bg-amber-500/15 border-amber-500/35 text-amber-300';
  if (status === '활성') return 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300';
  return 'bg-sky-500/15 border-sky-500/35 text-sky-300';
}

type Props = {
  marketProof: MarketProofPayload;
  marketProofBlocked?: boolean;
  passStrictEffective?: boolean;
  /** AiReportView 다크 테마 인라인 (가격 스냅샷 하단) */
  embedded?: boolean;
  /** Track B/C — 시가지 compareDongs 숨김 · 참고 UI */
  referenceOnly?: boolean;
  landTrack?: 'A' | 'B' | 'C';
};

export default function MarketProofCard({
  marketProof,
  marketProofBlocked,
  passStrictEffective,
  embedded = false,
  referenceOnly = false,
  landTrack = 'A',
}: Props) {
  const blocked = marketProofBlocked === true || marketProof.marketProofBlocked === true;
  const track = marketProof.uiTrack || landTrack;
  const compareDongs = referenceOnly || track !== 'A'
    ? (marketProof.compareDongs ?? []).filter((d) => d.role === 'land_peer' || (d.count != null && !d.buildingCount && !d.landResidentialCount))
    : (marketProof.compareDongs ?? []);
  const badge = badgeClass(marketProof.status, blocked);
  const embeddedBadge = embeddedBadgeClass(marketProof.status, blocked);

  if (embedded) {
    return (
      <section
        className={`rounded-[20px] border p-5 sm:p-6 shadow-[0_0_25px_rgba(14,165,233,0.04)] ${
          blocked
            ? 'border-amber-500/30 bg-amber-500/[0.06]'
            : 'border-white/[0.08] bg-[#0f172a]/55'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[11px] font-bold text-white/45 uppercase tracking-wide">
              {referenceOnly ? '법정동 거래 밀도 (참고)' : '법정동 시장 활성도'}
            </div>
            <p className="text-[12px] text-white/55 mt-1 m-0 leading-relaxed">
              {referenceOnly
                ? '동일 지목·용도 기준 거래 밀도입니다. 시가지(대·상업) 비교와는 별개입니다.'
                : '최근 36개월 동일유형 토지·빌딩 실거래 밀도 — cohort 추정가 해석 시 반드시 참고'}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${embeddedBadge}`}>
            {marketProof.uiLabel || marketProof.status || '—'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] text-white/40">법정동</div>
            <div className="text-[12px] font-bold text-white/85 mt-0.5">{marketProof.dongName || '—'}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] text-white/40">36개월 거래</div>
            <div className={`text-[12px] font-bold mt-0.5 ${blocked ? 'text-amber-300' : 'text-white/85'}`}>
              {marketProof.tradeCount36mo != null ? `${marketProof.tradeCount36mo}건` : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <div className="text-[10px] text-white/40">저평가 pass</div>
            <div className={`text-[12px] font-bold mt-0.5 ${passStrictEffective ? 'text-emerald-300' : 'text-amber-300'}`}>
              {passStrictEffective ? '유효' : blocked ? '추천 제외' : '해당 없음'}
            </div>
          </div>
        </div>

        {marketProof.userMessage && (
          <p className="text-[13px] text-white/75 leading-relaxed m-0 mb-3">
            {marketProof.userMessage}
          </p>
        )}

        {blocked && !referenceOnly && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 mb-3 text-[12px] text-amber-100/90 leading-relaxed">
            거래가 매우 적은 동은 저평가 pass 추천에서 제외됩니다. cohort 배율·AI 분석은 그대로 제공되며,
            아래 참고 법정동 거래를 함께 확인하세요.
          </div>
        )}

        {blocked && referenceOnly && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 mb-3 text-[12px] text-amber-100/90 leading-relaxed">
            거래가 적은 것이 흔한 유형입니다. 추정가는 tier·cohort 참고값이며, 호재·개발 가능성을 우선 확인하세요.
          </div>
        )}

        {compareDongs.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] font-bold text-white/40 mb-1.5">
              {referenceOnly ? '인근 동일 유형 법정동' : '인근 참고 법정동'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {compareDongs.map((d) => (
                <span
                  key={d.dong}
                  className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60"
                >
                  {formatCompareDong(d)}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-white/35 mt-2 pt-2 border-t border-white/[0.06] leading-relaxed m-0">
          {COHORT_MULTIPLIER_DISCLAIMER}
        </p>
      </section>
    );
  }

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
