'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatDealMonth, formatPriceManwon } from '../lib/formatPriceManwon';
import {
  calculateInvestment,
  renderStars,
  type NearbyComp,
} from '../lib/redevInvestmentCalc';
import { fetchNearbyComps } from '../lib/redevNearbyCompsApi';

interface RedevInvestmentCalculatorProps {
  projectId: number;
  title: string;
}

const MAX_COMP_SELECT = 3;

export default function RedevInvestmentCalculator({ projectId, title }: RedevInvestmentCalculatorProps) {
  const [buyPrice, setBuyPrice] = useState('');
  const [contribution, setContribution] = useState('');
  const [targetArea, setTargetArea] = useState('');
  const [targetReturnPct, setTargetReturnPct] = useState('30');
  const [manualExpectedPrice, setManualExpectedPrice] = useState('');
  const [sort, setSort] = useState<'distance' | 'recent'>('distance');
  const [comps, setComps] = useState<NearbyComp[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const [compsError, setCompsError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  const areaNum = parseFloat(targetArea);

  const loadComps = useCallback(async () => {
    if (!Number.isFinite(areaNum) || areaNum <= 0) {
      setComps([]);
      setFallback(false);
      return;
    }
    setLoadingComps(true);
    setCompsError(null);
    try {
      const data = await fetchNearbyComps(projectId, areaNum, sort);
      setComps(data.comps || []);
      setFallback(Boolean(data.fallback));
      setSelectedIds((prev) => prev.filter((id) => (data.comps || []).some((c) => c.id === id)));
    } catch (err) {
      setComps([]);
      setFallback(true);
      setCompsError(err instanceof Error ? err.message : '비교 단지 로드 실패');
    } finally {
      setLoadingComps(false);
    }
  }, [areaNum, projectId, sort]);

  useEffect(() => {
    const timer = setTimeout(loadComps, 400);
    return () => clearTimeout(timer);
  }, [loadComps]);

  const selectedComps = useMemo(
    () => comps.filter((c) => selectedIds.includes(c.id)),
    [comps, selectedIds],
  );

  const result = useMemo(() => {
    const buy = parseInt(buyPrice.replace(/,/g, ''), 10);
    const contrib = parseInt(contribution.replace(/,/g, ''), 10);
    const manual = parseInt(manualExpectedPrice.replace(/,/g, ''), 10);
    const targetReturn = parseFloat(targetReturnPct) / 100;

    return calculateInvestment({
      buyPriceManwon: buy,
      additionalContributionManwon: Number.isFinite(contrib) ? contrib : 0,
      targetAreaSqm: areaNum,
      selectedComps,
      manualExpectedPriceManwon: Number.isFinite(manual) && manual > 0 ? manual : null,
      targetReturnRate: Number.isFinite(targetReturn) && targetReturn > 0 ? targetReturn : 0.3,
    });
  }, [areaNum, buyPrice, contribution, manualExpectedPrice, selectedComps, targetReturnPct]);

  const toggleComp = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMP_SELECT) return prev;
      return [...prev, id];
    });
  };

  const canShowResult = Boolean(result) && (
    selectedComps.length > 0 || (fallback && manualExpectedPrice.replace(/,/g, '').length > 0)
  );

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
      <div>
        <p className="text-[10px] font-extrabold text-emerald-800 tracking-wide">투자 계산기</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{title} · 지금 사면 얼마 벌어?</p>
        <div className="mt-2 space-y-1 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-2">
          <p className="text-[10px] font-bold text-rose-600 leading-snug">
            계약 전 반드시 조합에 조합원 지위 양도 가능 여부를 확인하세요.
          </p>
          <p className="text-[10px] font-bold text-rose-600 leading-snug">
            추가분담금은 공사비 인상 등으로 변동될 수 있습니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[9px] font-bold text-slate-500">매수가 (만원) *</span>
          <input
            type="text"
            inputMode="numeric"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="80000"
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold"
          />
        </label>
        <label className="block">
          <span className="text-[9px] font-bold text-slate-500">추가분담금 (만원) *</span>
          <input
            type="text"
            inputMode="numeric"
            value={contribution}
            onChange={(e) => setContribution(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="30000"
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold"
          />
        </label>
        <label className="block">
          <span className="text-[9px] font-bold text-slate-500">신청 평형 (㎡) *</span>
          <input
            type="text"
            inputMode="decimal"
            value={targetArea}
            onChange={(e) => setTargetArea(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="84"
            className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold"
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[9px] font-extrabold text-slate-700">
            주변 신축 (1km · 10년 이내 · ±10㎡)
          </p>
          <div className="flex gap-1">
            {(['distance', 'recent'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={`text-[9px] px-2 py-1 rounded-md font-extrabold border ${
                  sort === key
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {key === 'distance' ? '거리순' : '거래순'}
              </button>
            ))}
          </div>
        </div>

        {loadingComps && (
          <div className="flex items-center gap-2 text-[10px] text-slate-500 py-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            비교 단지 불러오는 중...
          </div>
        )}

        {!loadingComps && compsError && (
          <p className="text-[10px] text-rose-600 font-bold py-2">{compsError}</p>
        )}

        {!loadingComps && !compsError && comps.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] font-extrabold text-amber-800">비교 단지 없음</p>
            <p className="text-[9px] text-amber-700 mt-1">예상 신축 시세를 직접 입력하세요 (만원)</p>
            <input
              type="text"
              inputMode="numeric"
              value={manualExpectedPrice}
              onChange={(e) => setManualExpectedPrice(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="178500"
              className="mt-2 w-full rounded-lg border border-amber-200 px-2.5 py-2 text-xs font-bold bg-white"
            />
          </div>
        )}

        {!loadingComps && comps.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {comps.map((comp) => {
              const checked = selectedIds.includes(comp.id);
              const disabled = !checked && selectedIds.length >= MAX_COMP_SELECT;
              return (
                <button
                  key={comp.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleComp(comp.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                    checked
                      ? 'border-emerald-400 bg-emerald-50'
                      : disabled
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-sm leading-none mt-0.5 ${checked ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {checked ? '☑' : '☐'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[11px] font-extrabold text-slate-900 truncate">{comp.apt_name}</span>
                        <span className="text-[10px] font-bold text-slate-600">{comp.area_sqm}㎡</span>
                        <span className="text-[10px] font-extrabold text-emerald-700">
                          {formatPriceManwon(comp.deal_amount)}
                        </span>
                        <span className="text-[9px] text-slate-400">{formatDealMonth(comp.deal_date)}</span>
                        <span className="text-[9px] text-slate-400">{comp.distance_m}m</span>
                      </div>
                      {(comp.badges?.length ?? 0) > 0 && (
                        <p className="text-[9px] text-slate-500 mt-1 font-semibold">
                          {comp.badges!.join(' · ')}
                          {comp.total_units ? ` · ${comp.total_units.toLocaleString()}세대` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            <p className="text-[9px] text-slate-400 font-semibold">comp 최대 {MAX_COMP_SELECT}개 선택</p>
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-[9px] font-bold text-slate-500">목표 수익률 (%)</span>
        <input
          type="text"
          inputMode="numeric"
          value={targetReturnPct}
          onChange={(e) => setTargetReturnPct(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="30"
          className="mt-1 w-full sm:w-32 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-bold"
        />
      </label>

      {canShowResult && result && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
          <p className="text-[10px] font-extrabold text-slate-800">투자 분석 결과</p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-slate-400 font-bold">예상 신축 시세</p>
              <p className="font-extrabold text-slate-900">{result.expectedNewPriceLabel}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold">총 투자금</p>
              <p className="font-extrabold text-slate-900">{result.totalInvestmentLabel}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold">예상 시세차익</p>
              <p className={`font-extrabold ${result.expectedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {result.expectedProfitLabel}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-bold">수익률</p>
              <p className={`font-extrabold ${result.returnRate >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {result.returnRate.toFixed(1)}%
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400 font-bold">적정 매수가 ({targetReturnPct || '30'}% 목표)</p>
              <p className="font-extrabold text-violet-700">{result.fairBuyPriceLabel} 이하</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400 font-bold">투자 점수</p>
              <p className="font-extrabold text-amber-600">
                {renderStars(result.stars)} <span className="text-slate-700 ml-1">{result.grade}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-400 leading-relaxed">
        ⚠ 참고용 분석입니다. 투자 판단과 책임은 본인에게 있습니다.
      </p>
    </div>
  );
}
