import { PRICE_FILTER_MAX_EOK } from './aptDiscoverPrice';

/** 토지·빌딩 예산 필터 상한 (억) */
export const INVESTMENT_PRICE_FILTER_MAX_EOK = 1000;
/** 슬라이더 1칸 = 5억 */
export const INVESTMENT_PRICE_FILTER_STEP_EOK = 5;

export function isInvestmentPriceFilterActive(priceMinEok: number, priceMaxEok: number): boolean {
  return priceMinEok > 0 || priceMaxEok < INVESTMENT_PRICE_FILTER_MAX_EOK;
}

export function formatInvestmentPriceFilterLabel(priceMinEok: number, priceMaxEok: number): string {
  if (!isInvestmentPriceFilterActive(priceMinEok, priceMaxEok)) return '가격';
  if (priceMinEok <= 0 && priceMaxEok < INVESTMENT_PRICE_FILTER_MAX_EOK) return `~${priceMaxEok}억`;
  if (priceMinEok > 0 && priceMaxEok >= INVESTMENT_PRICE_FILTER_MAX_EOK) return `${priceMinEok}억~`;
  return `${priceMinEok}~${priceMaxEok}억`;
}

function normalizeInvestmentPriceMaxEok(priceMaxEok: number, priceMinEok = 0): number {
  if (priceMinEok === 0 && priceMaxEok === PRICE_FILTER_MAX_EOK) return INVESTMENT_PRICE_FILTER_MAX_EOK;
  return Math.min(Math.max(priceMaxEok, 0), INVESTMENT_PRICE_FILTER_MAX_EOK);
}

export type InvestmentDiscoverSort =
  | 'recent'
  | 'ai_desc'
  | 'ai_asc'
  | 'price_desc'
  | 'price_asc';

export type InvestmentDiscoverFilters = {
  priceMinEok: number;
  priceMaxEok: number;
  /** null = 제한 없음 */
  minAiScore: number | null;
  maxAiScore: number | null;
  sortBy: InvestmentDiscoverSort;
};

export const INVESTMENT_DISCOVER_FILTERS_KEY = 'investment_discover_filters_v1';

export const INVESTMENT_SORT_OPTIONS: { id: InvestmentDiscoverSort; label: string }[] = [
  { id: 'recent', label: '최신순' },
  { id: 'ai_desc', label: 'AI점수 높은순' },
  { id: 'ai_asc', label: 'AI점수 낮은순' },
  { id: 'price_desc', label: '예산 높은순' },
  { id: 'price_asc', label: '예산 낮은순' },
];

export function defaultInvestmentDiscoverFilters(): InvestmentDiscoverFilters {
  return {
    priceMinEok: 0,
    priceMaxEok: INVESTMENT_PRICE_FILTER_MAX_EOK,
    minAiScore: null,
    maxAiScore: null,
    sortBy: 'recent',
  };
}

export function loadInvestmentDiscoverFilters(): InvestmentDiscoverFilters {
  if (typeof window === 'undefined') return defaultInvestmentDiscoverFilters();
  try {
    const raw = localStorage.getItem(INVESTMENT_DISCOVER_FILTERS_KEY);
    if (!raw) return defaultInvestmentDiscoverFilters();
    const parsed = JSON.parse(raw) as Partial<InvestmentDiscoverFilters>;
    const merged = { ...defaultInvestmentDiscoverFilters(), ...parsed };
    if (merged.priceMinEok == null) merged.priceMinEok = 0;
    if (merged.priceMaxEok == null) merged.priceMaxEok = INVESTMENT_PRICE_FILTER_MAX_EOK;
    merged.priceMaxEok = normalizeInvestmentPriceMaxEok(merged.priceMaxEok, merged.priceMinEok);
    return merged;
  } catch {
    return defaultInvestmentDiscoverFilters();
  }
}

export function saveInvestmentDiscoverFilters(f: InvestmentDiscoverFilters) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INVESTMENT_DISCOVER_FILTERS_KEY, JSON.stringify(f));
  window.dispatchEvent(new CustomEvent('investment-discover-filters-updated'));
}

export function isInvestmentDiscoverCategory(category: string): boolean {
  return category === '토지' || category === '빌딩';
}

export function resolveAnalysisAiScore(item: {
  propertyGrade?: { riskScore?: string | number | null };
}): number {
  const n = parseFloat(String(item.propertyGrade?.riskScore ?? '0'));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function eokToMan(eok: number): number {
  return Math.round(eok * 10000);
}

export function passesInvestmentDiscoverFilters(
  item: {
    budgetMan?: number | null;
    propertyGrade?: { riskScore?: string | number | null };
  },
  filters: InvestmentDiscoverFilters,
): boolean {
  if (isInvestmentPriceFilterActive(filters.priceMinEok, filters.priceMaxEok)) {
    const man = item.budgetMan;
    if (man == null || !Number.isFinite(man)) return false;
    const minMan = eokToMan(filters.priceMinEok);
    const maxMan = filters.priceMaxEok >= INVESTMENT_PRICE_FILTER_MAX_EOK
      ? Number.MAX_SAFE_INTEGER
      : eokToMan(filters.priceMaxEok);
    if (man < minMan || man > maxMan) return false;
  }

  const score = resolveAnalysisAiScore(item);
  if (filters.minAiScore != null && score < filters.minAiScore) return false;
  if (filters.maxAiScore != null && score > filters.maxAiScore) return false;
  return true;
}

export function sortInvestmentDiscoverList<T extends {
  budgetMan?: number | null;
  propertyGrade?: { riskScore?: string | number | null };
  createdAt?: string;
}>(
  list: T[],
  filters: InvestmentDiscoverFilters,
): T[] {
  const sorted = [...list];
  if (filters.sortBy === 'ai_desc') {
    return sorted.sort((a, b) => resolveAnalysisAiScore(b) - resolveAnalysisAiScore(a));
  }
  if (filters.sortBy === 'ai_asc') {
    return sorted.sort((a, b) => resolveAnalysisAiScore(a) - resolveAnalysisAiScore(b));
  }
  if (filters.sortBy === 'price_desc') {
    return sorted.sort((a, b) => (b.budgetMan ?? 0) - (a.budgetMan ?? 0));
  }
  if (filters.sortBy === 'price_asc') {
    return sorted.sort((a, b) => (a.budgetMan ?? 0) - (b.budgetMan ?? 0));
  }
  return sorted.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

export function isInvestmentAiFilterActive(filters: InvestmentDiscoverFilters): boolean {
  return filters.minAiScore != null || filters.maxAiScore != null;
}

export function formatAiFilterLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'AI점수';
  if (min != null && max == null) return `AI ${min}점~`;
  if (min == null && max != null) return `AI ~${max}점`;
  return `AI ${min}~${max}점`;
}

export function formatInvestmentSortLabel(sortBy: InvestmentDiscoverSort): string {
  return INVESTMENT_SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? '정렬';
}

export function hasActiveInvestmentDiscoverFilters(filters: InvestmentDiscoverFilters): boolean {
  return (
    isInvestmentPriceFilterActive(filters.priceMinEok, filters.priceMaxEok)
    || isInvestmentAiFilterActive(filters)
    || filters.sortBy !== 'recent'
  );
}

export function investmentDiscoverFilterHints(filters: InvestmentDiscoverFilters): string[] {
  const hints: string[] = [];
  if (isInvestmentPriceFilterActive(filters.priceMinEok, filters.priceMaxEok)) {
    hints.push(`가격 ${formatInvestmentPriceFilterLabel(filters.priceMinEok, filters.priceMaxEok)} — 가격 정보가 없는 매물은 제외됩니다`);
  }
  if (filters.minAiScore != null) {
    hints.push(`AI ${filters.minAiScore}점 이상만 표시`);
  }
  if (filters.maxAiScore != null) {
    hints.push(`AI ${filters.maxAiScore}점 이하만 표시`);
  }
  return hints;
}

export {
  formatInvestmentPriceFilterLabel as formatPriceFilterLabel,
  isInvestmentPriceFilterActive as isPriceFilterActive,
};
