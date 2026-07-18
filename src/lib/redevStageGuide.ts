export interface RedevStageCheck {
  id: string;
  label: string;
  desc: string;
  status: 'ok' | 'warn' | 'danger' | 'pending' | 'unknown';
  detail: string;
  newsLinks?: Array<{ title?: string; link?: string; pubDate?: string }>;
}

export interface RedevStageTimelineItem {
  order: number;
  label: string;
  title: string;
  signal: string;
  isCurrent: boolean;
}

export interface RedevStageGuide {
  summary: string;
  investment: string;
  signal: string;
}

export interface RedevStageMeta {
  order: number;
  label: string;
  title: string;
  signal: string;
  summary: string;
  investment: string;
}

export const STAGE_META: Record<number, RedevStageMeta> = {
  1: {
    order: 1,
    label: '1단계',
    title: '구역지정 및 안전진단',
    signal: '진입 금지',
    summary: '정비구역으로 처음 지정된 단계입니다. (공식 1~3단계: 기본계획·안전진단·구역지정) 동의율 미달로 무산될 확률이 높고(약 80%), 자금이 10년 넘게 묶일 수 있습니다.',
    investment: '투자 비추천 — 불확실성과 장기 자금 묶임 리스크가 큽니다.',
  },
  2: {
    order: 2,
    label: '2단계',
    title: '조합설립인가',
    signal: '공격적 투자',
    summary: '주민들이 공식 조합을 설립한 단계입니다. (공식 4~5단계: 추진위 승인·조합설립인가) 프리미엄이 낮아 가장 큰 수익을 노릴 수 있지만, 하이 리스크·하이 리턴 구간입니다.',
    investment: '공격적 투자 가능 — 소송·상가정산·세대비율 체크리스트를 확인하세요.',
  },
  3: {
    order: 3,
    label: '3단계',
    title: '사업시행인가',
    signal: '애매한 단계',
    summary: '건축 도면과 아파트 층수가 확정됩니다. (공식 6단계: 사업시행인가) 감정평가액이 나오기 전이라 정보 비대칭이 큰 깜깜이 투자 구간입니다.',
    investment: '신중 접근 — 감정가·분담금 확정 전까지는 변수가 많습니다.',
  },
  4: {
    order: 4,
    label: '4단계',
    title: '관리처분인가',
    signal: '정석 추천',
    summary: '내 집 감정평가액과 추가분담금이 확정됩니다. (공식 7단계: 관리처분인가) 리스크가 가장 낮고, 몇 년 뒤 새 아파트로 이주하는 정석 투자 구간입니다.',
    investment: '가장 추천 — 분담금·감정가가 확정되어 리스크가 거의 없습니다.',
  },
  5: {
    order: 5,
    label: '5단계',
    title: '이주·철거·착공·준공',
    signal: '안전한 진입',
    summary: '주민 이주, 철거, 착공, 분양, 준공이 진행됩니다. (공식 8~10단계: 철거·착공·준공) 초기 투자금이 크지만 상대적으로 안전하며, 기대 수익(상방)은 제한적입니다.',
    investment: '안전 진입 — 수익 상한은 낮지만 불확실성도 낮습니다. 준공 임박 시 투자 매력은 낮습니다.',
  },
};

/** 공식 행정 10단계 (정비사업 추진 절차) */
export const OFFICIAL_ADMIN_STEPS = [
  { no: 1, name: '기본계획 수립', investStage: 1 },
  { no: 2, name: '안전진단', investStage: 1 },
  { no: 3, name: '정비구역 지정', investStage: 1 },
  { no: 4, name: '추진위원회 승인', investStage: 2 },
  { no: 5, name: '조합설립 인가', investStage: 2 },
  { no: 6, name: '사업시행 인가', investStage: 3 },
  { no: 7, name: '관리처분 인가', investStage: 4 },
  { no: 8, name: '철거 신고', investStage: 5 },
  { no: 9, name: '착공 및 분양', investStage: 5 },
  { no: 10, name: '준공 및 청산', investStage: 5 },
] as const;

const STAGE_NAME_TO_ORDER: [string, number][] = [
  ['기본계획', 1], ['안전진단', 1], ['정비구역', 1], ['구역지정', 1], ['추진위', 2],
  ['조합설립', 2], ['건축심의', 3], ['사업시행', 3],
  ['관리처분', 4],
  ['이주', 5], ['철거', 5], ['착공', 5], ['분양', 5], ['준공', 5], ['청산', 5],
];

export function stageOrderFromName(stageName = ''): number {
  const name = String(stageName).trim();
  if (!name) return 0;
  for (const [key, order] of STAGE_NAME_TO_ORDER) {
    if (name.includes(key)) return order;
  }
  return 0;
}

export function matchOfficialStepNo(currentStage = ''): number | null {
  const name = String(currentStage).trim();
  if (!name) return null;
  for (const step of OFFICIAL_ADMIN_STEPS) {
    if (name.includes(step.name.replace(/\s/g, '')) || step.name.includes(name)) return step.no;
    const compact = step.name.replace(/\s/g, '');
    if (name.replace(/\s/g, '').includes(compact) || compact.includes(name.replace(/\s/g, ''))) return step.no;
  }
  for (const [key, order] of STAGE_NAME_TO_ORDER) {
    if (name.includes(key)) {
      const found = OFFICIAL_ADMIN_STEPS.find((s) => s.investStage === order);
      return found?.no ?? null;
    }
  }
  return null;
}

export const REDEV_STAGE_FILTERS = [
  { id: 'all', label: '전체 단계' },
  { id: '1', label: '1단계' },
  { id: '2', label: '2단계' },
  { id: '3', label: '3단계' },
  { id: '4', label: '4단계' },
  { id: '5', label: '5단계' },
] as const;

export const STAGE_SIGNAL_CLASS: Record<string, string> = {
  '진입 금지': 'bg-rose-100 text-rose-700 border-rose-200',
  '공격적 투자': 'bg-orange-100 text-orange-700 border-orange-200',
  '애매한 단계': 'bg-slate-100 text-slate-600 border-slate-200',
  '정석 추천': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '안전한 진입': 'bg-blue-100 text-blue-700 border-blue-200',
};

export function getStageMeta(order: number): RedevStageMeta | null {
  return STAGE_META[order] || null;
}

export function buildStageTimeline(currentOrder: number): RedevStageTimelineItem[] {
  return Object.values(STAGE_META).map((s) => ({
    order: s.order,
    label: s.label,
    title: s.title,
    signal: s.signal,
    isCurrent: s.order === currentOrder,
  }));
}

export function buildStageChecks(stageOrder: number, unitRatioPct?: number | null): RedevStageCheck[] {
  if (stageOrder !== 2) return [];
  return [
    {
      id: 'lawsuit',
      label: '비대위·조합 소송 여부',
      desc: '「조합설립인가 취소 소송」「조합장 직무정지 가처분」 등이 보도된 구역은 위험 신호입니다.',
      status: 'unknown',
      detail: '뉴스·대법원 나의 사건검색을 직접 확인하세요. (Phase 2 크롤링 예정)',
    },
    {
      id: 'shopSettlement',
      label: '상가 독립 정산제',
      desc: '상가와 아파트 조합이 매끄럽게 합의했는지 확인합니다.',
      status: 'pending',
      detail: '데이터 수집 예정 (Phase 2)',
    },
    {
      id: 'unitRatio',
      label: '세대수 대비 조합원 비율',
      desc: '예정 세대수 ÷ 조합원 수가 130% 이상이면 일반분양 물량이 많아 공사비 폭등을 방어하기 쉽습니다.',
      status: unitRatioPct == null ? 'unknown' : unitRatioPct >= 130 ? 'ok' : 'warn',
      detail:
        unitRatioPct == null
          ? '세대수·조합원 수 데이터가 없어 계산할 수 없습니다.'
          : unitRatioPct >= 130
            ? `세대/조합원 ${unitRatioPct}% — 일반분양 물량이 충분합니다.`
            : `세대/조합원 ${unitRatioPct}% — 130% 미만입니다.`,
    },
  ];
}

/** API 미배포 시에도 카드에 단계 정보 표시 */
export function enrichInvestmentItemClient<T extends {
  itemKind?: string;
  stageOrder?: number;
  stageLabel?: string | null;
  stageTitle?: string | null;
  stageSignal?: string | null;
  stageGuide?: RedevStageGuide | null;
  stageTimeline?: RedevStageTimelineItem[];
  stageChecks?: RedevStageCheck[];
  unitRatioPct?: number | null;
  plannedUnits?: number | null;
  memberCount?: number | null;
  currentStage?: string;
}>(item: T): T {
  if (item.itemKind !== 'redev') return item;
  const stageOrder =
    Number(item.stageOrder || 0) ||
    stageOrderFromName(item.currentStage || '') ||
    1;
  const meta = getStageMeta(stageOrder);
  const unitRatioPct =
    item.unitRatioPct ??
    (item.plannedUnits && item.memberCount
      ? Math.round((item.plannedUnits / item.memberCount) * 100)
      : null);

  return {
    ...item,
    stageOrder,
    stageLabel: item.stageLabel || meta?.label || `${stageOrder}단계`,
    stageTitle: item.stageTitle || meta?.title || item.currentStage || null,
    stageSignal: item.stageSignal || meta?.signal || null,
    stageGuide: item.stageGuide || (meta ? { summary: meta.summary, investment: meta.investment, signal: meta.signal } : null),
    stageTimeline: item.stageTimeline?.length ? item.stageTimeline : buildStageTimeline(stageOrder),
    stageChecks: item.stageChecks?.length ? item.stageChecks : buildStageChecks(stageOrder, unitRatioPct),
    unitRatioPct,
  };
}

export function checkStatusClass(status: RedevStageCheck['status']) {
  if (status === 'ok') return 'text-emerald-600';
  if (status === 'warn') return 'text-amber-600';
  if (status === 'danger') return 'text-rose-600';
  if (status === 'pending') return 'text-slate-400';
  return 'text-slate-500';
}

export function checkStatusIcon(status: RedevStageCheck['status']) {
  if (status === 'ok') return '✓';
  if (status === 'warn') return '!';
  if (status === 'danger') return '✕';
  if (status === 'pending') return '…';
  return '?';
}
