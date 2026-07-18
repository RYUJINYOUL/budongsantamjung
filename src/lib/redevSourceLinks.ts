const UNKNOWN_DISTRICT = '미상 구역';

const SEOUL_CLEANUP_SEARCH =
  'https://cleanup.seoul.go.kr/cleanup/bsnssttus/lscrMainIndx.do';
const SEOUL_CLEANUP_HOME = 'https://cleanup.seoul.go.kr/';

/** 경기 소규모주택정비사업 (ingest 원천 TBGRISSMSCLBSNSM) */
const GYEONGGI_GRIS_SMSCL =
  'https://gris.gg.go.kr/ost/oneStopView.do?code=11';

export interface RedevPortalLinkInput {
  source?: string | null;
  districtName?: string | null;
  zoneName?: string | null;
  title?: string | null;
  address?: string | null;
}

export interface RedevPortalLink {
  label: string;
  url: string;
  searchTerm?: string | null;
  /** URL에 검색어가 실려 바로 결과가 나오는지 */
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

/** 정보몽땅·경기부동산포털 검색에 쓸 구역명 후보 */
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

  // 경기: 사업명 검색 쿼리스트링 미지원(POST/AJAX 전용).
  // 현재 ingest 원천이 소규모주택정비 API → 지역개발정보(code=11) 딥링크가 최선.
  return {
    label: '경기 소규모정비 목록 →',
    url: GYEONGGI_GRIS_SMSCL,
    searchTerm,
    deepSearch: false,
    hint: searchTerm
      ? `소규모주택정비 목록에서 「${searchTerm}」을 직접 찾아주세요`
      : '지역개발정보 > 소규모주택정비사업 목록이 열립니다',
  };
}
