export interface RailStageGuide {
  summary: string;
  investment: string;
  signal: string;
  tactics?: string[];
  addressLevel?: string;
}

export const RAIL_STAGE_FILTERS = [
  { id: 'all', label: '전체' },
  { id: '기본계획', label: '기본계획' },
  { id: '구축계획', label: '구축계획' },
  { id: '실시계획', label: '실시계획' },
  { id: '연장지연', label: '연장·지연' },
  { id: '민간투자', label: '민간투자' },
  { id: '준공개통', label: '준공·개통' },
] as const;

export const RAIL_PUBLISHER_CLASS: Record<string, string> = {
  국가: 'bg-slate-800 text-white',
  서울: 'bg-sky-600 text-white',
  인천: 'bg-teal-600 text-white',
  경기: 'bg-emerald-600 text-white',
  기타: 'bg-slate-400 text-white',
};

export const RAIL_SIGNAL_CLASS: Record<string, string> = {
  '공격적 투자': 'bg-orange-100 text-orange-700 border-orange-200',
  '선행 투자': 'bg-amber-100 text-amber-700 border-amber-200',
  '일반적 진입': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '리스크 점검': 'bg-rose-100 text-rose-700 border-rose-200',
  주목: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  '출구 전략': 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const RAIL_STAGE_META: Record<string, RailStageGuide & { label: string }> = {
  기본계획: {
    label: '기본계획',
    signal: '공격적 투자',
    summary: '예타 통과·기본계획 고시. 대략 위치만 공개, 정확한 주소 없음.',
    investment: '랜드마크 기준 구역 선점 + 인근 재개발·재건축 빌라 통매수 공격적 전략.',
    tactics: [
      '랜드마크(사거리, 교차로, 기존 역) 기준 공간 선점',
      '재개발 구역 빌라·단독 통매수 — 대단지+역세권 확정 기대',
    ],
    addressLevel: '대략 위치만',
  },
  구축계획: {
    label: '구축계획',
    signal: '선행 투자',
    summary: '서울·경기·인천 지자체 구축계획 발표. BC/AHC로 예타 가능성 명시.',
    investment: '지자체 고시·공고 추적, 인근 정비사업과 묶어 선제 진입.',
    addressLevel: '구간·역명 수준',
  },
  실시계획: {
    label: '실시계획',
    signal: '일반적 진입',
    summary: '착공 가시화, 정확한 주소 공개. 국토부 고시 당일 또는 고시이음 수일 후.',
    investment: '가장 일반적인 진입 타이밍. 역 위치·출구 확정 시 역세권 프리미엄 본격 반영.',
    addressLevel: '정확한 주소·노선',
  },
  연장지연: {
    label: '연장·지연',
    signal: '리스크 점검',
    summary: '연장·지연·변경 고시. 국토부·서울시보·경기도보·인천시보 업데이트.',
    investment: '보유 기간·사업성 재점검. 기대 수익 기간 연장 리스크.',
    addressLevel: '변경 전후 비교',
  },
  민간투자: {
    label: '민간투자·RFP',
    signal: '주목',
    summary: '민간투자대상 지정·시설사업기본계획(RFP) 고시.',
    investment: '노선 확정성↑, 민간 사업자 리스크 함께 검토.',
    addressLevel: '사업 구간 명시',
  },
  준공개통: {
    label: '준공·개통',
    signal: '출구 전략',
    summary: '준공·개통 고시. 역세권 프리미엄 대부분 반영.',
    investment: '출구(매도) 전략. 개통 전후 차익 실현 검토.',
    addressLevel: '확정',
  },
};

const STAGE_KEYWORDS: [string, string][] = [
  ['준공', '준공개통'], ['개통', '준공개통'], ['완공', '준공개통'],
  ['실시계획', '실시계획'], ['실시 계획', '실시계획'], ['착공', '실시계획'],
  ['민간투자', '민간투자'], ['RFP', '민간투자'], ['시설사업기본계획', '민간투자'],
  ['구축계획', '구축계획'], ['BC', '구축계획'], ['AHC', '구축계획'],
  ['기본계획', '기본계획'], ['예타', '기본계획'], ['예비타당성', '기본계획'],
  ['연장', '연장지연'], ['지연', '연장지연'],
];

export function normalizeRailStage(title = '', stage = ''): string {
  for (const [kw, tab] of STAGE_KEYWORDS) {
    if (title.includes(kw)) return tab;
  }
  const legacy: Record<string, string> = {
    기본계획: '기본계획', 실시계획: '실시계획', 준공: '준공개통',
    변경: '연장지연', 민간투자: '민간투자',
  };
  return legacy[stage] || '기본계획';
}

export function detectRailPublisher(institution = '', title = '', region = ''): string {
  const text = `${institution} ${title} ${region}`;
  if (/서울도시철도|서울\s*지하철|서울\s*\d+호\s*선/.test(title) && !/경기|인천/.test(title)) return '서울';
  if (/인천.*철도|인천.*지하철|인천광역시/.test(title)) return '인천';
  if (/경기.*철도|경기.*GTX|경기도/.test(title) && /철도|GTX|지하철/.test(title)) return '경기';
  if (/국토교통부|국토부|대도시권광역교통/.test(text)) return '국가';
  if (/서울특별시|서울시|서울교통공사|서울메트로/.test(text) || (/\b서울\b/.test(text) && /도시철도|지하철/.test(text) && !/경기|인천/.test(text))) return '서울';
  if (/인천광역시|인천시|인천교통공사|\b인천\b/.test(text)) return '인천';
  if (/경기도|경기도청|\b경기\b/.test(text)) return '경기';
  return '기타';
}

const PUBLISHER_LABELS: Record<string, string> = {
  국가: '국가 철도망', 서울: '서울 철도망', 인천: '인천 철도망', 경기: '경기 철도망', 기타: '기타',
};

export function enrichRailItemClient<T extends {
  itemKind?: string;
  title?: string;
  stage?: string;
  institution?: string;
  region?: string;
  lineName?: string | null;
  railStage?: string;
  publisher?: string;
  publisherLabel?: string;
  investmentSignal?: string | null;
  stageGuide?: RailStageGuide | null;
}>(item: T): T {
  if (item.itemKind !== 'rail') return item;
  const railStage = item.railStage || normalizeRailStage(item.title || '', item.stage || '');
  const publisher = item.publisher || detectRailPublisher(item.institution || '', item.title || '', item.region || item.lineName || '');
  const meta = RAIL_STAGE_META[railStage];

  return {
    ...item,
    railStage,
    publisher,
    publisherLabel: item.publisherLabel || PUBLISHER_LABELS[publisher] || publisher,
    investmentSignal: item.investmentSignal || meta?.signal || null,
    stageGuide: item.stageGuide || (meta ? {
      summary: meta.summary,
      investment: meta.investment,
      signal: meta.signal,
      tactics: meta.tactics,
      addressLevel: meta.addressLevel,
    } : null),
  };
}

export function getRailStageMeta(tab: string) {
  return RAIL_STAGE_META[tab] || null;
}
