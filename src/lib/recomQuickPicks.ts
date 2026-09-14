import {
  hasActiveInvestmentDiscoverFilters,
  isInvestmentDiscoverCategory,
  normalizeRecomInvestmentDiscoverFilters,
  type InvestmentDiscoverFilters,
} from './investmentDiscoverFilters';
import type { ApartmentDiscoverFilters } from './apartmentDiscoverFilters';
import { hasActiveApartmentCardFilters, hasStrictDataFilters } from './apartmentDiscoverFilters';
import { isPyeongFilterActive } from './aptDiscoverArea';
import { isPriceFilterActive } from './aptDiscoverPrice';
/** 매물(/listings) 목록 부제 */
export const LISTINGS_LIST_TAGLINE = '중개사·관리자가 등록한 매물입니다.';

export type RecomQuickPickId =
  | 'land-1eok'
  | 'building-10eok';

export type RecomQuickPick = {
  id: RecomQuickPickId;
  label: string;
  icon: string;
  category: string;
};

/** 추천(/recom) 카테고리 — 아파트는 일단 숨김 */
export const RECOM_CATEGORIES = ['토지', '빌딩'] as const;

export const LISTINGS_CATEGORIES = ['아파트', '토지', '빌딩'] as const;

/** 추천 목록·로그인 게이트 공통 부제 */
export const RECOM_LIST_TAGLINE = 'AI 점수가 높은 토지·빌딩 매물을 큐레이션합니다.';


/** 지도·목록 퀵픽 UI 노출 (false = 엄선 추천 패널 전체 숨김) */
export const RECOM_QUICK_PICKS_ENABLED = false;

/** 지도 퀵픽 패널 헤더 */
export const RECOM_QUICK_PICK_TITLE = '엄선 추천';

/**
 * 추천 페이지 — 아파트 필터 UI 숨김 섹션 (비우면 홈과 동일 전체 노출)
 */
export const RECOM_HIDDEN_APT_FILTER_SECTIONS: readonly string[] = [];

export const RECOM_QUICK_PICKS: RecomQuickPick[] = [
  {
    id: 'land-1eok',
    label: '1억 투자로 가능한 높은 점수 토지 검토하기',
    icon: '/land.svg',
    category: '토지',
  },
  {
    id: 'building-10eok',
    label: '10억 투자로 가능한 높은 점수 빌딩 검토하기',
    icon: '/build.svg',
    category: '빌딩',
  },
];


/** @deprecated import from investmentDiscoverFilters */
export { RECOM_INVESTMENT_MIN_AI_SCORE } from './investmentDiscoverFilters';

/** 토지·빌딩 퀵픽 — AI 50점+ 기본 (예산은 유저가 별도 선택) */
export function applyRecomInvestmentQuickPick(
  filters: InvestmentDiscoverFilters,
): InvestmentDiscoverFilters {
  return normalizeRecomInvestmentDiscoverFilters(filters);
}

export function recomQuickPickCategory(id: RecomQuickPickId): string {
  return RECOM_QUICK_PICKS.find((p) => p.id === id)?.category ?? '토지';
}

export function isRecomApartmentListingCategory(category: string): boolean {
  const c = (category || '').trim().toLowerCase();
  return c.includes('apartment') || c === '아파트';
}

/** 추천(/recom) — 기본 토지 */
export function normalizeRecomCategory(raw: string | null | undefined): string {
  const c = (raw ?? '').trim().toLowerCase();
  if (!c || c === 'all' || c === '전체') return '토지';
  if (c.includes('apartment') || c === '아파트') return '토지';
  if (c.includes('land') || c === '토지') return '토지';
  if (c.includes('building') || c === '빌딩') return '빌딩';
  return '토지';
}

/** 매물(/listings) — 기본 아파트 */
export function normalizeListingsCategory(raw: string | null | undefined): string {
  const c = (raw ?? '').trim().toLowerCase();
  if (!c || c === 'all' || c === '전체') return '아파트';
  if (c.includes('apartment') || c === '아파트') return '아파트';
  if (c.includes('land') || c === '토지') return '토지';
  if (c.includes('building') || c === '빌딩') return '빌딩';
  return '아파트';
}

/** 추천 — 아파트(제시가 비교)·토지·빌딩은 로그인 후 즉시 조회 */
export function recomHasActiveFilters(
  category: string,
  discoverFilters: ApartmentDiscoverFilters,
  investmentFilters: InvestmentDiscoverFilters,
): boolean {
  if (isRecomApartmentListingCategory(category)) return true;
  if (isInvestmentDiscoverCategory(category)) return true;

  const aptActive =
    hasStrictDataFilters(discoverFilters)
    || isPriceFilterActive(discoverFilters.priceMinEok, discoverFilters.priceMaxEok)
    || isPyeongFilterActive(discoverFilters)
    || discoverFilters.sortBy !== 'default'
    || hasActiveApartmentCardFilters(discoverFilters);

  const invActive = hasActiveInvestmentDiscoverFilters(investmentFilters);

  if (category === '아파트') return aptActive;
  if (category === 'all') return aptActive || invActive;
  return false;
}
