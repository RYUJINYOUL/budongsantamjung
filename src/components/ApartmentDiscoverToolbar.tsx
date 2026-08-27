'use client';

import {
  type ApartmentDiscoverFilters,
  type ApartmentDealMode,
  APARTMENT_RISE_5Y_MIN,
  clearApartmentLongTermRiseFilters,
  isApartmentRise10yDoubledActive,
  isApartmentRise5y30Active,
  toggleApartmentRise10yDoubled,
  toggleApartmentRise5y30,
} from '../lib/apartmentDiscoverFilters';
import { formatPyeongFilterLabel, isPyeongFilterActive } from '../lib/aptDiscoverArea';
import { formatPriceFilterLabel, isPriceFilterActive } from '../lib/aptDiscoverPrice';

type Props = {
  filters: ApartmentDiscoverFilters;
  onOpenSheet: (section?: string) => void;
  onApply: (f: ApartmentDiscoverFilters) => void;
};

const DEAL_LABEL: Record<ApartmentDealMode, string> = {
  sale: '매매',
  jeonse: '전세',
  wolse: '월세',
};

function pill(active: boolean) {
  return [
    'shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
    active
      ? 'bg-slate-100 border-slate-300 text-slate-900'
      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
  ].join(' ');
}

function risePresetPill(active: boolean) {
  return [
    'shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
    active
      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
      : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-800',
  ].join(' ');
}

function clearBtnClass(active: boolean) {
  return [
    'shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
    active
      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
      : 'bg-white border-slate-200 text-slate-400 pointer-events-none opacity-50',
  ].join(' ');
}

function Chevron() {
  return (
    <svg className="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const SHEET_CHIPS: {
  section: string;
  label: (f: ApartmentDiscoverFilters) => string;
  active: (f: ApartmentDiscoverFilters) => boolean;
}[] = [
  { section: 'deal', label: (f) => DEAL_LABEL[f.dealMode], active: () => true },
  {
    section: 'price',
    label: (f) => formatPriceFilterLabel(f.priceMinEok, f.priceMaxEok),
    active: (f) => isPriceFilterActive(f.priceMinEok, f.priceMaxEok),
  },
  {
    section: 'area',
    label: (f) => formatPyeongFilterLabel(f.pyeongMin, f.pyeongMax),
    active: (f) => isPyeongFilterActive(f),
  },
  { section: 'age', label: () => '입주년차', active: (f) => f.maxBuildingAgeYears != null },
  { section: 'households', label: () => '세대수', active: (f) => f.minHouseholds != null },
  { section: 'parking', label: () => '주차', active: (f) => f.minParkingPerHousehold != null || f.maxParkingPerHousehold != null },
  { section: 'gap', label: () => '갭가격', active: (f) => f.minGapMan != null || f.maxGapMan != null },
  { section: 'jeonse', label: () => '전세가율', active: (f) => f.minJeonseRatePercent != null || f.maxJeonseRatePercent != null },
  { section: 'school', label: () => '초등학교', active: (f) => f.maxElementaryNavMinutes != null },
  { section: 'entrance', label: () => '현관구조', active: (f) => f.entranceTypes.length > 0 },
  { section: 'heating', label: () => '난방방식', active: (f) => f.heatingTypes.length > 0 },
  {
    section: 'sort',
    label: (f) => {
      if (f.sortBy === 'rise_desc') return '상승률↓';
      if (f.sortBy === 'rise_asc') return '상승률↑';
      if (f.sortBy === 'trade_desc') return '거래량↓';
      if (f.sortBy === 'trade_asc') return '거래량↑';
      return '정렬';
    },
    active: (f) => f.sortBy !== 'default',
  },
];

export default function ApartmentDiscoverToolbar({ filters, onOpenSheet, onApply }: Props) {
  const riseActive = filters.minRiseRate5y != null || filters.minRiseRate10y != null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5">
        <button
          type="button"
          className={risePresetPill(isApartmentRise10yDoubledActive(filters))}
          onClick={() => onApply(toggleApartmentRise10yDoubled(filters))}
        >
          10년 2배+
        </button>
        <button
          type="button"
          className={risePresetPill(isApartmentRise5y30Active(filters))}
          onClick={() => onApply(toggleApartmentRise5y30(filters))}
        >
          5년 {APARTMENT_RISE_5Y_MIN}%+
        </button>
        <button
          type="button"
          className={clearBtnClass(riseActive)}
          onClick={() => onApply(clearApartmentLongTermRiseFilters(filters))}
        >
          상승 해제
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5">
        {SHEET_CHIPS.map((c) => (
          <button
            key={c.section}
            type="button"
            className={pill(c.active(filters))}
            onClick={() => onOpenSheet(c.section)}
          >
            {c.label(filters)}
            <Chevron />
          </button>
        ))}
      </div>
    </div>
  );
}
