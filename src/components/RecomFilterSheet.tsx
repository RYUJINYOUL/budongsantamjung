'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ApartmentDiscoverToolbar from './ApartmentDiscoverToolbar';
import InvestmentDiscoverToolbar from './InvestmentDiscoverToolbar';
import { RECOM_CATEGORIES } from '../lib/recomQuickPicks';
import { isInvestmentDiscoverCategory } from '../lib/investmentDiscoverFilters';
import type { ApartmentDiscoverFilters } from '../lib/apartmentDiscoverFilters';
import type { InvestmentDiscoverFilters } from '../lib/investmentDiscoverFilters';

const CATEGORY_LABELS: Record<string, string> = {
  아파트: '아파트',
  토지: '토지',
  주택: '주택',
  상가: '상가',
  빌딩: '빌딩',
};

type Props = {
  open: boolean;
  onClose: () => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  discoverFilters: ApartmentDiscoverFilters;
  investmentFilters: InvestmentDiscoverFilters;
  onDiscoverApply: (f: ApartmentDiscoverFilters) => void;
  onInvestmentApply: (f: InvestmentDiscoverFilters) => void;
  onOpenApartmentSheet: (section?: string) => void;
  onOpenInvestmentSheet: (section?: string) => void;
};

export default function RecomFilterSheet({
  open,
  onClose,
  selectedCategory,
  onCategoryChange,
  discoverFilters,
  investmentFilters,
  onDiscoverApply,
  onInvestmentApply,
  onOpenApartmentSheet,
  onOpenInvestmentSheet,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[190] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="필터 닫기"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[min(92vh,720px)] flex flex-col bg-white rounded-t-[1.25rem] shadow-2xl border border-slate-200/80 animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recom-filter-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <h2 id="recom-filter-sheet-title" className="text-base font-black text-slate-900">
            추천 필터
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-7">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-3">유형</p>
            <div className="flex flex-wrap gap-2">
              {RECOM_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryChange(cat)}
                  className={[
                    'px-4 py-2.5 rounded-full text-[13px] font-bold border transition-all',
                    selectedCategory === cat
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/15'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700',
                  ].join(' ')}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {selectedCategory === '아파트' && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-3">조건</p>
              <ApartmentDiscoverToolbar
                filters={discoverFilters}
                risePresetPlacement="top"
                onOpenSheet={(section) => {
                  onClose();
                  onOpenApartmentSheet(section);
                }}
                onApply={onDiscoverApply}
              />
            </div>
          )}

          {isInvestmentDiscoverCategory(selectedCategory) && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-3">조건</p>
              <InvestmentDiscoverToolbar
                filters={investmentFilters}
                comfortable
                onOpenSheet={(section) => {
                  onClose();
                  onOpenInvestmentSheet(section);
                }}
                onApply={onInvestmentApply}
              />
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-[15px] font-black transition-all active:scale-[0.98] shadow-sm shadow-emerald-500/20"
          >
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
