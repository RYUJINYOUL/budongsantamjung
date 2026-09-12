'use client';

import { useState } from 'react';
import type { AnalysisDetailInput } from '../lib/collectAnalysisInputData';
import { formatManwon, formatSaleDate } from '../lib/formatAuctionPrice';
import {
  PANEL_DIVIDER,
  PANEL_HINT,
  PANEL_INPUT,
  PANEL_INPUT_WRAP,
  PANEL_SECTION_LABEL,
} from './analyzePanelFormStyles';

export interface AuctionAnalysisContext {
  caseNumber: string | null;
  courtName: string | null;
  usageType: string | null;
  minPriceMan: number | null;
  appraisalPriceMan: number | null;
  failCount: number;
  saleDate: string | null;
}

interface Props {
  context: AuctionAnalysisContext;
  input: AnalysisDetailInput;
  onChange: (patch: Partial<AnalysisDetailInput>) => void;
  category: string;
}

export default function AuctionAnalysisContextSection({
  context,
  input,
  onChange,
  category,
}: Props) {
  const [showOptional, setShowOptional] = useState(false);
  const isLand = category === 'land';

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 mb-3">
        <p className="text-[11px] font-bold text-slate-500 mb-2">법원 경매 정보 (자동)</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 font-bold">최저입찰</p>
            <p className="font-black text-slate-900">{formatManwon(context.minPriceMan)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold">감정가</p>
            <p className="font-bold text-slate-700">{formatManwon(context.appraisalPriceMan)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold">유찰</p>
            <p className="font-bold text-slate-700">{context.failCount}회</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold">매각기일</p>
            <p className="font-bold text-slate-700">{formatSaleDate(context.saleDate)}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
          입찰 참고가는 최저입찰가로 자동 설정됩니다. AI 분석 시 경매 조건이 함께 전달됩니다.
        </p>
      </div>

      <p className={`${PANEL_SECTION_LABEL} mb-2`}>입찰 참고가</p>
      <div className={PANEL_INPUT_WRAP}>
        <input
          type="text"
          inputMode="numeric"
          readOnly
          className={`${PANEL_INPUT} bg-slate-50 text-slate-700`}
          value={input.salePrice !== '' ? String(input.salePrice) : ''}
          placeholder="최저입찰 (만원)"
        />
      </div>
      <p className={PANEL_HINT}>만원 단위 · 경매 최저입찰가</p>

      {!isLand && (
        <>
          <div className={PANEL_DIVIDER} />
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="w-full text-left text-xs font-bold text-slate-600 py-1"
          >
            {showOptional ? '▾ 추가 정보 접기' : '▸ 층수·면적 추가 (선택)'}
          </button>
          {showOptional && (
            <div className="mt-2 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <div className={PANEL_INPUT_WRAP}>
                  <input
                    type="text"
                    placeholder="층수"
                    className={PANEL_INPUT}
                    value={String(input.floor)}
                    onChange={(e) => onChange({ floor: e.target.value })}
                  />
                </div>
                <div className={PANEL_INPUT_WRAP}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="전용면적 (㎡)"
                    className={PANEL_INPUT}
                    value={input.area}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      if (parts.length > 2) val = `${parts[0]}.${parts.slice(1).join('')}`;
                      onChange({ area: val });
                    }}
                  />
                </div>
              </div>
              <p className={PANEL_HINT}>비워도 분석 가능 · 정확도 향상용</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
