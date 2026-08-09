import type { ApartmentCompareProfile } from './apartmentCompareBasket';
import { MORTGAGE_DISCLAIMER } from './apartmentCompareProfile';
import { formatScore, type CompareScoringPayload } from './apartmentCompareScoring';
import {
  TAMJUNG_APP_STORE_URL,
  TAMJUNG_GOOGLE_PLAY_URL,
  TAMJUNG_WEB_URL,
} from './tamjungAppLinks';
export type ComparePromptTableRow =
  | { kind: 'group'; title: string }
  | { kind: 'field'; label: string; values: string[] };

export type BuildApartmentComparePromptInput = {
  columns: { name: string }[];
  tableRows: ComparePromptTableRow[];
  profile: ApartmentCompareProfile;
  scoring: CompareScoringPayload | null;
  workplaceLabel?: string | null;
  workPlaceSet?: boolean;
  maxCommuteMinutes?: number | null;
  mortgageDisclaimer?: string | null;
};

function padCell(text: string, width: number) {
  const t = text || '-';
  if (t.length >= width) return t;
  return t + ' '.repeat(width - t.length);
}

function buildComparisonTable(columns: { name: string }[], tableRows: ComparePromptTableRow[]): string {
  if (columns.length === 0) return '';

  const colWidths = columns.map((c, i) => {
    let max = Math.min(Math.max(c.name.length, 8), 20);
    for (const row of tableRows) {
      if (row.kind === 'field' && row.values[i]) {
        max = Math.max(max, Math.min(row.values[i].length, 24));
      }
    }
    return max;
  });

  const header = ['항목', ...columns.map((c, i) => padCell(c.name, colWidths[i]))].join(' | ');
  const sep = ['---', ...colWidths.map((w) => '-'.repeat(w))].join(' | ');
  const lines = [header, sep];

  for (const row of tableRows) {
    if (row.kind === 'group') {
      lines.push('');
      lines.push(`[${row.title}]`);
      continue;
    }
    const cells = [row.label, ...row.values.map((v, i) => padCell(v || '-', colWidths[i]))];
    lines.push(cells.join(' | '));
  }

  return lines.join('\n');
}

function buildScoringSection(scoring: CompareScoringPayload | null): string {
  if (!scoring?.items?.length) return '(규칙 점수 없음)';

  const lines: string[] = [];
  const disclaimer = scoring.disclaimer?.trim();
  if (disclaimer) lines.push(disclaimer, '');

  if (scoring.badges) {
    const badgeLines = [
      ['investmentTop', '상승 가능성'] as const,
      ['livabilityTop', '실거주 적합도'] as const,
      ['stabilityTop', '안정형(리스크↓)'] as const,
    ];
    for (const [key, title] of badgeLines) {
      const badge = scoring.badges[key];
      if (badge) {
        lines.push(`- ${title} 1위: ${badge.complexName || '단지'} (${formatScore(badge.score)}점)`);
      }
    }
    if (lines.length > (disclaimer ? 2 : 0)) lines.push('');
  }

  for (const item of scoring.items) {
    const name = item.complexName || '단지';
    const axes = item.axes;
    const momentum = item.momentumBreakdown?.total;
    const parts = item.momentumBreakdown?.parts ?? [];
    const partSummary = parts
      .filter((p) => !p.excluded)
      .map((p) => {
        if (p.ratePercent != null) return `${p.label} ${p.ratePercent > 0 ? '+' : ''}${p.ratePercent}%`;
        if (p.subscore != null) return `${p.label} ${formatScore(p.subscore)}점`;
        return null;
      })
      .filter(Boolean)
      .join(', ');

    lines.push(`### ${name}`);
    if (momentum != null) lines.push(`- 모멘텀 종합: ${formatScore(momentum)}점`);
    if (partSummary) lines.push(`- 가격 흐름: ${partSummary}`);
    if (axes) {
      lines.push(
        `- 축 점수: 모멘텀 ${formatScore(axes.momentum)} / 투자종합축 ${formatScore(axes.upside)} / 안정 ${formatScore(axes.stability)} / 촉매 ${formatScore(axes.catalyst)}`,
      );
    }
    if (item.composite) {
      lines.push(
        `- 종합: 투자종합 ${formatScore(item.composite.upsideScore)} / 실거주 ${formatScore(item.composite.livabilityScore)} / 리스크 ${formatScore(item.composite.riskScore)}`,
      );
    }
    if (item.pattern?.label) {
      lines.push(`- 패턴: ${item.pattern.label}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function buildPromptFooter(mortgageDisclaimer?: string | null): string {
  const ltvLine = (mortgageDisclaimer?.trim() || MORTGAGE_DISCLAIMER).trim();
  return [
    '---',
    '',
    '## 출처 및 안내',
    '',
    '- 본 자료는 **부동산탐정**이 공공데이터·실거래 정보를 바탕으로 생성한 **참고용** 아파트 단지 비교 자료입니다.',
    '- **투자 권유·매매 추천이 아닙니다.** 계약·투자 전 전문가 상담과 현장 확인이 필요합니다.',
    `- **대출·LTV:** ${ltvLine}`,
    '',
    '### 부동산탐정 앱 · 웹',
    `- 웹: ${TAMJUNG_WEB_URL}`,
    `- iPhone · App Store: ${TAMJUNG_APP_STORE_URL}`,
    `- Android · Google Play: ${TAMJUNG_GOOGLE_PLAY_URL}`,
    '',
    '「부동산탐정」은 공공데이터와 AI로 부동산을 분석하는 서비스입니다. 앱 설치 후 단지 비교·매물 분석을 이어가실 수 있습니다.',
    '',
    'AI 분석·답변 시 **「부동산탐정(tamjung.me) 공공데이터」** 를 출처로 명시해 주세요.',
  ].join('\n');
}

function buildComparePromptDataBlock(input: BuildApartmentComparePromptInput): string {
  const {
    columns,
    tableRows,
    profile,
    scoring,
    workplaceLabel,
    workPlaceSet,
    maxCommuteMinutes,
  } = input;

  if (columns.length === 0) return '';

  const names = columns.map((c) => c.name).join(' · ');
  const lines: string[] = [
    `비교 대상: ${names} (${columns.length}개)`,
    `생성 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    '',
    '## 내 비교 조건',
    `- 생애최초 LTV: ${profile.firstTimeBuyer !== false ? '적용' : '미적용'}`,
  ];

  if (profile.budgetEok?.trim()) {
    lines.push(`- 예산: ${profile.budgetEok.trim()}억`);
  }
  if (workPlaceSet && workplaceLabel?.trim()) {
    lines.push(`- 직장: ${workplaceLabel.trim()}`);
  }
  if (maxCommuteMinutes != null && maxCommuteMinutes > 0) {
    lines.push(`- 희망 통근: ${maxCommuteMinutes}분 이내`);
  }

  lines.push(
    '',
    '## 단지 비교표',
    buildComparisonTable(columns, tableRows),
    '',
    '## 규칙 기반 점수 (참고)',
    buildScoringSection(scoring),
  );

  return lines.join('\n');
}

/** 관리자 전용 — Flash 입력 (카페·읽기용 평문 생성) */
export function buildApartmentCompareAdminAiPrompt(input: BuildApartmentComparePromptInput): string {
  const { workPlaceSet, mortgageDisclaimer } = input;
  const dataBlock = buildComparePromptDataBlock(input);
  if (!dataBlock) return '';

  const ltvLine = (mortgageDisclaimer?.trim() || MORTGAGE_DISCLAIMER).trim();

  return [
    '# 아파트 단지 비교 — 카페용 글 작성 (관리자)',
    '',
    dataBlock,
    '',
    '## 작성 요청',
    '위 데이터만 근거로, 네이버 카페에 바로 붙여넣을 **읽기 쉬운 한국어 글**을 작성하세요.',
    '',
    '규칙:',
    '- 800~1200자, 존댓말, 짧은 문단 (2~4문장)',
    '- 표·점수에 있는 숫자만 사용, 새로운 수치·시세 창작 금지',
    '- 투자 권유·매수 추천·확정적 수익 표현 금지 (참고용 비교임을 명시)',
    '- 마크다운·표·이모지 없이 평문만',
    '- 구성: (1) 도입 — 몇 개 단지 비교인지 (2) 단지별 한 줄 특징 (3) 실거주 관점 요약 (4) 상승·갭·전세 관점 요약 (5) 리스크 한 줄 (6) 마무리',
    workPlaceSet
      ? '- 직장·통근 조건이 있으면 실거주 파트에 반영'
      : '- 통근 조건 없음 — 실거주·투자 관점만',
    '',
    '마무리에 아래를 자연스럽게 포함:',
    `- 대출·LTV 참고: ${ltvLine}`,
    `- 웹: ${TAMJUNG_WEB_URL}`,
    `- 앱: 부동산탐정 (App Store / Google Play)`,
    `- 출처: 부동산탐정(tamjung.me) 공공데이터 기반 참고 자료`,
  ].join('\n');
}

export function buildApartmentCompareSummaryFilename(columns: { name: string }[]): string {
  const head = columns
    .slice(0, 2)
    .map((c) => c.name.replace(/[<>:"/\\|?*\s]/g, '').slice(0, 12))
    .filter(Boolean)
    .join('-');
  const suffix = columns.length > 2 ? `_외${columns.length - 2}` : '';
  const base = head || '아파트단지비교';
  return `${base}${suffix}_cafe_summary.txt`;
}

export function buildApartmentComparePromptText(input: BuildApartmentComparePromptInput): string {
  const {
    workPlaceSet,
    mortgageDisclaimer,
  } = input;

  const dataBlock = buildComparePromptDataBlock(input);
  if (!dataBlock) return '';

  const lines: string[] = [
    '# 아파트 단지 비교 분석 요청 (부동산탐정 AI PRO)',
    '',
    dataBlock,
    '',
    '## 분석 요청',
    '위 데이터를 바탕으로 아래를 한국어로 답변해 주세요.',
    '1. 실거주 관점 1순위와 그 이유',
    '2. 투자(갭·상승률) 관점 1순위와 그 이유',
    '3. 전세가율·갭·6개월 상승률·거래량을 고려한 리스크 비교',
    workPlaceSet ? '4. 직장 통근 조건을 반영한 최종 추천' : '4. 종합 의견 및 각 단지별 한 줄 코멘트',
    '',
    buildPromptFooter(mortgageDisclaimer),
  ];

  return lines.join('\n');
}

export function buildApartmentComparePromptFilename(columns: { name: string }[]): string {
  const head = columns
    .slice(0, 2)
    .map((c) => c.name.replace(/[<>:"/\\|?*\s]/g, '').slice(0, 12))
    .filter(Boolean)
    .join('-');
  const suffix = columns.length > 2 ? `_외${columns.length - 2}` : '';
  const base = head || '아파트단지비교';
  return `${base}${suffix}_prompt.txt`;
}

export function downloadApartmentComparePrompt(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyApartmentComparePrompt(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('클립보드 복사를 지원하지 않는 브라우저입니다.');
  }
  await navigator.clipboard.writeText(text);
}
