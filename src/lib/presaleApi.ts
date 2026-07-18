export type PresaleTab = 'private' | 'public' | 'results';

export interface PresaleStatus {
  phase: string;
  label: string;
  dDay: number | null;
  statusText: string;
}

export interface PresaleListSection {
  key: string;
  title: string;
  order: number;
}

export interface PresaleResultSummary {
  statusLabel: string | null;
  rateLabel: string | null;
  undersubscribed?: boolean;
  competitionRate?: string | null;
}

export interface PresaleListItem {
  id: string;
  itemKind?: 'applyhome' | 'redev';
  redevProjectId?: number;
  houseManageNo: string | null;
  pblancNo: string | null;
  houseName: string;
  address: string;
  region: string | null;
  supplyType: 'private' | 'public';
  projectType?: string | null;
  announceDate: string | null;
  moveInDate: string | null;
  totalHouseholds: number | null;
  constructor: string | null;
  developer: string | null;
  status: PresaleStatus;
  listSection?: PresaleListSection;
  homepageUrl: string | null;
  noticeUrl: string | null;
  salePriceLabel?: string | null;
  discoverFilter?: string | null;
  /** 분양결과 카드용 */
  representativeType?: string | null;
  exclusiveArea?: number | null;
  priceLabel?: string | null;
  priceLabelFull?: string | null;
  announceLabel?: string | null;
  resultSummary?: PresaleResultSummary | null;
  /** 분양결과 필터용 — 평형별 메타 */
  modelsMeta?: Array<{
    type: string | null;
    typeLabel?: string | null;
    supplyArea: number;
    price: number | null;
    supplyHouseholds: number;
  }>;
  supplyAreas?: number[];
  modelPrices?: number[];
  rateByType?: Record<string, string>;
}

export interface PresaleListSectionGroup {
  key: string;
  title: string;
  order: number;
  items: PresaleListItem[];
}

export interface PresaleModel {
  type: string | null;
  typeLabel?: string | null;
  competitionRate?: string | null;
  supplyArea: number | null;
  exclusiveArea: number | null;
  supplyPyeong: number | null;
  exclusivePyeong: number | null;
  supplyHouseholds: number;
  price: number | null;
  priceLabel: string | null;
  pricePerPyeong: number | null;
}

export interface PresaleScheduleItem {
  key: string;
  label: string;
  date: string;
}

export interface PresaleCompetitionItem {
  houseType: string | null;
  houseTypeRaw?: string | null;
  modelNo?: string | null;
  supplyHouseholds: number | null;
  applicants: number | null;
  competitionRate: string | null;
  competitionRateNumeric?: number | null;
  undersubscribed?: boolean;
  rankCode?: number | null;
  rankLabel?: string | null;
  resideSeNm?: string | null;
  winningScore: string | null;
  topScore?: string | null;
  avgScore?: string | null;
  localClosed: boolean;
  supplyTypeName: string | null;
}

export interface PresaleDetail extends PresaleListItem {
  phone: string | null;
  lawdCd?: string | null;
  rankingSigunguName?: string | null;
  schedule: PresaleScheduleItem[];
  models: PresaleModel[];
  avgPrice: number | null;
  avgPriceLabel: string | null;
  competition: {
    items: PresaleCompetitionItem[];
    avgRate: string | null;
  } | null;
}

export interface PresaleTradeRow {
  tradeKind: string;
  aptName: string | null;
  dealAmount: number | null;
  exclusiveArea: number | null;
  floor: string | null;
  dealYear: string | number;
  dealMonth: string | number;
  dealDay: string | number;
  umdNm: string | null;
  deposit?: string | null;
  monthlyRent?: string | null;
}

export function encodePresaleId(houseManageNo: string, pblancNo: string) {
  return `${encodeURIComponent(houseManageNo)}__${encodeURIComponent(pblancNo)}`;
}

export function getPresaleItemHref(item: PresaleListItem) {
  if (item.itemKind === 'redev') {
    const filter = item.discoverFilter || item.projectType || '재개발';
    const q = encodeURIComponent(item.houseName);
    return `/discover?filter=${encodeURIComponent(filter)}&stage=5&q=${q}`;
  }
  if (!item.houseManageNo || !item.pblancNo) return '/presale';
  return `/presale/${encodePresaleId(item.houseManageNo, item.pblancNo)}`;
}

export function buildRankingHref(detail: { address?: string | null; lawdCd?: string | null; rankingSigunguName?: string | null }) {
  const sigunguName = detail.rankingSigunguName || extractSigunguFromAddress(detail.address || '');
  const params = new URLSearchParams({ rankingType: 'apartment', sub: 'ranking' });
  if (detail.lawdCd) params.set('sigunguCd', detail.lawdCd);
  if (sigunguName) params.set('sigunguName', sigunguName);
  return `/ranking?${params.toString()}`;
}

export function extractSigunguFromAddress(address: string) {
  const m = address.match(
    /(?:[가-힣]+(?:특별시|광역시|특별자치시|도)\s+)?([가-힣]+(?:시\s+[가-힣]+구|[가-힣]+(?:시|군|구)))/,
  );
  return m ? m[1].trim() : null;
}

export function decodePresaleId(id: string) {
  const [hm, pn] = id.split('__');
  return {
    houseManageNo: decodeURIComponent(hm || ''),
    pblancNo: decodeURIComponent(pn || ''),
  };
}

export async function fetchPresaleList(params: {
  tab: PresaleTab;
  region: string;
  page?: number;
  limit?: number;
  areaFilter?: string;
  priceFilter?: string;
}) {
  const qs = new URLSearchParams({
    tab: params.tab,
    region: params.region,
    page: String(params.page || 1),
    limit: String(params.limit || 30),
  });
  if (params.areaFilter) qs.set('areaFilter', params.areaFilter);
  if (params.priceFilter) qs.set('priceFilter', params.priceFilter);
  const res = await fetch(`/api/applyhome/list?${qs}`);
  if (!res.ok) throw new Error('분양 목록을 불러오지 못했습니다.');
  return res.json();
}

export async function fetchPresaleDetail(
  houseManageNo: string,
  pblancNo: string,
  options?: { includeCompetition?: boolean },
) {
  const qs =
    options?.includeCompetition === false ? '?competition=0' : '';
  const res = await fetch(
    `/api/applyhome/detail/${encodeURIComponent(houseManageNo)}/${encodeURIComponent(pblancNo)}${qs}`,
  );
  if (!res.ok) throw new Error('분양 상세를 불러오지 못했습니다.');
  return res.json();
}

export async function fetchPresaleTrades(aptName: string, address: string, months = 12) {
  const qs = new URLSearchParams({ aptName, address, months: String(months) });
  const res = await fetch(`/api/applyhome/trades?${qs}`);
  if (!res.ok) return null;
  return res.json();
}

/** 시도명 단축 표시 */
export function shortRegionName(name: string) {
  return name
    .replace('특별자치시', '')
    .replace('특별자치도', '')
    .replace('특별시', '')
    .replace('광역시', '');
}
