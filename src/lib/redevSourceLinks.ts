const UNKNOWN_DISTRICT = '미상 구역';

const SEOUL_CLEANUP_SEARCH =
  'https://cleanup.seoul.go.kr/cleanup/bsnssttus/lscrMainIndx.do';
const SEOUL_CLEANUP_HOME = 'https://cleanup.seoul.go.kr/';
const SEOUL_CLEANUP_CAFE_BASE = 'https://cleanup.seoul.go.kr/cafe/mainIndx.do?cafeUrl=';

const GYEONGGI_ONNURI_HOME = 'https://www.gg.go.kr/onnuri/index.do';

export interface RedevPortalLinkInput {
  source?: string | null;
  districtName?: string | null;
  zoneName?: string | null;
  title?: string | null;
  address?: string | null;
  /** 서울 정보몽땅 딥링크 (전체 URL 또는 slug) */
  cleanupCafeUrl?: string | null;
}

export interface RedevPortalLink {
  label: string;
  url: string;
  searchTerm?: string | null;
  /** URL에 검색어/딥링크가 실려 바로 결과·상세가 나오는지 */
  deepSearch: boolean;
  hint?: string | null;
}

function normalizeSource(source?: string | null): '서울' | '경기' | null {
  const s = source?.trim();
  if (!s) return null;
  if (s.includes('서울')) return '서울';
  if (s.includes('경기')) return '경기';
  return null;
}

function resolveSeoulCleanupCafeUrl(raw?: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value.startsWith('http')) return value;
  return `${SEOUL_CLEANUP_CAFE_BASE}${encodeURIComponent(value)}`;
}

/** 정보몽땅·온누리 검색에 쓸 구역명 후보 */
export function pickRedevPortalSearchTerm(input: RedevPortalLinkInput): string | null {
  const candidates = [
    input.zoneName,
    input.districtName,
    input.title,
    input.address?.split(/[,·]/)[0]?.trim(),
  ];

  for (const raw of candidates) {
    const term = raw?.trim();
    if (!term || term === UNKNOWN_DISTRICT || term.length < 2) continue;
    return term;
  }
  return null;
}

export function buildRedevPortalLink(input: RedevPortalLinkInput): RedevPortalLink | null {
  const region = normalizeSource(input.source);
  if (!region) return null;

  const searchTerm = pickRedevPortalSearchTerm(input);

  if (region === '서울') {
    const cafeUrl = resolveSeoulCleanupCafeUrl(input.cleanupCafeUrl);
    if (cafeUrl) {
      return {
        label: '정보몽땅에서 확인하기 →',
        url: cafeUrl,
        searchTerm,
        deepSearch: true,
        hint: searchTerm ? `「${searchTerm}」 조합 정보·공개자료` : '정비사업 정보몽땅 조합 페이지',
      };
    }
    if (searchTerm) {
      return {
        label: '정보몽땅에서 검색 →',
        url: `${SEOUL_CLEANUP_SEARCH}?scupBsnsSttus.asscNm=${encodeURIComponent(searchTerm)}`,
        searchTerm,
        deepSearch: true,
        hint: `「${searchTerm}」로 검색`,
      };
    }
    return {
      label: '정보몽땅 바로가기 →',
      url: SEOUL_CLEANUP_HOME,
      searchTerm: null,
      deepSearch: false,
      hint: null,
    };
  }

  return {
    label: '경기 온누리에서 확인 →',
    url: GYEONGGI_ONNURI_HOME,
    searchTerm,
    deepSearch: false,
    hint: searchTerm
      ? `온누리시스템에서 「${searchTerm}」을 직접 검색해 주세요`
      : '경기도 정비사업 온누리시스템에서 사업명을 검색해 주세요',
  };
}
