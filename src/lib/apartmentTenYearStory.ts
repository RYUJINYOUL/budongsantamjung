export interface MarketTimelineEntry {
  id: string;
  periodLabel: string;
  yearFrom: number;
  yearTo: number;
  title: string;
  paragraphs: string[];
  tags: string[];
}

export type MarketRegion = 'seoul' | 'gyeonggi_incheon' | 'local';

/** 서울 타임라인 */
export const MARKET_TIMELINE_SEOUL: MarketTimelineEntry[] = [
  {
    id: '2016-2017',
    periodLabel: '2016~2017',
    yearFrom: 2016,
    yearTo: 2017,
    title: '저금리와 재건축 기대감',
    paragraphs: [
      '기준금리 인하로 예금보다 부동산 투자에 대한 관심이 커진 시기입니다. 서울의 공급 부족 우려와 재건축 기대감이 맞물리면서 전세를 활용한 투자와 매수세가 점차 확대되는 흐름을 보였습니다.',
    ],
    tags: ['저금리 기조', '서울 공급 부족 우려', '재건축 기대감', '갭투자 증가'],
  },
  {
    id: '2018',
    periodLabel: '2018',
    yearFrom: 2018,
    yearTo: 2018,
    title: '서울 중심의 상승세',
    paragraphs: [
      '강남권을 비롯한 서울 주요 지역의 가격 상승세가 이어졌습니다. 학군과 직주근접 수요가 집중되자 정부는 9·13 대책을 발표하며 대출과 다주택자 규제를 강화하는 모습이었습니다.',
    ],
    tags: ['9·13 대책', '강남권 상승', '직주근접', '수요 집중'],
  },
  {
    id: '2019',
    periodLabel: '2019',
    yearFrom: 2019,
    yearTo: 2019,
    title: '규제 강화와 청약 열기',
    paragraphs: [
      '대출과 세제 규제가 확대되었지만 신축 아파트에 대한 선호는 계속되었습니다. 특히 분양가 상한제 시행을 앞두고 청약 경쟁이 더욱 치열해지는 경향을 보였습니다.',
    ],
    tags: ['분양가 상한제', '청약 과열', '신축 선호'],
  },
  {
    id: '2020',
    periodLabel: '2020',
    yearFrom: 2020,
    yearTo: 2020,
    title: '초저금리와 유동성 확대',
    paragraphs: [
      '코로나19 대응 과정에서 글로벌 유동성이 크게 늘어나고 초저금리 기조가 이어졌습니다. 자산시장 전반으로 자금이 유입되며 서울 부동산 시장도 강한 매수세를 나타냈습니다.',
    ],
    tags: ['초저금리', '글로벌 유동성', '적극 매수', '패닉바잉 심리'],
  },
  {
    id: '2021',
    periodLabel: '2021',
    yearFrom: 2021,
    yearTo: 2021,
    title: '가격 고점과 영끌 매수',
    paragraphs: [
      '서울 전역에서 신고가 거래가 이어지는 모습이었습니다. 전세 물량 부족과 불안 심리가 겹치면서 이른바 \'영끌\' 매수가 늘었고, 시장은 상승세의 정점에 가까워졌습니다.',
    ],
    tags: ['영끌 매수', '2030 매수세', '전세 부족', '신고가 기록'],
  },
  {
    id: '2022',
    periodLabel: '2022',
    yearFrom: 2022,
    yearTo: 2022,
    title: '금리 인상과 거래 위축',
    paragraphs: [
      '급격한 기준금리 인상 여파로 대출 부담이 크게 늘어났습니다. 매수 심리가 빠르게 위축되면서 거래량이 감소했고, 일부 지역을 중심으로 가격 조정이 나타나는 모습이었습니다.',
    ],
    tags: ['기준금리 인상', '거래 감소', '매수 심리 위축', '가격 조정'],
  },
  {
    id: '2023',
    periodLabel: '2023',
    yearFrom: 2023,
    yearTo: 2023,
    title: '규제 완화와 일부 회복',
    paragraphs: [
      '정부는 규제지역 해제와 대출 규제 완화 등을 추진하며 시장 연착륙을 도모했습니다. 이에 따라 서울의 선호 지역을 중심으로 거래가 점차 회복되는 모습을 보였습니다.',
    ],
    tags: ['규제지역 해제', '대출 완화', '특례보금자리론', '거래 회복'],
  },
  {
    id: '2024',
    periodLabel: '2024',
    yearFrom: 2024,
    yearTo: 2024,
    title: '입지별 양극화',
    paragraphs: [
      '서울 내에서도 입지와 연식에 따른 차별화가 뚜렷해지는 경향을 보였습니다. 신축과 핵심 입지는 상대적으로 강세를 유지한 반면, 일부 구축 단지는 회복 속도가 더딘 편이었습니다.',
    ],
    tags: ['신축 선호', '구축 약세', '입지 차별화'],
  },
  {
    id: '2025-2026',
    periodLabel: '2025~2026',
    yearFrom: 2025,
    yearTo: 2026,
    title: '공급 여건에 따른 차별화',
    paragraphs: [
      '향후 입주 물량과 지역별 수요에 따라 시장 흐름이 나뉘는 모습입니다. 공급이 제한적인 지역은 상대적으로 가격 방어력이 나타나는 반면, 공급이 많은 지역은 다소 차별화된 흐름을 보이고 있습니다.',
    ],
    tags: ['공급 영향', '입주 물량', '지역별 차별화', '서울 선호 경향'],
  },
];

/** 경기·인천 타임라인 */
export const MARKET_TIMELINE_GYEONGGI_INCHEON: MarketTimelineEntry[] = [
  {
    id: '2016-2017',
    periodLabel: '2016~2017',
    yearFrom: 2016,
    yearTo: 2017,
    title: '수도권 갭투자 유입',
    paragraphs: [
      '서울의 주거비 부담이 커지고 규제가 시작되자 서울 접근성이 좋은 경기도로 관심이 이동했습니다. 상대적으로 소액 접근이 가능한 외곽 지역을 중심으로 갭투자 현상이 나타나는 모습이었습니다.',
    ],
    tags: ['갭투자 유입', '풍선효과', '서울 접근성'],
  },
  {
    id: '2018-2019',
    periodLabel: '2018~2019',
    yearFrom: 2018,
    yearTo: 2019,
    title: '교통 호재와 규제 반사효과',
    paragraphs: [
      '서울 중심의 9·13 대책 이후 규제가 덜한 경기·인천 지역으로 수요가 다소 유입되었습니다. 특히 GTX 등 광역교통망 호재가 있는 지역을 중심으로 청약 시장의 관심이 높아지는 경향을 보였습니다.',
    ],
    tags: ['규제 반사효과', 'GTX 호재', '청약 관심'],
  },
  {
    id: '2020-2021',
    periodLabel: '2020~2021',
    yearFrom: 2020,
    yearTo: 2021,
    title: '비규제지역 수요와 매수 확장',
    paragraphs: [
      '규제가 상대적으로 적었던 경기·인천 비규제지역으로 수요가 이동했습니다. 저금리와 풍부한 유동성이 더해지면서 수도권 전역에서 매수세가 확대되고 가격 상승세가 두드러지는 모습을 보였습니다.',
    ],
    tags: ['유동성 효과', '비규제지역 유입', '수도권 매수세'],
  },
  {
    id: '2022',
    periodLabel: '2022',
    yearFrom: 2022,
    yearTo: 2022,
    title: '고금리와 매물 조정',
    paragraphs: [
      '최근 몇 년간 매수세가 강했던 수도권 지역이 고금리 여파를 상대적으로 크게 받는 경향을 보였습니다. 이자 부담으로 인한 조정 매물이 늘어나며 거래량이 감소하고 가격도 하락세로 돌아서는 모습이었습니다.',
    ],
    tags: ['금리 부담', '조정 매물 증가', '거래 위축'],
  },
  {
    id: '2023',
    periodLabel: '2023',
    yearFrom: 2023,
    yearTo: 2023,
    title: '규제 완화와 핵심지 중심의 반등',
    paragraphs: [
      '정부의 대대적인 규제 완화와 특례보금자리론 출시로 수도권 매수 심리가 일부 회복되었습니다. 서울 접근성이 좋은 경기 남부 핵심지와 신축 단지를 중심으로 급매물이 소진되며 반등세를 보인 반면, 외곽 지역은 미분양과 역전세 우려가 지속되는 양극화 양상을 나타냈습니다.',
    ],
    tags: ['특례보금자리론', '규제 완화 효과', '경기 남부 반등', '입지별 차별화'],
  },
  {
    id: '2024-2026',
    periodLabel: '2024~2026',
    yearFrom: 2024,
    yearTo: 2026,
    title: '핵심지·교통망 중심의 선별 회복',
    paragraphs: [
      '수도권 내에서도 입지에 따라 차별화 양상이 굳어지는 모습입니다. 서울 접근성이 우수한 신축이나 개통 예정인 핵심 교통망(GTX) 인근은 회복 흐름을 보이는 반면, 외곽 구축은 상대적으로 정체되는 경향이 있습니다.',
    ],
    tags: ['입지별 차별화', 'GTX 역세권', '신축 중심 회복'],
  },
];

/** 지방 (광역시·중소도시) 타임라인 */
export const MARKET_TIMELINE_LOCAL: MarketTimelineEntry[] = [
  {
    id: '2016-2017',
    periodLabel: '2016~2017',
    yearFrom: 2016,
    yearTo: 2017,
    title: '지방 공급 누적과 정체',
    paragraphs: [
      '수도권이 온기를 띨 때 상당수 지방 도시들은 대규모 택지 개발과 신규 입주 물량이 겹치는 상황이었습니다. 공급 부담으로 인해 가격이 보합세를 유지하거나 다소 하락세를 보이는 모습이었습니다.',
    ],
    tags: ['입주 물량 부담', '택지 개발', '수도권 격차'],
  },
  {
    id: '2018-2019',
    periodLabel: '2018~2019',
    yearFrom: 2018,
    yearTo: 2019,
    title: '지역 경기와 미분양 부담',
    paragraphs: [
      '일부 지역의 제조업 둔화 등 지방 경기 위축과 미분양 적체가 이어지는 경향을 보였습니다. 수도권 시장과의 차별화가 깊어지면서 대다수 지방 주택 시장은 정체된 흐름을 나타냈습니다.',
    ],
    tags: ['미분양 증가', '지역 경기 영향', '시장 격차 심화'],
  },
  {
    id: '2020-2021',
    periodLabel: '2020~2021',
    yearFrom: 2020,
    yearTo: 2021,
    title: '규제 반사효과와 단기 상승',
    paragraphs: [
      '수도권 규제가 강화되면서 투자 수요가 지방 광역시와 일부 중소도시로 이동했습니다. 이른바 풍선효과가 나타나며 일부 지역은 단기간에 가격 상승세가 두드러지는 모습을 보였습니다.',
    ],
    tags: ['투자 수요 이동', '풍선효과', '단기 가격 상승'],
  },
  {
    id: '2022-2023',
    periodLabel: '2022~2023',
    yearFrom: 2022,
    yearTo: 2023,
    title: '투자 자금 이탈과 전세 리스크',
    paragraphs: [
      '금리 인상 기조 속에 유입되었던 자금이 다소 빠르게 이탈하는 경향을 보였습니다. 다시 미분양이 쌓이고 매매 가격이 조정받으면서 전세가율이 높은 단지들을 중심으로 전세금 반환 리스크가 불거지기도 했습니다.',
    ],
    tags: ['미분양 누적', '자금 이탈', '역전세 우려'],
  },
  {
    id: '2024-2026',
    periodLabel: '2024~2026',
    yearFrom: 2024,
    yearTo: 2026,
    title: '지역별 편차와 수도권 선호 현상',
    paragraphs: [
      '지역별 편차가 커지는 가운데 수도권 선호 현상이 이어지는 모습을 보이고 있습니다. 일부 지방은 미분양과 인구 감소 등의 영향으로 회복 속도가 다소 더딘 모습을 나타내고 있습니다.',
    ],
    tags: ['지역별 편차', '수도권 선호 현상', '미분양 부담', '인구 트렌드'],
  },
];

/** @deprecated MARKET_TIMELINE_SEOUL 사용 */
export const MARKET_TIMELINE = MARKET_TIMELINE_SEOUL;

/** 지역별 핵심 키워드 TOP 10 */
const TOP10_BY_REGION: Record<MarketRegion, string[]> = {
  seoul: [
    '저금리 기조',
    '서울 공급 부족 우려',
    '재건축 기대감',
    '글로벌 유동성 확대',
    '2030 영끌 매수세',
    '부동산 규제 강화',
    '기준금리 인상 여파',
    '매수 심리 위축',
    '규제지역 해제 흐름',
    '입지별 양극화 현상',
  ],
  gyeonggi_incheon: [
    '수도권 갭투자 유입',
    'GTX 광역교통망 호재',
    '규제 반사효과',
    '비규제지역 수요 이동',
    '수도권 청약 관심',
    '고금리 영향 가시화',
    '조정 매물 증가',
    '입지별 차별화 경향',
    '핵심 교통망 중심 반등',
    '경기·인천 내 차별화',
  ],
  local: [
    '신규 입주 물량 부담',
    '수도권 중심 장세 소외',
    '지역 기반 산업 둔화',
    '미분양 물량 적체',
    '투자 수요 지방 이동',
    '비규제지역 풍선효과',
    '역전세 및 대출 부담',
    '투자 자금 이탈 경향',
    '인구 감소 여파',
    '지방 시장 정체 현상',
  ],
};

export const MARKET_TOP10_EVENTS = TOP10_BY_REGION.seoul;

export function resolveMarketRegion(address?: string | null, sido?: string | null): MarketRegion {
  const text = `${sido || ''} ${address || ''}`.trim();
  if (!text) return 'seoul';
  if (/서울/.test(text)) return 'seoul';
  if (/경기|인천/.test(text)) return 'gyeonggi_incheon';
  return 'local';
}

export function getMarketRegionLabel(region: MarketRegion): string {
  switch (region) {
    case 'seoul':
      return '서울';
    case 'gyeonggi_incheon':
      return '경기·인천';
    case 'local':
      return '지방';
  }
}

export function getMarketTimeline(region: MarketRegion): MarketTimelineEntry[] {
  switch (region) {
    case 'gyeonggi_incheon':
      return MARKET_TIMELINE_GYEONGGI_INCHEON;
    case 'local':
      return MARKET_TIMELINE_LOCAL;
    default:
      return MARKET_TIMELINE_SEOUL;
  }
}

export function getMarketTop10Events(region: MarketRegion): string[] {
  return TOP10_BY_REGION[region];
}

export interface ChartQuarterPoint {
  year: number;
  quarter: number;
  sale: number | null;
}

/** 차트에 포함된 연도 범위와 겹치는 타임라인만 반환 */
export function filterTimelineByYears(
  entries: MarketTimelineEntry[],
  years: number[],
): MarketTimelineEntry[] {
  if (!years.length) return entries;
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  return entries.filter((e) => e.yearFrom <= maxY && e.yearTo >= minY);
}

export interface YearlySaleStat {
  changePct: number | null;
  avgMan: number;
  prevAvgMan: number | null;
}

/** 연도별 매매 평균(분기 평균) + 전년 대비 등락률 */
export function buildYearlySaleStats(chartData: ChartQuarterPoint[]): Map<number, YearlySaleStat> {
  const byYear = new Map<number, number[]>();
  for (const row of chartData) {
    if (row.sale == null || row.sale <= 0) continue;
    const list = byYear.get(row.year) ?? [];
    list.push(row.sale);
    byYear.set(row.year, list);
  }
  const avgByYear = new Map<number, number>();
  for (const [y, vals] of byYear) {
    avgByYear.set(y, vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const sortedYears = [...avgByYear.keys()].sort((a, b) => a - b);
  const stats = new Map<number, YearlySaleStat>();
  for (let i = 0; i < sortedYears.length; i++) {
    const y = sortedYears[i]!;
    const avgMan = avgByYear.get(y)!;
    if (i === 0) {
      stats.set(y, { changePct: null, avgMan, prevAvgMan: null });
      continue;
    }
    const prevAvgMan = avgByYear.get(sortedYears[i - 1]!)!;
    const changePct = ((avgMan - prevAvgMan) / prevAvgMan) * 100;
    stats.set(y, { changePct, avgMan, prevAvgMan });
  }
  return stats;
}

/** @deprecated buildYearlySaleStats 사용 */
export function buildYearlySaleChange(chartData: ChartQuarterPoint[]): Map<number, number | null> {
  const stats = buildYearlySaleStats(chartData);
  const change = new Map<number, number | null>();
  for (const [y, s] of stats) change.set(y, s.changePct);
  return change;
}

function formatPriceEok(manWon: number): string {
  if (!manWon || manWon <= 0) return '-';
  if (manWon >= 10000) {
    const eok = manWon / 10000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  return `${Math.round(manWon).toLocaleString()}만`;
}

/** 주소에서 구·동 추출 — "강남구 압구정동" */
export function extractAptRegionLabel(address: string | null | undefined): string {
  if (!address) return '';
  const parts = address.trim().split(/\s+/);
  const gu = parts.find((p) => /[구군]$/.test(p));
  const dong = parts.find((p) => /[동읍면리가]$/.test(p));
  if (gu && dong) return `${gu} ${dong}`;
  if (gu) return gu;
  if (dong) return dong;
  return parts.slice(0, 2).join(' ');
}

/** 아파트명 정규화 — 정보없음·빈값이면 빈 문자열 */
export function sanitizeAptName(aptName?: string | null): string {
  const name = (aptName || '').trim();
  if (!name || name === '정보없음' || name === '-') return '';
  return name;
}

const PREFERRED_QUARTERLY_AREAS = [84, 74] as const;

export function areasMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function matchQuarterlyAreaCandidate(areaSqm: number, areas: number[]): number | null {
  if (!Number.isFinite(areaSqm) || areaSqm <= 0) return null;
  const exact = areas.find((a) => areasMatch(a, areaSqm));
  if (exact != null) return exact;
  let best: number | null = null;
  let bestDiff = Infinity;
  for (const candidate of areas) {
    const diff = Math.abs(candidate - areaSqm);
    if (diff < 1 && diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }
  return best;
}

function initAreaCountMap(areas: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const area of areas) counts.set(area, 0);
  return counts;
}

function countSaleTradesByQuarterlyArea(
  targetTrades: Array<Record<string, unknown>>,
  areas: number[],
): Map<number, number> {
  const counts = initAreaCountMap(areas);
  for (const trade of targetTrades) {
    if (trade._isRent === true) continue;
    const areaVal = parseFloat(String(trade.excluUseAr ?? trade.area ?? '0'));
    if (areaVal <= 0) continue;
    const dealAmt = parseFloat(String(trade.dealAmount ?? '0').replace(/,/g, ''));
    if (dealAmt <= 0) continue;
    const matched = matchQuarterlyAreaCandidate(areaVal, areas);
    if (matched == null) continue;
    counts.set(matched, (counts.get(matched) ?? 0) + 1);
  }
  return counts;
}

function countSaleRowsByQuarterlyArea(
  quarterlyStats: Array<Record<string, unknown>>,
  areas: number[],
): Map<number, number> {
  const counts = initAreaCountMap(areas);
  for (const row of quarterlyStats) {
    if (row.dealType !== 'sale') continue;
    const area = Number(row.exclusiveArea);
    const matched = matchQuarterlyAreaCandidate(area, areas);
    if (matched == null) continue;
    const rawCount = Number(row.count ?? row.dealCount ?? row.tradeCount ?? 1);
    const increment = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1;
    counts.set(matched, (counts.get(matched) ?? 0) + increment);
  }
  return counts;
}

function areaPreferenceRank(area: number): number {
  if (areasMatch(area, 84)) return 0;
  if (areasMatch(area, 74)) return 1;
  return 2;
}

function shouldPreferQuarterlyArea(candidate: number, current: number): boolean {
  const candidateRank = areaPreferenceRank(candidate);
  const currentRank = areaPreferenceRank(current);
  if (candidateRank !== currentRank) return candidateRank < currentRank;
  return candidate > current;
}

function pickMostTradedQuarterlyArea(counts: Map<number, number>, areas: number[]): number | null {
  const sortedAreas = [...areas].sort((a, b) => a - b);
  let bestArea: number | null = null;
  let bestCount = 0;

  for (const area of sortedAreas) {
    const count = counts.get(area) ?? 0;
    if (count <= 0) continue;
    if (bestArea == null || count > bestCount) {
      bestCount = count;
      bestArea = area;
      continue;
    }
    if (count === bestCount && shouldPreferQuarterlyArea(area, bestArea)) {
      bestArea = area;
    }
  }

  return bestCount > 0 ? bestArea : null;
}

function resolvePreferredQuarterlyAreaFallback(areas: number[]): number {
  const sorted = [...areas].sort((a, b) => a - b);
  for (const preferred of PREFERRED_QUARTERLY_AREAS) {
    const hit = sorted.find((a) => areasMatch(a, preferred));
    if (hit != null) return hit;
  }
  return sorted[0]!;
}

export interface ResolveDefaultQuarterlyAreaOptions {
  quarterlyStats?: Array<Record<string, unknown>>;
  targetTrades?: Array<Record<string, unknown>>;
}

/** quarterlyStats 기본 전용면적: 매매 거래 최다 평형 → 84㎡ → 74㎡ → 최소 면적 */
export function resolveDefaultQuarterlyArea(
  areas: number[],
  options?: ResolveDefaultQuarterlyAreaOptions,
): number {
  const sorted = [...areas].sort((a, b) => a - b);
  if (!sorted.length) return 0;

  const targetTrades = options?.targetTrades ?? [];
  const quarterlyStats = options?.quarterlyStats ?? [];

  if (targetTrades.length) {
    const fromTrades = pickMostTradedQuarterlyArea(
      countSaleTradesByQuarterlyArea(targetTrades, sorted),
      sorted,
    );
    if (fromTrades != null) return fromTrades;
  }

  if (quarterlyStats.length) {
    const fromStats = pickMostTradedQuarterlyArea(
      countSaleRowsByQuarterlyArea(quarterlyStats, sorted),
      sorted,
    );
    if (fromStats != null) return fromStats;
  }

  return resolvePreferredQuarterlyAreaFallback(sorted);
}

/** 타임라인·쇼츠 문구용 — 정보없음이면 빈값, 미입력이면 '해당 단지' */
export function resolveAptNameForComment(aptName?: string | null): string {
  const trimmed = (aptName || '').trim();
  if (trimmed === '정보없음' || trimmed === '-') return '';
  return trimmed || '해당 단지';
}

export function formatComplexChangeComment(
  year: number,
  stat: YearlySaleStat | null | undefined,
  aptName = '이 단지',
): string | null {
  if (!stat || stat.changePct == null || Number.isNaN(stat.changePct) || stat.prevAvgMan == null) {
    return null;
  }
  const name = resolveAptNameForComment(aptName);
  const abs = Math.abs(stat.changePct).toFixed(1);
  const prev = formatPriceEok(stat.prevAvgMan);
  const curr = formatPriceEok(stat.avgMan);
  const pct = stat.changePct;

  if (pct > 3) {
    return `${year}년 ${name} 매매 평균은 전년 ${prev} 대비 +${abs}% 상승하여 ${curr}을 기록했습니다.`;
  }
  if (pct < -3) {
    return `${year}년 ${name} 매매 평균은 전년 ${prev} 대비 -${abs}% 하락하여 ${curr}을 기록했습니다.`;
  }
  return `${year}년 ${name} 매매 평균은 전년 ${prev} 대비 보합(±${abs}%)에 가까운 ${curr}을 기록했습니다.`;
}

/** 매매 실거래 없음 안내 */
export function formatComplexNoSaleComment(noteYear: number, aptName?: string | null): string {
  const name = resolveAptNameForComment(aptName);
  if (!name) return '';
  return `${noteYear}년 ${name} 매매 거래가 없습니다.`;
}

/** 타임라인 구간 내 매매 데이터가 있는 연도 (오름차순) */
export function getYearsWithDataInPeriod(
  yearFrom: number,
  yearTo: number,
  yearlyStats: Map<number, YearlySaleStat>,
): number[] {
  return [...yearlyStats.keys()]
    .filter((y) => y >= yearFrom && y <= yearTo)
    .sort((a, b) => a - b);
}

/**
 * 타임라인 카드용 가격 문구 (기간 단위)
 * - 단일 연도: 해당 연도 전년 대비
 * - 복수 연도 구간: 구간 내 첫 해 → 마지막 해 비교 (들쑥날쭉 완화)
 */
export function formatTimelinePeriodPriceComment(
  periodLabel: string,
  yearFrom: number,
  yearTo: number,
  yearlyStats: Map<number, YearlySaleStat>,
  aptName?: string | null,
): string {
  const name = resolveAptNameForComment(aptName);
  if (!name) return '';

  const yearsInPeriod = getYearsWithDataInPeriod(yearFrom, yearTo, yearlyStats);
  if (yearsInPeriod.length === 0) {
    const fallbackYear = yearFrom === yearTo ? yearFrom : yearTo;
    return formatComplexNoSaleComment(fallbackYear, aptName);
  }

  const startYear = yearsInPeriod[0]!;
  const endYear = yearsInPeriod[yearsInPeriod.length - 1]!;

  if (yearFrom === yearTo || startYear === endYear) {
    const stat = yearlyStats.get(startYear)!;
    const yoYComment = formatComplexChangeComment(startYear, stat, name);
    if (yoYComment) return yoYComment;
    const curr = formatPriceEok(stat.avgMan);
    if (yearFrom === yearTo) {
      return `${startYear}년 ${name} 매매 평균가는 ${curr}을 기록했습니다.`;
    }
    return `${periodLabel} ${name} 매매 평균가는 ${curr}을 기록했습니다.`;
  }

  const startStat = yearlyStats.get(startYear)!;
  const endStat = yearlyStats.get(endYear)!;
  const startPrice = formatPriceEok(startStat.avgMan);
  const endPrice = formatPriceEok(endStat.avgMan);
  const changePct = ((endStat.avgMan - startStat.avgMan) / startStat.avgMan) * 100;
  const abs = Math.abs(changePct).toFixed(1);

  if (changePct > 3) {
    return `${periodLabel} ${name} 매매 평균은 ${startYear}년 ${startPrice}에서 ${endYear}년 ${endPrice}로 기간 내 +${abs}% 상승했습니다.`;
  }
  if (changePct < -3) {
    return `${periodLabel} ${name} 매매 평균은 ${startYear}년 ${startPrice}에서 ${endYear}년 ${endPrice}로 기간 내 -${abs}% 하락했습니다.`;
  }
  return `${periodLabel} ${name} 매매 평균은 ${startYear}년 ${startPrice}에서 ${endYear}년 ${endPrice}로 기간 내 보합(±${abs}%)에 가까웠습니다.`;
}

/** 쇼츠·카페용 기간 가격 강조 */
export function formatTimelinePeriodPriceHighlight(
  periodLabel: string,
  yearFrom: number,
  yearTo: number,
  yearlyStats: Map<number, YearlySaleStat>,
  aptName?: string | null,
): string {
  const name = resolveAptNameForComment(aptName);
  if (!name) return '';

  const yearsInPeriod = getYearsWithDataInPeriod(yearFrom, yearTo, yearlyStats);
  if (yearsInPeriod.length === 0) {
    const fallbackYear = yearFrom === yearTo ? yearFrom : yearTo;
    return formatComplexNoSaleComment(fallbackYear, aptName);
  }

  const startYear = yearsInPeriod[0]!;
  const endYear = yearsInPeriod[yearsInPeriod.length - 1]!;

  if (yearFrom === yearTo || startYear === endYear) {
    const stat = yearlyStats.get(startYear)!;
    const highlight = formatComplexPriceHighlight(stat);
    if (highlight) return highlight;
    return `${periodLabel} 평균 ${formatPriceEok(stat.avgMan)}`;
  }

  const startStat = yearlyStats.get(startYear)!;
  const endStat = yearlyStats.get(endYear)!;
  const changePct = ((endStat.avgMan - startStat.avgMan) / startStat.avgMan) * 100;
  const abs = Math.abs(changePct).toFixed(1);
  const startPrice = formatPriceEok(startStat.avgMan);
  const endPrice = formatPriceEok(endStat.avgMan);

  if (changePct > 3) return `${startYear} ${startPrice} → ${endYear} ${endPrice} (+${abs}%)`;
  if (changePct < -3) return `${startYear} ${startPrice} → ${endYear} ${endPrice} (-${abs}%)`;
  return `${startYear} ${startPrice} → ${endPrice} (±${abs}%)`;
}

/** 타임라인 카드용 — 전년 대비 가능 시 기존 문구, 없으면 기간 평균가, 데이터 없으면 미발생 안내 */
export function formatComplexPeriodComment(
  periodLabel: string,
  noteYear: number,
  stat: YearlySaleStat | null | undefined,
  aptName = '이 단지',
): string {
  const name = resolveAptNameForComment(aptName);
  if (!name) return '';

  if (!stat || !stat.avgMan || stat.avgMan <= 0) {
    return formatComplexNoSaleComment(noteYear, aptName);
  }

  const yoYComment = formatComplexChangeComment(noteYear, stat, name);
  if (yoYComment) return yoYComment;

  const curr = formatPriceEok(stat.avgMan);
  return `${periodLabel} ${name} 매매 평균가는 ${curr}을 기록했습니다.`;
}

/** 쇼츠·카페용 단지 시세 강조 (기간 단위) */
export function formatComplexPeriodPriceHighlight(
  periodLabel: string,
  noteYear: number,
  stat: YearlySaleStat | null | undefined,
  aptName = '이 단지',
): string {
  const name = resolveAptNameForComment(aptName);
  if (!name) return '';

  if (!stat || !stat.avgMan || stat.avgMan <= 0) {
    return formatComplexNoSaleComment(noteYear, aptName);
  }

  const yoYHighlight = formatComplexPriceHighlight(stat);
  if (yoYHighlight) return yoYHighlight;

  const curr = formatPriceEok(stat.avgMan);
  return `${periodLabel} 평균 ${curr}`;
}

/** 쇼츠용 단지 시세 강조 — "전년 2.9억 4.1% 하락 2.8억" */
export function formatComplexPriceHighlight(
  stat: YearlySaleStat | null | undefined,
): string | null {
  if (!stat || stat.changePct == null || Number.isNaN(stat.changePct) || stat.prevAvgMan == null) {
    return null;
  }
  const abs = Math.abs(stat.changePct).toFixed(1);
  const prev = formatPriceEok(stat.prevAvgMan);
  const curr = formatPriceEok(stat.avgMan);
  const pct = stat.changePct;

  if (pct > 3) return `전년 ${prev} ${abs}% 상승 ${curr}`;
  if (pct < -3) return `전년 ${prev} ${abs}% 하락 ${curr}`;
  return `전년 ${prev} ±${abs}% 보합 ${curr}`;
}

/** AI 리포트 tenYearMarketTimeline 원본 형식 */
export interface AiTenYearTimelineEntry {
  periodLabel?: string;
  yearFrom?: number;
  yearTo?: number;
  title?: string;
  description?: string;
  categories?: string[];
}

function toYearNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** AI JSON → MarketTimelineEntry (유효하지 않으면 null) */
export function normalizeAiTenYearTimeline(raw: unknown): MarketTimelineEntry[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const entries: MarketTimelineEntry[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as AiTenYearTimelineEntry;
    const title = String(item?.title || '').trim();
    const description = String(item?.description || '').trim();
    if (!title || !description) continue;

    const yearFrom = toYearNum(item.yearFrom) ?? toYearNum(item.yearTo) ?? 2016;
    const yearTo = toYearNum(item.yearTo) ?? toYearNum(item.yearFrom) ?? yearFrom;
    const periodLabel = String(item.periodLabel || '').trim() || `${yearFrom}${yearTo !== yearFrom ? `~${yearTo}` : ''}`;
    const categories = Array.isArray(item.categories)
      ? item.categories.map((c) => String(c).trim()).filter(Boolean)
      : [];

    entries.push({
      id: `ai-${yearFrom}-${yearTo}-${i}`,
      periodLabel,
      yearFrom,
      yearTo,
      title,
      paragraphs: [description],
      tags: categories,
    });
  }

  return entries.length > 0 ? entries : null;
}

export function normalizeAiTenYearKeywords(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const keywords = raw.map((k) => String(k).trim()).filter(Boolean);
  return keywords.length > 0 ? keywords : null;
}
