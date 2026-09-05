import {
  hasActiveInvestmentDiscoverFilters,
  isInvestmentDiscoverCategory,
  type InvestmentDiscoverFilters,
} from './investmentDiscoverFilters';
import type { ApartmentDiscoverFilters } from './apartmentDiscoverFilters';
import { hasActiveApartmentCardFilters, hasStrictDataFilters } from './apartmentDiscoverFilters';
import { isPyeongFilterActive } from './aptDiscoverArea';
import { isPriceFilterActive } from './aptDiscoverPrice';
import { RECOM_INVESTMENT_MIN_AI_SCORE } from './investmentDiscoverFilters';

export type RecomQuickPickId =
  | 'land-1eok'
  | 'building-10eok';

export type RecomQuickPick = {
  id: RecomQuickPickId;
  label: string;
  icon: string;
  category: string;
};

export const RECOM_CATEGORIES = ['토지', '빌딩'] as const;

/** 추천 목록·로그인 게이트 공통 부제 */
export const RECOM_LIST_TAGLINE = '분석 2만+건 중 높은 점수 7.5%만 추천합니다.';

/** 매물(/listings) 목록 부제 */
export const LISTINGS_LIST_TAGLINE = '중개사·관리자가 등록한 매물입니다.';

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
  return {
    ...filters,
    minAiScore: RECOM_INVESTMENT_MIN_AI_SCORE,
    maxAiScore: null,
  };
}

export function recomQuickPickCategory(id: RecomQuickPickId): string {
  return RECOM_QUICK_PICKS.find((p) => p.id === id)?.category ?? '토지';
}

/** 추천 페이지 — 토지·빌딩만, 기본 토지 */
export function normalizeRecomCategory(raw: string | null | undefined): string {
  const c = (raw ?? '').trim().toLowerCase();
  if (!c || c === 'all' || c === '전체') return '토지';
  if (c.includes('land') || c === '토지') return '토지';
  if (c.includes('building') || c === '빌딩') return '빌딩';
  return '토지';
}

/** 추천 — 토지·빌딩은 기본 50점+·최신순으로 즉시 조회 */
export function recomHasActiveFilters(
  category: string,
  discoverFilters: ApartmentDiscoverFilters,
  investmentFilters: InvestmentDiscoverFilters,
): boolean {
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
