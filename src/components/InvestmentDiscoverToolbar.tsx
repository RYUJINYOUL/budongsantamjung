'use client';

import { useEffect, useState } from 'react';
import {
  type InvestmentDiscoverFilters,
  RECOM_INVESTMENT_MIN_SCORE_PRESETS,
  INVESTMENT_PRICE_MAX_PRESETS_EOK,
  applyInvestmentPriceMaxEok,
  clearInvestmentAiScoreFilter,
  clearInvestmentPriceFilter,
  formatInvestmentSortLabel,
  investmentPriceInputValue,
  isInvestmentMinScorePresetActive,
  isInvestmentPriceMaxPresetActive,
  isInvestmentPriceFilterActive,
  isInvestmentAiFilterActive,
  toggleInvestmentMinScorePreset,
} from '../lib/investmentDiscoverFilters';

type Props = {
  filters: InvestmentDiscoverFilters;
  onOpenSheet: (section?: string) => void;
  onApply: (f: InvestmentDiscoverFilters) => void;
  comfortable?: boolean;
};

function presetPill(active: boolean, comfortable?: boolean) {
  return [
    'shrink-0 font-bold border transition-all',
    comfortable ? 'px-4 py-2.5 rounded-xl text-[13px]' : 'px-2 py-1 rounded-lg text-[10px]',
    active
      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
      : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-800',
  ].join(' ');
}

function clearBtnClass(active: boolean, comfortable?: boolean) {
  return [
    'shrink-0 font-bold border transition-all',
    comfortable ? 'px-3.5 py-2.5 rounded-xl text-[12px]' : 'px-2 py-1 rounded-lg text-[10px]',
    active
      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
      : 'bg-white border-slate-200 text-slate-400 pointer-events-none opacity-50',
  ].join(' ');
}

function sortPill(active: boolean, comfortable?: boolean) {
  return [
    'shrink-0 inline-flex items-center gap-0.5 font-bold border transition-all',
    comfortable ? 'px-3.5 py-2.5 rounded-xl text-[12px] gap-1' : 'px-2 py-1 rounded-lg text-[10px]',
    active
      ? 'bg-slate-100 border-slate-300 text-slate-900'
      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
  ].join(' ');
}

function Chevron() {
  return (
    <svg className="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function InvestmentDiscoverToolbar({
  filters,
  onOpenSheet,
  onApply,
  comfortable = false,
}: Props) {
  const [priceInput, setPriceInput] = useState(() => investmentPriceInputValue(filters));
  const chipGap = comfortable ? 'gap-2' : 'gap-1';
  const rowGap = comfortable ? 'space-y-3' : 'space-y-1.5';
  const inputNoSpinner =
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
  const inputClass = comfortable
    ? `w-14 px-2 py-2 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-800 text-center focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 ${inputNoSpinner}`
    : `w-11 px-1.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200 text-slate-800 text-center focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 ${inputNoSpinner}`;

  useEffect(() => {
    setPriceInput(investmentPriceInputValue(filters));
  }, [filters.priceMinEok, filters.priceMaxEok]);

  const priceActive = isInvestmentPriceFilterActive(filters.priceMinEok, filters.priceMaxEok);
  const scoreActive = isInvestmentAiFilterActive(filters);

  const applyPriceFromInput = () => {
    const trimmed = priceInput.trim();
    if (!trimmed) {
      if (priceActive) onApply(clearInvestmentPriceFilter(filters));
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n < 1) return;
    onApply(applyInvestmentPriceMaxEok(filters, n));
  };

  return (
    <div className={rowGap}>
      <div className={`flex items-center flex-wrap ${chipGap} pb-0.5 -mx-0.5 px-0.5`}>
        {INVESTMENT_PRICE_MAX_PRESETS_EOK.map((eok) => (
          <button
            key={eok}
            type="button"
            className={presetPill(isInvestmentPriceMaxPresetActive(filters, eok), comfortable)}
            onClick={() => {
              setPriceInput(String(eok));
              onApply(applyInvestmentPriceMaxEok(filters, eok));
            }}
          >
            {eok}억
          </button>
        ))}
        <div className={`shrink-0 flex items-center gap-1 pl-1 border-l border-slate-200 ml-0.5 ${comfortable ? 'py-0.5' : ''}`}>
          <input
            type="number"
            min={1}
            max={1000}
            inputMode="numeric"
            placeholder="억"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={applyPriceFromInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyPriceFromInput();
              }
            }}
            className={inputClass}
            aria-label="예산 상한 (억)"
          />
          <span className={`font-bold text-slate-400 shrink-0 ${comfortable ? 'text-[11px]' : 'text-[9px]'}`}>억↓</span>
        </div>
        <button
          type="button"
          disabled={!priceActive}
          className={clearBtnClass(priceActive, comfortable)}
          onClick={() => {
            setPriceInput('');
            onApply(clearInvestmentPriceFilter(filters));
          }}
        >
          해제
        </button>
      </div>

      <div className={`flex items-center flex-wrap ${chipGap} pb-0.5 -mx-0.5 px-0.5`}>
        {RECOM_INVESTMENT_MIN_SCORE_PRESETS.map((score) => (
          <button
            key={score}
            type="button"
            className={presetPill(isInvestmentMinScorePresetActive(filters, score), comfortable)}
            onClick={() => onApply(toggleInvestmentMinScorePreset(filters, score))}
          >
            {score}점+
          </button>
        ))}
        <button
          type="button"
          disabled={!scoreActive}
          className={clearBtnClass(scoreActive, comfortable)}
          onClick={() => onApply(clearInvestmentAiScoreFilter(filters))}
        >
          해제
        </button>
        <button
          type="button"
          className={sortPill(filters.sortBy !== 'recent', comfortable)}
          onClick={() => onOpenSheet('sort')}
        >
          {formatInvestmentSortLabel(filters.sortBy)}
          <Chevron />
        </button>
      </div>
    </div>
  );
}
