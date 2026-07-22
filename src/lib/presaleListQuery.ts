import type { PresaleTab } from './presaleApi';

export type PresaleListQuery = {
  tab: PresaleTab;
  region: string;
  page: number;
  areaFilter: string;
  priceFilter: string;
};

export const PRESALE_LIST_QUERY_DEFAULTS: PresaleListQuery = {
  tab: 'private',
  region: '전국',
  page: 1,
  areaFilter: 'all',
  priceFilter: 'all',
};

export function parsePresaleListQuery(searchParams: URLSearchParams): PresaleListQuery {
  const tabRaw = searchParams.get('tab');
  const tab: PresaleTab =
    tabRaw === 'public' || tabRaw === 'results' || tabRaw === 'private' ? tabRaw : PRESALE_LIST_QUERY_DEFAULTS.tab;

  return {
    tab,
    region: searchParams.get('region') || PRESALE_LIST_QUERY_DEFAULTS.region,
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1),
    areaFilter: searchParams.get('areaFilter') || PRESALE_LIST_QUERY_DEFAULTS.areaFilter,
    priceFilter: searchParams.get('priceFilter') || PRESALE_LIST_QUERY_DEFAULTS.priceFilter,
  };
}

export function buildPresaleListQueryString(q: Partial<PresaleListQuery>): string {
  const merged = { ...PRESALE_LIST_QUERY_DEFAULTS, ...q };
  const params = new URLSearchParams();
  params.set('tab', merged.tab);
  params.set('region', merged.region);
  params.set('page', String(merged.page));
  if (merged.tab === 'results') {
    params.set('areaFilter', merged.areaFilter);
    params.set('priceFilter', merged.priceFilter);
  }
  return params.toString();
}

export function buildPresaleListHref(q: Partial<PresaleListQuery> = {}): string {
  const qs = buildPresaleListQueryString(q);
  return `/presale?${qs}`;
}

/** 상세 → 목록 복귀용: URL에 남아 있는 목록 쿼리 그대로 사용 */
export function buildPresaleListHrefFromSearchParams(searchParams: URLSearchParams): string {
  const listQ = parsePresaleListQuery(searchParams);
  return buildPresaleListHref(listQ);
}
