/** v3.1 UI — 프로토타입 섹션별 데이터 추출 */

import { buildRiskItemFacts } from './apartmentRiskItemFacts';
import {
  formatEokCompact,
  getTargetArea,
  SCORE_LABEL_MAP,
  v31ShouldHideScoreItem,
} from './analysisV31Helpers';
import {
  dedupeScoreItems,
  resolveScoreItemWeight,
  toWeightedScore,
  formatWeightedScoreLabel,
} from './landScoreWeights';

const MAX_FAR_TABLE: Record<string, number> = {
  '제1종전용주거지역': 100,
  '제2종전용주거지역': 150,
  '제1종일반주거지역': 200,
  '제2종일반주거지역': 250,
  '제3종일반주거지역': 300,
  '준주거지역': 500,
  '일반상업지역': 1300,
  '근린상업지역': 900,
  '중심상업지역': 1500,
  '유통상업지역': 1100,
  '준공업지역': 400,
  '일반공업지역': 350,
  '전용공업지역': 300,
};

export type DevGridItem = { label: string; value: string; positive?: boolean };

export function extractDevelopmentGrid(
  ai: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
  analysisMetadata?: Record<string, unknown> | null,
): DevGridItem[] {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const land = (mergedData?.vitals as Record<string, unknown> | undefined)?.land as Record<string, unknown> | undefined;
  const mergedLand = mergedData?.land as Record<string, unknown> | undefined;
  const chars = (land?.characteristics || mergedLand?.characteristics || {}) as Record<string, unknown>;
  const titleList = ((mergedData?.vitals as Record<string, unknown> | undefined)?.building as Record<string, unknown> | undefined)?.title
    || (mergedData?.building as Record<string, unknown> | undefined)?.title
    || [];
  const building = (Array.isArray(titleList) ? titleList[0] : titleList) as Record<string, unknown> || {};

  const zoning = String(chars.zoning || mergedData?.zoning || '-');
  const legalFar = MAX_FAR_TABLE[zoning] ?? null;
  const currentFar = parseFloat(String(building.vlRat || mergedData?.floorAreaRatio || '')) || null;

  let farGap: number | null = null;
  if (legalFar != null && currentFar != null) farGap = legalFar - currentFar;

  const compText = String((ai['1_comprehensiveRisk'] as Record<string, unknown> | undefined)?.coreJudgement || '');
  const gapFromText = compText.match(/([\d,.]+)\s*%p/);
  if (farGap == null && gapFromText) {
    farGap = parseFloat(gapFromText[1].replace(/,/g, ''));
  }

  const useAprDay = String(building.useAprDay || mergedData?.useAprDay || '');
  let buildYear = '';
  let buildAge = '';
  if (useAprDay.length >= 4) {
    const y = parseInt(useAprDay.slice(0, 4), 10);
    if (Number.isFinite(y)) {
      buildYear = String(y);
      buildAge = `${new Date().getFullYear() - y}년`;
    }
  }

  const totArea = parseFloat(String(building.totArea || building.vlRatEstmTotArea || '')) || 0;
  const platArea = getTargetArea(meta, mergedData, 'land');
  const landShape = [chars.landShape, chars.topography].filter(Boolean).join(' · ') || '-';
  const road = String(chars.roadConnection || chars.roadSideCode || '-');
  const category = String(mergedData?.category || mergedData?.listingCategory || '토지');

  let devPotential = '-';
  const outlook = String((ai['7_inDepthReport'] as Record<string, unknown> | undefined)?.outlook || '');
  const potMatch = outlook.match(/공시\s*([\d.~\-]+)\s*배/) || compText.match(/공시\s*([\d.~\-]+)\s*배/);
  if (potMatch) devPotential = `공시 ${potMatch[1]}배`;

  return [
    { label: '용도지역', value: zoning },
    {
      label: '법정 / 현재 용적률',
      value: legalFar != null && currentFar != null
        ? `${legalFar.toLocaleString()}% / ${currentFar}%`
        : (currentFar != null ? `${currentFar}%` : '-'),
    },
    {
      label: '용적률 갭',
      value: farGap != null ? `+${farGap.toLocaleString(undefined, { maximumFractionDigits: 1 })}%p` : '-',
      positive: farGap != null && farGap > 100,
    },
    { label: '개발 성공 시 잠재', value: devPotential, positive: devPotential !== '-' },
    { label: '준공 · 구조', value: buildYear ? `${buildYear}${buildAge ? ` (${buildAge})` : ''}` : '-' },
    {
      label: '연면적 / 건축',
      value: totArea > 0 && platArea > 0
        ? `${Math.round(totArea)} / ${Math.round(platArea)}㎡`
        : (platArea > 0 ? `${Math.round(platArea)}㎡` : '-'),
    },
    { label: '토지 형상', value: landShape },
    { label: '도로 · 용도', value: `${road} · ${category}`.replace(/^- · /, '') },
  ];
}

export function extractDevelopmentProse(
  ai: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
): string {
  const landShapesObj = ai['2_propertyAnalysis'] || ai['2_landShapeAnalysis'] || {};
  const shapes = Array.isArray(landShapesObj) ? landShapesObj : Object.values(landShapesObj as object);
  const first = shapes.find((s) => String(s).trim().length > 20);
  if (first) return String(first).slice(0, 280);
  return String((ai['1_comprehensiveRisk'] as Record<string, unknown> | undefined)?.coreJudgement || '').slice(0, 200);
}

export function extractDevelopmentAiText(ai: Record<string, unknown>): string {
  const landShapesObj = ai['2_propertyAnalysis'] || ai['2_landShapeAnalysis'] || {};
  const shapes = Array.isArray(landShapesObj) ? landShapesObj : Object.values(landShapesObj as object);
  return shapes.map(String).filter(Boolean).join('\n\n');
}

export type ZoningChangePermitItem = {
  address: string;
  purpose: string;
  year: number | null;
  permitDate: string;
  category: 'commercial' | 'hospitality';
};

function parsePermitYear(dateStr: unknown): number | null {
  const s = String(dateStr || '').replace(/\D/g, '');
  if (s.length >= 4) return parseInt(s.substring(0, 4), 10);
  return null;
}

function formatPermitDate(dateStr: unknown): string {
  const s = String(dateStr || '').replace(/\D/g, '');
  if (s.length >= 8) return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
  if (s.length >= 4) return s.slice(0, 4);
  return '-';
}

/** ZoningChangeAnalyzer와 동일 기준 — 상업/숙박 용도변경, 최근 5년 */
export function extractZoningChangePermits(
  mergedData?: Record<string, unknown> | null,
): ZoningChangePermitItem[] {
  const permits = (mergedData?.regulatoryData as Record<string, unknown> | undefined)?.permits;
  if (!Array.isArray(permits)) return [];

  const currentYear = new Date().getFullYear();
  const items: ZoningChangePermitItem[] = [];

  for (const raw of permits) {
    const p = raw as Record<string, unknown>;
    const type = String(p.archGbCdNm || '');
    if (!type.includes('용도변경')) continue;

    const purpose = String(p.mainPurpsCdNm || '');
    let category: 'commercial' | 'hospitality' | null = null;
    if (/업무시설|근린생활/.test(purpose)) category = 'commercial';
    else if (/숙박시설/.test(purpose)) category = 'hospitality';
    else continue;

    const year = parsePermitYear(p.archPmsDay || p.useAprDay);
    if (year == null || currentYear - year > 5) continue;

    const address = String(p.platPlc || p.platAddr || '').trim();
    if (!address) continue;

    items.push({
      address,
      purpose,
      year,
      permitDate: formatPermitDate(p.archPmsDay || p.useAprDay),
      category,
    });
  }

  const byAddr = new Map<string, ZoningChangePermitItem>();
  for (const item of items) {
    const prev = byAddr.get(item.address);
    if (!prev || (item.year ?? 0) > (prev.year ?? 0)) byAddr.set(item.address, item);
  }
  return [...byAddr.values()].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

export function extractZoningChangeSummaryComment(meta: Record<string, unknown>): string {
  const comment = String(meta.zoningChangeComment || '');
  if (!comment || /이력 없음|없습니다|미감지|해당 없음/i.test(comment)) {
    return '주변 5년 이내 인접 필지 변경 0건 · 대상 인접 필지 5년 이내 변경 이력 없음';
  }
  return comment.split('\n')[0].trim();
}

export function extractZoningChangeMapListItems(
  permits: ZoningChangePermitItem[],
  meta: Record<string, unknown>,
): { title: string; sub: string }[] {
  const count5Y = Number(meta.zoningChangeCount5Y || 0);
  const count3Y = Number(meta.zoningChangeCount3Y || 0);
  const items: { title: string; sub: string }[] = [
    {
      title: '조회 결과',
      sub: count5Y > 0
        ? `5년 · 반경 500m · 상업/숙박 변경 ${count5Y}건${count3Y > 0 ? ` (최근 3년 ${count3Y}건)` : ''}`
        : '5년 · 반경 500m · 상업/숙박 변경 없음',
    },
  ];

  if (permits.length === 0) {
    items.push({
      title: '대상 인접 필지',
      sub: '5년 이내 변경 이력 없음',
    });
    return items;
  }

  for (const p of permits.slice(0, 8)) {
    const tag = p.category === 'hospitality' ? '숙박' : '상업';
    const shortAddr = p.address.split(' ').slice(-2).join(' ') || p.address;
    items.push({
      title: shortAddr,
      sub: `${tag} · ${p.purpose} · ${p.permitDate}`,
    });
  }
  return items;
}

export function buildV31MapData(
  meta: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
): Record<string, unknown> {
  const target = (meta.target || {}) as Record<string, unknown>;
  const coords = mergedData?.coordinates as Record<string, unknown> | undefined;
  const lat = target.lat ?? meta.lat ?? mergedData?.lat ?? coords?.lat;
  const lng = target.lng ?? meta.lng ?? mergedData?.lng ?? coords?.lng;
  return {
    ...meta,
    target: {
      ...target,
      lat,
      lng,
      address: target.address || target.platPlc || mergedData?.address || '분석 대상지',
    },
  };
}

export type BenefitCard = {
  type: 'direct' | 'indirect' | 'no' | 'regulation';
  typeLabel: string;
  title: string;
  body: string;
  distance: string;
};

function mapHosaeTier(tier: string): BenefitCard['type'] {
  const t = tier.toLowerCase();
  if (t.includes('직접') && !t.includes('아님')) return 'direct';
  if (t.includes('간접')) return 'indirect';
  if (t.includes('규제') || t.includes('주의')) return 'regulation';
  if (t.includes('아님')) return 'no';
  return 'indirect';
}

function tierTypeLabel(type: BenefitCard['type']): string {
  if (type === 'direct') return '🟢 직접수혜';
  if (type === 'indirect') return '🟡 간접';
  if (type === 'regulation') return '🔴 규제주의';
  return '🔴 직접수혜 아님';
}

export function extractBenefitCards(
  ai: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
  analysisMetadata?: Record<string, unknown> | null,
): BenefitCard[] {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const cards: BenefitCard[] = [];
  const hosae = meta.hosaeAdjustment as Record<string, unknown> | undefined;
  const details = Array.isArray(hosae?.details) ? hosae.details : [];

  details.slice(0, 6).forEach((d: Record<string, unknown>) => {
    const type = mapHosaeTier(String(d.tier_label || d.tier || ''));
    const dist = d.dist_label
      ? String(d.dist_label)
      : (d.distance_m != null
        ? (Number(d.distance_m) >= 1000 ? `약 ${(Number(d.distance_m) / 1000).toFixed(1)}km` : `약 ${d.distance_m}m`)
        : '');
    cards.push({
      type,
      typeLabel: tierTypeLabel(type),
      title: String(d.title || d.label || '호재'),
      body: String(d.summary || d.label || d.title || '').slice(0, 120),
      distance: dist || (type === 'regulation' ? '반드시 지자체 확인' : '현장 확인 권장'),
    });
  });

  const land = (mergedData?.vitals as Record<string, unknown> | undefined)?.land as Record<string, unknown> | undefined;
  const usagePlans = (land?.characteristics as Record<string, unknown> | undefined)?.usagePlansIncluded as string[] | undefined;
  if (Array.isArray(usagePlans)) {
    usagePlans.filter((u) => /허가|비행|규제|제한/.test(u)).slice(0, 2).forEach((u) => {
      if (cards.some((c) => c.title.includes(u.slice(0, 8)))) return;
      cards.push({
        type: 'regulation',
        typeLabel: '🔴 규제주의',
        title: u.slice(0, 40),
        body: '토지이용계획 · 인허가 제한 확인 필요',
        distance: '토지이음 확인',
      });
    });
  }

  return cards.slice(0, 6);
}

export function extractSupplyGrid(mergedData?: Record<string, unknown> | null): DevGridItem[] {
  const hs = (mergedData?.housingSupply || (mergedData?.vitals as Record<string, unknown> | undefined)?.housingSupply || {}) as Record<string, unknown>;
  const unsold = Number((hs.unsold as Record<string, unknown> | undefined)?.current || hs.unsold || 0);
  const planned = Number(((hs.nextYears as Record<string, unknown> | undefined)?.planned as Record<string, unknown> | undefined)?.count || 0);
  const moveIn = Number(((hs.nextYears as Record<string, unknown> | undefined)?.moveIn as Record<string, unknown> | undefined)?.count || 0);
  const plannedDetails = Array.isArray(hs.plannedDetails) ? hs.plannedDetails : [];
  const glut = Number(hs.glutScore || 0);

  return [
    { label: '미분양', value: unsold > 0 ? `${unsold.toLocaleString()}세대` : '-' },
    { label: '분양·입주 예정', value: (planned + moveIn) > 0 ? `${(planned + moveIn).toLocaleString()}세대` : '-' },
    { label: '입주 예정 단지', value: plannedDetails.length > 0 ? `${plannedDetails.length}곳` : '-' },
    { label: '공급과잉 지수', value: glut > 0 ? `${glut}/100` : '-' },
  ];
}

export function extractMarketTradeGrid(
  ai: Record<string, unknown>,
  analysisMetadata?: Record<string, unknown> | null,
): DevGridItem[] {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const compRisk = (ai['1_comprehensiveRisk'] as Record<string, unknown> | undefined)?.scoreItems as Record<string, unknown> | undefined;
  const tradeScore = compRisk?.tradeVolume || compRisk?.거래량;
  const tradeNum = typeof tradeScore === 'object' && tradeScore ? Number((tradeScore as Record<string, unknown>).score) : 0;

  const comparables = Array.isArray(meta.comparables) ? meta.comparables.length : 0;
  const detected = Number(meta.totalDetected ?? meta.comparableCount ?? 0);
  const regional = Array.isArray(meta.uiAttachedRegionalTrades)
    ? meta.uiAttachedRegionalTrades.reduce((s: number, g: Record<string, unknown>) => s + (Array.isArray(g.data) ? g.data.length : 0), 0)
    : 0;

  return [
    { label: '최근 6개월 (반경)', value: detected > 0 ? `${detected}건` : '-' },
    { label: '동일유형 (1km)', value: `${comparables}건`, positive: false },
    { label: '반경 전체 (3년)', value: regional > 0 ? `${regional}건` : '-' },
    { label: '거래량 점수', value: tradeNum > 0 ? `${tradeNum}/10` : '-', positive: false },
  ];
}

export function extractAmenityPopulationGrid(
  ai: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
): DevGridItem[] {
  const ctx = { mergedData, analysisMetadata: (ai.analysisMetadata || {}) as Record<string, unknown> };
  const compRisk = (ai['1_comprehensiveRisk'] as Record<string, unknown> | undefined)?.scoreItems as Record<string, unknown> | undefined;
  const amenScore = compRisk?.amenities || compRisk?.['생활 편의시설'];
  const popScore = compRisk?.population || compRisk?.['인구 현황'];
  const amenNum = typeof amenScore === 'object' && amenScore ? Number((amenScore as Record<string, unknown>).score) : 0;
  const popNum = typeof popScore === 'object' && popScore ? Number((popScore as Record<string, unknown>).score) : 0;

  const amenFacts = buildRiskItemFacts('amenities', ctx);
  const popFacts = buildRiskItemFacts('population', ctx);

  return [
    { label: `생활 편의 (${amenNum || '-'}/10)`, value: amenFacts[0]?.split(' ')[0] || '-' },
    { label: amenFacts[0]?.split(' ').slice(1).join(' ') || '주요 시설', value: amenFacts[1] || amenFacts[0] || '-' },
    { label: `인구 (${popNum || '-'}/10)`, value: popFacts[0] || '-' },
    { label: popFacts[1] || '배후 인구', value: popFacts[2] || '-' },
  ];
}

export type RiskDetailRow = {
  key: string;
  label: string;
  /** raw 1~10 score */
  score: number;
  /** weighted max (30, 12, …) or 10 for non-land/building */
  maxWeight: number;
  /** display points (score/10 × maxWeight) */
  displayScore: number;
  scoreLabel: string;
  reason: string;
  facts: string[];
};

export function extractRiskDetailRows(
  ai: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
  category = 'land',
): RiskDetailRow[] {
  const compRisk = (ai['1_comprehensiveRisk'] || {}) as Record<string, unknown>;
  const scoreItems = (compRisk.scoreItems || {}) as Record<string, unknown>;
  const apiWeights = compRisk.weights as Record<string, number> | undefined;
  const ctx = { mergedData, analysisMetadata: (ai.analysisMetadata || {}) as Record<string, unknown> };

  return dedupeScoreItems(scoreItems)
    .filter(({ key, item }) => {
      if (v31ShouldHideScoreItem(key, category)) return false;
      if (item === null) return false;
      if (typeof item === 'object' && (item as Record<string, unknown>).score === null) return false;
      return true;
    })
    .map(({ key, item }) => {
      const label = SCORE_LABEL_MAP[key] || key;
      const score = typeof item === 'object' && item !== null
        ? Number((item as Record<string, unknown>).score ?? 0)
        : (typeof item === 'number' ? item : 0);
      const reason = typeof item === 'object' && item !== null
        ? String((item as Record<string, unknown>).reason || '')
        : '';
      const facts = buildRiskItemFacts(key, ctx);
      const maxWeight = resolveScoreItemWeight(key, category, apiWeights) ?? 10;
      const displayScore = maxWeight === 10 ? score : toWeightedScore(score, maxWeight);
      const scoreLabel = maxWeight === 10
        ? `${score}/10`
        : formatWeightedScoreLabel(score, maxWeight);
      return { key, label, score, maxWeight, displayScore, scoreLabel, reason, facts };
    });
}

export function resolveSigunguCd(mergedData?: Record<string, unknown> | null, meta?: Record<string, unknown> | null): string | null {
  const vitals = mergedData?.vitals as Record<string, unknown> | undefined;
  const land = vitals?.land as Record<string, unknown> | undefined;
  const characteristics = land?.characteristics as Record<string, unknown> | undefined;
  const pnu = String(meta?.pnu || mergedData?.pnu || characteristics?.pnu || '');
  return pnu.length >= 5 ? pnu.slice(0, 5) : null;
}

export function resolveReportHeader(
  ai: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
  reportId?: string,
) {
  const title = String(ai.propertyTitle || mergedData?.title || mergedData?.address || '토지 분석');
  const address = String(mergedData?.address || mergedData?.rawAddress || '');
  const category = String(mergedData?.category || ai.category || 'land');
  const meta = (ai.analysisMetadata || {}) as Record<string, unknown>;
  const targetArea = getTargetArea(meta, mergedData, category);
  const land = (mergedData?.vitals as Record<string, unknown> | undefined)?.land as Record<string, unknown> | undefined;
  const zoning = String((land?.characteristics as Record<string, unknown> | undefined)?.zoning || mergedData?.zoning || '');
  const building = ((mergedData?.vitals as Record<string, unknown> | undefined)?.building as Record<string, unknown> | undefined)?.title;
  const b0 = Array.isArray(building) ? building[0] : building;
  const useAprDay = String((b0 as Record<string, unknown> | undefined)?.useAprDay || '');
  const year = useAprDay.length >= 4 ? useAprDay.slice(0, 4) : '';
  const pyeong = targetArea > 0 ? (targetArea / 3.3058).toFixed(1) : '';

  const subtitle = [
    address,
    zoning,
    targetArea > 0 ? `대지 ${targetArea.toFixed(1)}㎡${pyeong ? ` (${pyeong}평)` : ''}` : '',
    year ? `${year}년 준공` : '',
  ].filter(Boolean).join(' · ');

  const listingType = String(mergedData?.listingCategory || mergedData?.propertyType || mergedData?.subcategory || '').trim();
  const updated = String(mergedData?.updated_at || mergedData?.analyzed_at || '').slice(0, 10).replace(/-/g, '.');

  return {
    reportId: reportId || String(mergedData?.id || ''),
    title,
    subtitle,
    updated: updated ? `AI 분석 · ${updated}` : 'AI 분석',
    breadcrumb: `${category === 'land' || category === '토지' ? '토지' : '빌딩'} 분석${reportId ? ` · 분석번호 #${reportId}` : ''}${listingType ? ` · ${listingType}` : ''}`,
  };
}

export function extractPriceMapListItems(
  analysisMetadata?: Record<string, unknown> | null,
): { title: string; sub: string }[] {
  const meta = analysisMetadata || {};
  const comparables = Array.isArray(meta.comparables) ? meta.comparables.length : 0;
  const regional = Array.isArray(meta.uiAttachedRegionalTrades)
    ? meta.uiAttachedRegionalTrades.reduce((s: number, g: Record<string, unknown>) => s + (Array.isArray(g.data) ? g.data.length : 0), 0)
    : 0;
  const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
  const attached = meta.uiAttachedMultiplier as Record<string, unknown> | undefined;
  const cbd = meta.cbdMultiplierEstimate as Record<string, unknown> | undefined;
  const perSqm = Number(cbd?.officialPerSqm || opr?.targetOfficialPerSqm) || 0;
  const area = Number(meta.targetArea) || 0;

  return [
    {
      title: '비교사례 (동일 조건)',
      sub: `${comparables}건 · 신뢰 ${meta.confidenceGrade || '-'} · L${meta.conditionRelaxLevel || 0}`,
    },
    {
      title: '인근 실거래 (전체)',
      sub: regional > 0 ? `${regional}건 · 3년 · 지목 상이 포함` : '반경 내 거래 참고',
    },
    {
      title: '공시지가',
      sub: perSqm > 0 && area > 0
        ? `${Math.round(perSqm / 10000).toLocaleString()}만/㎡ · ${area.toFixed(1)}㎡`
        : '-',
    },
    {
      title: '동일수급권 배율',
      sub: (meta.officialPriceRatio as Record<string, unknown> | undefined)?.appliedMultiplier
        ? `median ${(meta.officialPriceRatio as Record<string, unknown>).appliedMultiplier}배 · ${String((meta.officialPriceRatio as Record<string, unknown>).dynamicStatus || '')}`
        : (attached?.midMult ? `${attached.midMult}배 · ${String(attached.zoning || '')}` : '-'),
    },
  ];
}

export type ComparableEmptyCopy = {
  radius: number;
  detected: number;
  matched: number;
  relax: number;
  regional: number;
  note?: string;
};

export function buildComparableEmptyCopy(meta: Record<string, unknown>): ComparableEmptyCopy {
  const radius = Number(meta.searchRadiusM ?? meta.comparableRadiusM ?? 1000);
  const detected = Number(meta.totalDetected ?? 0);
  const matched = Array.isArray(meta.comparables) ? meta.comparables.length : 0;
  const relax = Number(meta.conditionRelaxLevel) || 0;
  const regional = Array.isArray(meta.uiAttachedRegionalTrades)
    ? meta.uiAttachedRegionalTrades.reduce((s: number, g: Record<string, unknown>) => (
      s + (Array.isArray(g.data) ? g.data.length : 0)
    ), 0)
    : Number(meta.regionalTradeCount ?? 0);

  return {
    radius,
    detected,
    matched,
    relax,
    regional,
    note: meta.confidenceNote ? String(meta.confidenceNote) : undefined,
  };
}

export type ForecastCard = { label: string; value: string; desc: string };

export function extractForecastCards(
  ai: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
  analysisMetadata?: Record<string, unknown> | null,
): ForecastCard[] {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const inDepth = (ai['7_inDepthReport'] || {}) as Record<string, unknown>;
  const outlook = String(inDepth.outlook || '');
  const devGrid = extractDevelopmentGrid(ai, mergedData, meta);
  const devPotential = devGrid.find((g) => g.label.includes('개발 성공'))?.value || '-';

  const shortMatch = outlook.match(/6개월[^.\n]{0,48}/i);
  const popMatch = outlook.match(/필지수[^.\n]{0,60}/);
  const midMatch = outlook.match(/공시\s*([\d.~\-]+)\s*배/);

  return [
    {
      label: '단기 · 6개월',
      value: shortMatch
        ? shortMatch[0].replace(/^6개월[:\s·]*/i, '').trim() || '보합 ~ 약상승'
        : '보합 ~ 약상승',
      desc: popMatch?.[0] || '필지수 · 인구 · 지가지수 종합',
    },
    {
      label: '중장기 · 개발 성공',
      value: devPotential !== '-' ? devPotential : (midMatch ? `공시 ${midMatch[1]}배` : '-'),
      desc: '신축·재건축 · 용적률 갭 활용 시',
    },
  ];
}

export type MarketVolumeHero = {
  value: string;
  label: string;
  changeLines: string[];
};

export function extractMarketVolumeHero(mergedData?: Record<string, unknown> | null): MarketVolumeHero | null {
  const ind = (mergedData?.marketIndicators || {}) as Record<string, unknown>;
  const tradeVol = (ind.tradeVolume || ind.tradeVolumeByUse) as Record<string, unknown> | undefined;
  const data = Array.isArray(tradeVol?.data) ? tradeVol.data as Array<Record<string, unknown>> : [];
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  const curr = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const currVal = Number(curr?.value ?? curr?.count);
  const prevVal = prev ? Number(prev?.value ?? prev?.count) : NaN;
  if (!Number.isFinite(currVal)) return null;

  const sigungu = String(mergedData?.sigungu || mergedData?.region || '해당 지역');
  const dateLabel = String(curr?.date || curr?.label || '').slice(0, 7).replace('-', '.');
  const lines: string[] = [];
  if (Number.isFinite(prevVal) && prevVal > 0) {
    const diff = currVal - prevVal;
    const pct = ((diff / prevVal) * 100).toFixed(1);
    const arrow = diff >= 0 ? '↑' : '↓';
    lines.push(`${arrow} ${diff >= 0 ? '+' : ''}${Math.round(diff)}필지 · ${Math.round(prevVal)} 대비 ${diff >= 0 ? '+' : ''}${pct}%`);
  }

  return {
    value: Math.round(currVal).toLocaleString(),
    label: `${sigungu} 순수토지 거래 필지수${dateLabel ? ` (${dateLabel})` : ''}`,
    changeLines: lines,
  };
}

export function resolveSigunguLabel(mergedData?: Record<string, unknown> | null): string {
  const sigungu = String(mergedData?.sigungu || '').trim();
  if (sigungu) return sigungu;
  const addr = String(mergedData?.address || mergedData?.rawAddress || '');
  const m = addr.match(/([가-힣]+(?:시|군|구))/);
  return m?.[1] || '해당 지역';
}

export function extractFinalVerdictDetails(ai: Record<string, unknown>): {
  verdict: string;
  grade: string;
  reason: string;
  condition: string;
} | null {
  const raw = ai['8_finalVerdict'];
  if (!raw) return null;
  if (typeof raw === 'string') {
    return { verdict: raw, grade: '-', reason: '-', condition: '' };
  }
  if (typeof raw === 'object' && raw !== null) {
    const v = raw as Record<string, unknown>;
    return {
      verdict: String(v.verdict || v.verdic || '-'),
      grade: String(v.investmentGrade || '-'),
      reason: String(v.reason || '-'),
      condition: String(v.condition || ''),
    };
  }
  return null;
}

export function extractDataSourcePills(
  ai: Record<string, unknown>,
  mergedData?: Record<string, unknown> | null,
  analysisMetadata?: Record<string, unknown> | null,
): string[] {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const comparables = Array.isArray(meta.comparables) ? meta.comparables.length : 0;
  const relax = Number(meta.conditionRelaxLevel) || 0;
  const area = Number(meta.targetArea) || 0;
  const method = String(meta.method || '공시지가배율').slice(0, 20);

  return [
    `분석: ${method}`,
    `비교사례 ${comparables}건`,
    meta.confidenceGrade ? `신뢰 ${meta.confidenceGrade}` : '',
    relax > 0 ? `Level ${relax}` : '',
    area > 0 ? `대지 ${area.toFixed(1)}㎡` : '',
  ].filter(Boolean);
}
