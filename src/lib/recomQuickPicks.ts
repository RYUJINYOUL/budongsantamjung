import {
  APARTMENT_RISE_10Y_MIN,
  hasActiveApartmentCardFilters,
  hasStrictDataFilters,
  type ApartmentDiscoverFilters,
} from './apartmentDiscoverFilters';
import { isPyeongFilterActive } from './aptDiscoverArea';
import { isPriceFilterActive } from './aptDiscoverPrice';
import {
  RECOM_INVESTMENT_MIN_AI_SCORE,
  hasActiveInvestmentDiscoverFilters,
  isInvestmentDiscoverCategory,
  type InvestmentDiscoverFilters,
} from './investmentDiscoverFilters';

export type RecomQuickPickId =
  | 'apt-rise'
  | 'land-1eok'
  | 'house-3eok'
  | 'store-1eok'
  | 'building-10eok';

export type RecomQuickPick = {
  id: RecomQuickPickId;
  label: string;
  icon: string;
  category: string;
};

export const RECOM_CATEGORIES = ['아파트', '토지', '주택', '상가', '빌딩'] as const;

/** 추천 목록·로그인 게이트 공통 부제 */
export const RECOM_LIST_TAGLINE = '분석 2만+건 중 높은 점수 7.5%만 추천합니다.';

/** 지도 퀵픽 패널 헤더 */
export const RECOM_QUICK_PICK_TITLE = '엄선 추천';

/**
 * 추천 페이지 — 아파트 필터 UI 숨김 섹션 (비우면 홈과 동일 전체 노출)
 */
export const RECOM_HIDDEN_APT_FILTER_SECTIONS: readonly string[] = [];

export const RECOM_QUICK_PICKS: RecomQuickPick[] = [
  {
    id: 'apt-rise',
    label: '10년 2배, 5년 50% 오른 아파트 확인하기',
    icon: '/apart.svg',
    category: '아파트',
  },
  {
    id: 'land-1eok',
    label: '1억 투자로 가능한 높은 점수 토지 검토하기',
    icon: '/land.svg',
    category: '토지',
  },
  {
    id: 'house-3eok',
    label: '3억 투자로 가능한 높은 점수 주택 검토하기',
    icon: '/jutack.svg',
    category: '주택',
  },
  {
    id: 'store-1eok',
    label: '1억 투자로 가능한 높은 점수 상가 검토하기',
    icon: '/cshop.svg',
    category: '상가',
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

/** 아파트 퀵픽 — 10년 2배+ 만 적용 (5년 30%·가격 등은 유저가 별도 선택) */
export function applyRecomApartmentQuickPick(
  filters: ApartmentDiscoverFilters,
): ApartmentDiscoverFilters {
  return {
    ...filters,
    minRiseRate10y: APARTMENT_RISE_10Y_MIN,
  };
}

/** 토지·주택·상가·빌딩 퀵픽 — AI 60점+ 기본 (1억·3억 등 예산은 유저가 별도 선택) */
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
  return RECOM_QUICK_PICKS.find((p) => p.id === id)?.category ?? '아파트';
}

/** 추천 페이지 — 전체 탭 없음, 기본 아파트 */
export function normalizeRecomCategory(raw: string | null | undefined): string {
  const c = (raw ?? '').trim().toLowerCase();
  if (!c || c === 'all' || c === '전체') return '아파트';
  if (c.includes('apartment') || c === '아파트') return '아파트';
  if (c.includes('land') || c === '토지') return '토지';
  if (c.includes('house') || c === '주택') return '주택';
  if (c.includes('store') || c === '상가') return '상가';
  if (c.includes('building') || c === '빌딩') return '빌딩';
  return '아파트';
}

/** 추천 — 필터를 하나 이상 적용했을 때만 API 조회 */
export function recomHasActiveFilters(
  category: string,
  discoverFilters: ApartmentDiscoverFilters,
  investmentFilters: InvestmentDiscoverFilters,
): boolean {
  const aptActive =
    hasStrictDataFilters(discoverFilters)
    || isPriceFilterActive(discoverFilters.priceMinEok, discoverFilters.priceMaxEok)
    || isPyeongFilterActive(discoverFilters)
    || discoverFilters.sortBy !== 'default'
    || hasActiveApartmentCardFilters(discoverFilters);

  const invActive = hasActiveInvestmentDiscoverFilters(investmentFilters);

  if (category === '아파트') return aptActive;
  if (isInvestmentDiscoverCategory(category)) return invActive;
  if (category === 'all') return aptActive || invActive;
  return false;
}
