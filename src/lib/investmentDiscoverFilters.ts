import { PRICE_FILTER_MAX_EOK } from './aptDiscoverPrice';
import type { MapFeedScope } from './homeMapSession';

/** 토지·빌딩·주택·상가 예산 필터 상한 (억) */
export const INVESTMENT_PRICE_FILTER_MAX_EOK = 1000;
/** 슬라이더 1칸 = 5억 */
export const INVESTMENT_PRICE_FILTER_STEP_EOK = 5;

/** 투자 discover — 예산 상한 프리셋 (억). 직접 입력으로 그 외 금액 가능 */
export const INVESTMENT_PRICE_MAX_PRESETS_EOK = [1, 5, 10, 30, 100] as const;

/** 추천(/recom) — AI 최소 점수 (60점 제외, 70+ 통일) */
export const RECOM_INVESTMENT_MIN_AI_SCORE = 70;

/** 홈 툴바 — AI 최소 점수 프리셋 (추천은 RECOM_INVESTMENT_MIN_SCORE_PRESETS) */
export const INVESTMENT_MIN_SCORE_PRESETS = [60, 70] as const;

/** 추천(/recom) — AI 최소 점수 프리셋 */
export const RECOM_INVESTMENT_MIN_SCORE_PRESETS = [70] as const;

const INVESTMENT_DISCOVER_CATEGORIES = ['토지', '빌딩', '주택', '상가'] as const;

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
export const INVESTMENT_DISCOVER_FILTERS_RECOM_KEY = 'investment_discover_filters_recom_v1';

function investmentDiscoverFiltersStorageKey(scope: MapFeedScope): string {
  return scope === 'recom' ? INVESTMENT_DISCOVER_FILTERS_RECOM_KEY : INVESTMENT_DISCOVER_FILTERS_KEY;
}

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

export function loadInvestmentDiscoverFilters(scope: MapFeedScope = 'home'): InvestmentDiscoverFilters {
  // 홈 — 투자 필터 UI 없음, recom과 분리 전 localStorage 잔존값 무시
  if (scope === 'home') return defaultInvestmentDiscoverFilters();
  if (typeof window === 'undefined') return defaultInvestmentDiscoverFilters();
  try {
    const raw = localStorage.getItem(investmentDiscoverFiltersStorageKey(scope));
    if (!raw) return defaultInvestmentDiscoverFilters();
    const parsed = JSON.parse(raw) as Partial<InvestmentDiscoverFilters>;
    const merged = { ...defaultInvestmentDiscoverFilters(), ...parsed };
    if (merged.priceMinEok == null) merged.priceMinEok = 0;
    if (merged.priceMaxEok == null) merged.priceMaxEok = INVESTMENT_PRICE_FILTER_MAX_EOK;
    merged.priceMaxEok = normalizeInvestmentPriceMaxEok(merged.priceMaxEok, merged.priceMinEok);
    if (merged.minAiScore != null && merged.minAiScore < RECOM_INVESTMENT_MIN_AI_SCORE) {
      merged.minAiScore = null;
    }
    return merged;
  } catch {
    return defaultInvestmentDiscoverFilters();
  }
}

export function saveInvestmentDiscoverFilters(
  f: InvestmentDiscoverFilters,
  scope: MapFeedScope = 'home',
) {
  if (typeof window === 'undefined') return;
  if (scope === 'home') return;
  localStorage.setItem(investmentDiscoverFiltersStorageKey(scope), JSON.stringify(f));
  window.dispatchEvent(new CustomEvent('investment-discover-filters-updated', { detail: { scope } }));
}

export function isInvestmentDiscoverCategory(category: string): boolean {
  return (INVESTMENT_DISCOVER_CATEGORIES as readonly string[]).includes(category);
}

export function isInvestmentPriceMaxPresetActive(
  filters: InvestmentDiscoverFilters,
  maxEok: number,
): boolean {
  return filters.priceMinEok === 0
    && filters.priceMaxEok === maxEok
    && maxEok < INVESTMENT_PRICE_FILTER_MAX_EOK;
}

export function isInvestmentMinScorePresetActive(
  filters: InvestmentDiscoverFilters,
  minScore: number,
): boolean {
  return filters.minAiScore === minScore && filters.maxAiScore == null;
}

/** 예산 상한 프리셋 — 같은 칩 재탭 시 해제 */
export function toggleInvestmentPriceMaxPreset(
  filters: InvestmentDiscoverFilters,
  maxEok: number,
): InvestmentDiscoverFilters {
  if (isInvestmentPriceMaxPresetActive(filters, maxEok)) {
    return { ...filters, priceMinEok: 0, priceMaxEok: INVESTMENT_PRICE_FILTER_MAX_EOK };
  }
  return { ...filters, priceMinEok: 0, priceMaxEok: maxEok };
}

/** AI 최소 점수 프리셋 — 같은 칩 재탭 시 해제 */
export function toggleInvestmentMinScorePreset(
  filters: InvestmentDiscoverFilters,
  minScore: number,
): InvestmentDiscoverFilters {
  if (isInvestmentMinScorePresetActive(filters, minScore)) {
    return { ...filters, minAiScore: null, maxAiScore: null };
  }
  return { ...filters, minAiScore: minScore, maxAiScore: null };
}

export function clearInvestmentPriceFilter(
  filters: InvestmentDiscoverFilters,
): InvestmentDiscoverFilters {
  return { ...filters, priceMinEok: 0, priceMaxEok: INVESTMENT_PRICE_FILTER_MAX_EOK };
}

export function clearInvestmentAiScoreFilter(
  filters: InvestmentDiscoverFilters,
): InvestmentDiscoverFilters {
  return { ...filters, minAiScore: null, maxAiScore: null };
}

/** ~N억 이하 상한 적용 (칩·입력창 공통) */
export function applyInvestmentPriceMaxEok(
  filters: InvestmentDiscoverFilters,
  maxEok: number,
): InvestmentDiscoverFilters {
  const clamped = Math.min(Math.max(Math.round(maxEok), 1), INVESTMENT_PRICE_FILTER_MAX_EOK);
  return { ...filters, priceMinEok: 0, priceMaxEok: clamped };
}

/** 입력창 표시용 — 상한만 걸린 경우 N, 그 외 빈 문자열 */
export function investmentPriceInputValue(filters: InvestmentDiscoverFilters): string {
  if (filters.priceMinEok !== 0) return '';
  if (!isInvestmentPriceFilterActive(filters.priceMinEok, filters.priceMaxEok)) return '';
  if (filters.priceMaxEok >= INVESTMENT_PRICE_FILTER_MAX_EOK) return '';
  return String(filters.priceMaxEok);
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
