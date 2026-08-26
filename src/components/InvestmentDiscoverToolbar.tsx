'use client';

import {
  type InvestmentDiscoverFilters,
  formatAiFilterLabel,
  formatInvestmentSortLabel,
  formatPriceFilterLabel,
  isInvestmentAiFilterActive,
  isPriceFilterActive,
} from '../lib/investmentDiscoverFilters';

type Props = {
  filters: InvestmentDiscoverFilters;
  onOpenSheet: (section?: string) => void;
};

function pill(active: boolean) {
  return [
    'shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
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

export default function InvestmentDiscoverToolbar({ filters, onOpenSheet }: Props) {
  const chips = [
    {
      section: 'price',
      label: formatPriceFilterLabel(filters.priceMinEok, filters.priceMaxEok),
      active: isPriceFilterActive(filters.priceMinEok, filters.priceMaxEok),
    },
    {
      section: 'ai',
      label: formatAiFilterLabel(filters.minAiScore, filters.maxAiScore),
      active: isInvestmentAiFilterActive(filters),
    },
    {
      section: 'sort',
      label: formatInvestmentSortLabel(filters.sortBy),
      active: filters.sortBy !== 'recent',
    },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5">
      {chips.map((c) => (
        <button
          key={c.section}
          type="button"
          className={pill(c.active)}
          onClick={() => onOpenSheet(c.section)}
        >
          <span>{c.label}</span>
          <Chevron />
        </button>
      ))}
    </div>
  );
}
