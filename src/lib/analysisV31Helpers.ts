/** v3.1 개별분석 UI — 공통 헬퍼 */

export function formatEokCompact(won: number): string {
  const n = Math.round(Number(won) || 0);
  if (n <= 0) return '0';
  const eok = Math.floor(n / 100_000_000);
  const man = Math.round((n % 100_000_000) / 10_000);
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만`;
  if (eok > 0) return `${eok}억`;
  if (man > 0) return `${man.toLocaleString()}만`;
  return `${Math.round(n / 10_000).toLocaleString()}만`;
}

export function formatSqmManwon(wonPerSqm: number): string {
  if (!wonPerSqm || wonPerSqm <= 0) return '-';
  const man = wonPerSqm >= 10000 ? wonPerSqm / 10000 : wonPerSqm;
  return `${Math.round(man).toLocaleString()}만/㎡`;
}

export function parseWonFromText(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw > 1_000_000 ? raw : raw * 10_000;
  }
  const s = String(raw).replace(/,/g, '').trim();
  const eokMatch = s.match(/([\d.]+)\s*억/);
  const manMatch = s.match(/([\d,]+)\s*만/);
  let won = 0;
  if (eokMatch) won += Math.round(parseFloat(eokMatch[1]) * 100_000_000);
  if (manMatch) won += Math.round(parseFloat(manMatch[1].replace(/,/g, '')) * 10_000);
  if (won > 0) return won;
  const num = parseFloat(s.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num > 1_000_000 ? num : num * 10_000;
}

export function resolveUserPriceWon(
  meta: Record<string, unknown> | null | undefined,
  mergedData?: Record<string, unknown> | null,
): number {
  const m = meta || {};
  if (Number(m.userPriceWon) > 0) return Number(m.userPriceWon);
  const raw = mergedData?.price ?? mergedData?.sale_price;
  if (raw == null || raw === '') return 0;
  const num = Number(String(raw).replace(/,/g, '')) || 0;
  return num > 1_000_000 ? num : num * 10_000;
}

export function getTargetArea(
  meta: Record<string, unknown> | null | undefined,
  mergedData?: Record<string, unknown> | null,
  category = 'land',
): number {
  const m = meta || {};
  const cat = String(category || 'land').toLowerCase();
  const direct = m.targetArea != null ? parseFloat(String(m.targetArea)) : NaN;
  if (Number.isFinite(direct) && direct > 0) return direct;

  const t = (m.target || {}) as Record<string, unknown>;
  if (cat === 'building' || cat === 'store') {
    return parseFloat(String(t.totalArea_sqm || mergedData?.totalArea_sqm || t.area_sqm || mergedData?.area || '0')) || 0;
  }
  return parseFloat(String(
    t.area_sqm || t.exclusiveArea_sqm || (t.land as Record<string, unknown> | undefined)?.area_sqm
    || mergedData?.area || mergedData?.exclusiveArea_sqm || mergedData?.area_sqm || '0',
  )) || 0;
}

function comparableAdjTotals(comparables: unknown[], targetArea: number): number[] {
  if (!Array.isArray(comparables) || targetArea <= 0) return [];
  return comparables.map((c) => {
    const row = c as Record<string, unknown>;
    const dealAmount = row.dealAmount ?? row.price;
    let dealWon = 0;
    if (typeof dealAmount === 'number') dealWon = dealAmount;
    else if (typeof dealAmount === 'string') {
      const parsed = parseFloat(dealAmount.replace(/,/g, ''));
      if (Number.isFinite(parsed)) dealWon = parsed;
    }
    const area = Number(row.area || row.plottageAr || row.excluUseAr || row.buildingAr) || 0;
    const rawSqm = Number(row.pricePerSqm) || (dealWon > 0 && area > 0 ? dealWon / area : 0);
    const adjSqm = Number(row.adjustedPricePerSqm) || rawSqm;
    return adjSqm * targetArea;
  }).filter((v) => v > 0);
}

export function getScoreTierLabel(score: number): { label: string; tone: 'green' | 'blue' | 'amber' | 'red' } {
  if (score >= 80) return { label: '우수', tone: 'green' };
  if (score >= 60) return { label: '양호', tone: 'blue' };
  if (score >= 40) return { label: '보통', tone: 'amber' };
  return { label: '검토 필요', tone: 'red' };
}

export type EstimateRange = { min: number; max: number; source: string };

/** 동일수급권(cohort) 추정 총액 — 가격 SSOT */
export function resolveCohortEstimateTotal(
  meta: Record<string, unknown> | null | undefined,
  mergedData?: Record<string, unknown> | null,
  category = 'land',
): number {
  const m = meta || {};
  const cohortTotal = Number(m.cohortEstimatedTotal) || 0;
  if (cohortTotal > 0) return cohortTotal;

  const opr = m.officialPriceRatio as Record<string, unknown> | undefined;
  if (!isCohortOfficialPricing(m) || !opr) return 0;

  const estPrice = Number(opr.estimatedPrice) || 0;
  if (estPrice > 0) return estPrice;

  const estPerSqm = Number(opr.estimatedPerSqm) || 0;
  const targetArea = getTargetArea(m, mergedData, category);
  if (estPerSqm > 0 && targetArea > 0) return Math.round(estPerSqm * targetArea);

  return 0;
}

export function buildEstimateRangeLabel(source: string): string {
  if (source === 'cohort') return '동일수급권 추정가';
  if (source === 'comparables') return '비교사례 추정 범위';
  return 'AI 추정 범위';
}

export function isCohortOfficialPricing(
  analysisMetadata: Record<string, unknown> | null | undefined,
): boolean {
  const opr = (analysisMetadata || {}).officialPriceRatio as Record<string, unknown> | undefined;
  return !!opr && ['cohort', 'cohort_relaxed'].includes(String(opr.dynamicStatus || ''));
}

export function buildPriceRangeCaption(
  meta: Record<string, unknown>,
  priceReas: Record<string, unknown> = {},
): string {
  const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
  const obsRatio = opr?.observedRatio as Record<string, unknown> | undefined;
  const cohort = isCohortOfficialPricing(meta);
  const confidenceGrade = String(
    meta.confidenceGrade || obsRatio?.confidenceGrade || priceReas.reliabilityGrade || '',
  ).trim();
  if (cohort) {
    return [
      '동일수급권 median',
      Number(opr?.appliedMultiplier) > 0 ? `${Number(opr?.appliedMultiplier).toFixed(1)}배` : null,
      confidenceGrade ? `신뢰 ${confidenceGrade}` : '',
    ].filter(Boolean).join(' · ');
  }
  return [
    '공시지가 배율',
    confidenceGrade ? `신뢰 ${confidenceGrade}` : '',
  ].filter(Boolean).join(' · ');
}

export function buildComparableSub(meta: Record<string, unknown>): string {
  const searchRadius = Number(meta.searchRadiusM ?? meta.comparableRadiusM ?? 1000);
  const totalDetected = Number(meta.totalDetected ?? 0);
  const relax = Number(meta.conditionRelaxLevel) || 0;
  return [
    searchRadius >= 1000 ? `${Math.round(searchRadius / 1000)}km` : `${searchRadius}m`,
    totalDetected > 0 ? `${totalDetected}건 탐지` : null,
    relax > 0 ? `L${relax}` : null,
  ].filter(Boolean).join(' · ');
}

function scoreItemRaw(item: unknown): number | null {
  if (item == null) return null;
  if (typeof item === 'number') return item;
  if (typeof item === 'object') {
    const s = Number((item as Record<string, unknown>).score);
    return Number.isFinite(s) ? s : null;
  }
  return null;
}

export function resolveEstimateRange(
  analysisMetadata: Record<string, unknown> | null | undefined,
  priceReas: Record<string, unknown> | null | undefined,
  mergedData?: Record<string, unknown> | null,
  category = 'land',
): EstimateRange {
  const meta = analysisMetadata || {};
  const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
  const targetArea = getTargetArea(meta, mergedData, category);
  const buildingWon = Number(meta.buildingResidualValue) || 0;

  let min = 0;
  let max = 0;
  let source = '';

  const cohortTotal = resolveCohortEstimateTotal(meta, mergedData, category);
  if (cohortTotal > 0) {
    min = max = cohortTotal;
    source = 'cohort';
  }

  const totals = comparableAdjTotals(comparables, targetArea);
  if (min <= 0 && totals.length > 0) {
    min = Math.min(...totals);
    max = Math.max(...totals);
    source = 'comparables';
  }

  const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
  if (min <= 0 && isCohortOfficialPricing(meta) && opr) {
    const estPrice = Number(opr.estimatedPrice) || 0;
    const estPerSqm = Number(opr.estimatedPerSqm) || 0;
    if (estPrice > 0) {
      min = max = estPrice;
      source = 'cohort';
    } else if (estPerSqm > 0 && targetArea > 0) {
      min = max = Math.round(estPerSqm * targetArea);
      source = 'cohort';
    }
  }

  const attached = meta.uiAttachedMultiplier as Record<string, unknown> | undefined;
  if (min <= 0 && attached) {
    const midTotal = Number(attached.midTotal) || 0;
    if (midTotal > 0) {
      min = max = midTotal;
      source = 'uiAttachedMultiplier';
    } else {
      min = Number(attached.minTotal) || 0;
      max = Number(attached.maxTotal) || min;
      if (min > 0) source = 'uiAttachedMultiplier';
    }
  }

  if (min <= 0 && opr) {
    const estPerSqm = Number(opr.estimatedPerSqm) || 0;
    const estPrice = Number(opr.estimatedPrice) || 0;
    if (estPerSqm > 0 && targetArea > 0) {
      min = max = Math.round(estPerSqm * targetArea);
      source = 'officialPriceRatio';
    } else if (estPrice > 0) {
      min = max = estPrice;
      source = 'officialPriceRatio';
    }
  }

  const spectrum = (priceReas?.priceSpectrum || {}) as Record<string, unknown>;
  if (min <= 0) {
    const sMin = parseWonFromText(spectrum.min);
    const sMax = parseWonFromText(spectrum.max);
    if (sMin > 0 || sMax > 0) {
      min = sMin || sMax;
      max = sMax || sMin;
      source = 'priceSpectrum';
    }
  }

  if (min <= 0 && Number(meta.estimatedTotalPrice) > 0) {
    min = max = Number(meta.estimatedTotalPrice);
    source = 'estimatedTotalPrice';
  }

  if (buildingWon > 0 && min > 0) {
    min += buildingWon;
    max += buildingWon;
  }

  return { min, max, source };
}

/** @deprecated resolveEstimateRange 사용 권장 */
export function computePriceSimulationRange(
  analysisMetadata: Record<string, unknown> | null | undefined,
  priceReas: Record<string, unknown> | null | undefined,
): { min: number; max: number } {
  const { min, max } = resolveEstimateRange(analysisMetadata, priceReas);
  return { min, max };
}

export function priceBarMarkerPercent(
  userPriceWon: number,
  min: number,
  max: number,
): number {
  if (userPriceWon <= 0 || max <= min) return 50;
  const t = (userPriceWon - min) / (max - min);
  return Math.max(3, Math.min(97, Math.round(t * 100)));
}

export function extractVerdictLabel(finalVerdict: unknown): string | null {
  const badge = extractVerdictBadge(finalVerdict);
  return badge?.label || null;
}

export function extractVerdictBadge(finalVerdict: unknown): { label: string; tone: 'green' | 'blue' | 'amber' | 'red' } | null {
  if (!finalVerdict) return null;
  if (typeof finalVerdict === 'string') {
    const s = finalVerdict.trim().slice(0, 20);
    return s ? { label: s, tone: 'blue' } : null;
  }
  if (typeof finalVerdict === 'object' && finalVerdict !== null) {
    const v = finalVerdict as Record<string, unknown>;
    const verdict = String(v.verdict || v.verdic || '').trim();
    const grade = String(v.investmentGrade || '').trim();
    const label = verdict && grade ? `${verdict} ${grade}` : (verdict || grade);
    if (!label) return null;
    let tone: 'green' | 'blue' | 'amber' | 'red' = 'blue';
    if (/매수|buy/i.test(verdict) && /^A$/i.test(grade)) tone = 'green';
    else if (/매수|buy/i.test(verdict)) tone = 'blue';
    else if (/매도|sell|회피|avoid/i.test(verdict)) tone = 'red';
    else if (/보류|hold|관망/i.test(verdict)) tone = 'amber';
    return { label: label.slice(0, 24), tone };
  }
  return null;
}

export function formatPricePositionLabel(
  userPriceWon: number,
  min: number,
  max: number,
): string {
  if (userPriceWon <= 0 || max <= 0) return '';
  if (userPriceWon < min) return '범위 하단 미달 · 가격 메리트 가능';
  if (userPriceWon > max) return '범위 상단 초과';
  if (max <= min) return '추정 범위 내';
  const pos = ((userPriceWon - min) / (max - min)) * 100;
  if (pos <= 35) return `범위 하단 (+${Math.round(100 - pos)}%) · 가격 메리트 가능`;
  if (pos >= 65) return '범위 상단';
  return '추정 범위 내';
}

export type PriceMethodCardData = {
  label: string;
  value: string;
  sub: string;
  badge?: string;
  muted?: boolean;
};

export function extractPriceMethods(
  analysisMetadata: Record<string, unknown> | null | undefined,
  priceReas: Record<string, unknown> | null | undefined,
  mergedData?: Record<string, unknown> | null,
  category = 'land',
): PriceMethodCardData[] {
  const meta = analysisMetadata || {};
  const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
  const targetArea = getTargetArea(meta, mergedData, category);
  const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
  const relaxLevel = Number(meta.conditionRelaxLevel) || 0;
  const method = String(meta.method || meta.conditionRelaxLabel || meta.tierLabel || '직접비교').slice(0, 40);
  const confidenceGrade = String(
    meta.confidenceGrade
    || ((opr?.observedRatio as Record<string, unknown> | undefined)?.confidenceGrade)
    || '',
  ).trim();
  const attached = meta.uiAttachedMultiplier as Record<string, unknown> | undefined;
  const cbd = meta.cbdMultiplierEstimate as Record<string, unknown> | undefined;
  const badge = confidenceGrade ? `신뢰 ${confidenceGrade}` : undefined;

  const totals = comparableAdjTotals(comparables, targetArea);
  const compMin = totals.length > 0 ? Math.min(...totals) : 0;
  const compMax = totals.length > 0 ? Math.max(...totals) : 0;
  const searchRadius = Number(opr?.searchRadius) || 0;
  const sampleCount = Number(opr?.sampleCount ?? meta.comparableCount) || 0;
  const detected = Number(meta.totalDetected ?? meta.detectedCount ?? sampleCount) || sampleCount;

  const comparableCard: PriceMethodCardData = {
    label: '실거래 비교',
    value: compMin > 0
      ? (compMin === compMax ? formatEokCompact(compMin) : `${formatEokCompact(compMin)}~${formatEokCompact(compMax)}`)
      : `산출 불가 · ${comparables.length}건`,
    sub: [
      searchRadius > 0 ? `${searchRadius}m` : null,
      detected > 0 ? `${detected}건 탐지` : null,
      `유효 ${comparables.length}건`,
      relaxLevel > 0 ? `L${relaxLevel}` : method,
    ].filter(Boolean).join(' · '),
    badge,
    muted: compMin <= 0,
  };

  let officialLabel = '공시지가 배율';
  let officialValue = '-';
  let officialSub = '';
  if (opr && (opr.dynamicStatus === 'cohort' || opr.dynamicStatus === 'cohort_relaxed')) {
    const mult = Number(opr.appliedMultiplier) || 0;
    const total = (Number(opr.estimatedPerSqm) || 0) * targetArea;
    officialLabel = mult > 0 ? `동일수급권 배율 (${mult.toFixed(1)}배)` : '동일수급권 배율';
    officialValue = total > 0 ? `약 ${formatEokCompact(total)}` : '-';
    officialSub = [
      opr.targetOfficialPerSqm ? `${formatSqmManwon(Number(opr.targetOfficialPerSqm))} × ${targetArea.toLocaleString()}㎡` : null,
      opr.estimatedPerPyeong ? `평당 ${Math.round(Number(opr.estimatedPerPyeong)).toLocaleString()}만` : null,
    ].filter(Boolean).join(' · ') || `표본 ${Number(opr.sampleCount) || 0}건`;
  } else if (attached && Number(attached.midTotal) > 0) {
    const midMult = Number(attached.midMult) || 0;
    officialLabel = midMult > 0 ? `공시지가 배율 (보수 ${midMult}배)` : '공시지가 배율';
    officialValue = `약 ${formatEokCompact(Number(attached.midTotal))}`;
    const perSqm = Number(cbd?.officialPerSqm) || Number(opr?.targetOfficialPerSqm) || 0;
    officialSub = [
      perSqm > 0 ? `${formatSqmManwon(perSqm)} × ${targetArea.toLocaleString()}㎡ × ${midMult}배` : null,
    ].filter(Boolean).join(' · ');
  } else if (opr && Number(opr.estimatedPrice) > 0) {
    officialValue = `약 ${formatEokCompact(Number(opr.estimatedPrice))}`;
    officialSub = opr.appliedMultiplier ? `적용 ${opr.appliedMultiplier}배 · ${Number(opr.sampleCount) || 0}건` : '';
  }

  const officialCard: PriceMethodCardData = {
    label: officialLabel,
    value: officialValue,
    sub: officialSub || (searchRadius > 0 ? `반경 ${searchRadius}m · ${sampleCount}건` : '보조 추정'),
    badge,
    muted: officialValue === '-',
  };

  return [comparableCard, officialCard];
}

function officialPerSqmFromMeta(meta: Record<string, unknown>): number {
  const cbd = meta.cbdMultiplierEstimate as Record<string, unknown> | undefined;
  if (Number(cbd?.officialPerSqm) > 0) return Number(cbd.officialPerSqm);
  const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
  if (Number(opr?.targetOfficialPerSqm) > 0) return Number(opr.targetOfficialPerSqm);
  const attached = meta.uiAttachedMultiplier as Record<string, unknown> | undefined;
  const midMult = Number(attached?.midMult) || Number(attached?.minMult) || 0;
  const midTotal = Number(attached?.midTotal) || Number(attached?.minTotal) || 0;
  const targetArea = getTargetArea(meta);
  if (midMult > 0 && midTotal > 0 && targetArea > 0) {
    return Math.round(midTotal / (midMult * targetArea));
  }
  return 0;
}

export type SummaryTag = { label: string; warn?: boolean };

export function extractSummaryTags(
  ai: Record<string, unknown>,
  analysisMetadata?: Record<string, unknown> | null,
): SummaryTag[] {
  const tags: SummaryTag[] = [];
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const compRisk = (ai['1_comprehensiveRisk'] || {}) as Record<string, unknown>;
  const inDepth = (ai['6_inDepthReport'] || ai['6_inDepthAnalysis'] || {}) as Record<string, unknown>;
  const landShape = ai['2_propertyAnalysis'] as Record<string, unknown> | undefined;

  const recon = inDepth.reconstruction || inDepth.investmentValue;
  if (recon && /재건축|노후|연한/.test(String(recon))) {
    tags.push({ label: '재건축·노후 검토' });
  }

  const shapeText = [
    landShape?.landShape,
    landShape?.roadAccess,
    landShape?.topography,
    compRisk.coreJudgement,
  ].filter(Boolean).join(' ');
  if (/정방|형상|소로|도로/.test(shapeText)) {
    const m = shapeText.match(/(정방형[^·,\s]{0,8}|소로[^·,\s]{0,8}|평지[^·,\s]{0,6})/);
    if (m) tags.push({ label: m[1].slice(0, 16) });
  }

  const devText = String(inDepth.outlook || landShape?.developmentPotential || '');
  const gapMatch = devText.match(/([\d,.]+)\s*%p/);
  if (gapMatch) tags.push({ label: `용적률 갭 +${gapMatch[1]}%p` });

  const scoreItems = compRisk.scoreItems as Record<string, unknown> | undefined;
  if (scoreItems) {
    const regulatory = scoreItems['규제·개발 전망']
      ?? scoreItems['규제 전망']
      ?? scoreItems.regulatoryOutlook;
    if (regulatory != null) {
      const rs = scoreItemRaw(regulatory);
      tags.push({
        label: '규제·개발 전망',
        warn: rs != null && rs <= 4,
      });
    }
    const zoning = scoreItems['현행 용도지역']
      ?? scoreItems['토지 이용 규제']
      ?? scoreItems.landRegulation;
    if (zoning != null) {
      const zs = scoreItemRaw(zoning);
      tags.push({
        label: '현행 용도지역',
        warn: zs != null && zs <= 4,
      });
    }
    Object.entries(scoreItems).forEach(([key, item]) => {
      if (['규제·개발 전망', '규제 전망', 'regulatoryOutlook', '현행 용도지역', '토지 이용 규제', 'landRegulation'].includes(key)) {
        return;
      }
      const reason = typeof item === 'object' && item ? String((item as Record<string, unknown>).reason || '') : '';
      if (/허가|비행|제한|명도|거래허가/.test(key + reason)) {
        tags.push({ label: SCORE_LABEL_MAP[key] || key.slice(0, 14), warn: true });
      }
    });
  }

  if (Number(meta.conditionRelaxLevel) >= 3) {
    tags.push({ label: `비교 완화 L${meta.conditionRelaxLevel}`, warn: true });
  }
  const grade = String(meta.confidenceGrade || '').trim();
  if (grade === 'C' || grade === 'D') {
    tags.push({ label: `신뢰 ${grade}`, warn: true });
  }
  if ((Array.isArray(meta.comparables) ? meta.comparables : []).length === 0) {
    tags.push({ label: '비교사례 부족', warn: true });
  }

  const seen = new Set<string>();
  return tags.filter((t) => {
    const k = t.label;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);
}

const SHORT_VERDICT_LABELS = [
  '매우 고평가', '매우 저평가', '고평가', '저평가',
  '적정 수준', '적정가', '적정',
  '선반영', '미반영', '주의', '위험', '적합',
];

export function extractShortPriceLabel(...sources: (string | undefined | null)[]): string | null {
  for (const raw of sources) {
    if (!raw) continue;
    const text = String(raw).trim();
    if (!text) continue;
    for (const label of SHORT_VERDICT_LABELS) {
      if (text.includes(label)) return label;
    }
    if (text.length <= 8 && !/[.!?]/.test(text)) return text;
  }
  return null;
}

export function getInlineBadgeStyle(label: string): {
  color: string;
  borderColor: string;
  backgroundColor: string;
} {
  if (label.includes('저평가') || label === '미반영') {
    return { color: '#10b981', borderColor: '#10b98144', backgroundColor: '#10b98114' };
  }
  if (label.includes('고평가') || label === '선반영') {
    return { color: '#f59e0b', borderColor: '#f59e0b44', backgroundColor: '#f59e0b14' };
  }
  if (label.includes('적정')) {
    return { color: '#94a3b8', borderColor: '#94a3b844', backgroundColor: '#94a3b814' };
  }
  if (label === '주의' || label === '위험') {
    return { color: '#f87171', borderColor: '#f8717144', backgroundColor: '#f8717114' };
  }
  const tier = getScoreTierLabel(0);
  const colorMap = { green: '#34d399', blue: '#0EA5E9', amber: '#fbbf24', red: '#f87171' };
  const color = colorMap[tier.tone];
  return { color, borderColor: `${color}44`, backgroundColor: `${color}14` };
}

export type SummaryJudgement = { text: string; warn?: boolean };

export function extractSummaryJudgements(
  ai: Record<string, unknown>,
  analysisMetadata: Record<string, unknown> | null | undefined,
  mergedData?: Record<string, unknown> | null,
  category: 'land' | 'building' = 'land',
): SummaryJudgement[] {
  const meta = analysisMetadata || (ai.analysisMetadata as Record<string, unknown>) || {};
  const priceReas = (ai['5_priceReasonableness'] || {}) as Record<string, unknown>;
  const compRisk = (ai['1_comprehensiveRisk'] || {}) as Record<string, unknown>;
  const landShape = (ai['2_propertyAnalysis'] || {}) as Record<string, unknown>;
  const inDepth = (ai['7_inDepthReport'] || ai['6_inDepthReport'] || {}) as Record<string, unknown>;
  const items: SummaryJudgement[] = [];

  const devBits = [
    landShape.landUseZone,
    landShape.developmentPotential,
    inDepth.outlook,
    inDepth.developmentUtility,
  ].filter(Boolean).map(String);
  const devLine = devBits.find((t) => t.length > 12 && t.length < 140);
  if (devLine) items.push({ text: devLine.slice(0, 140) });

  const userPriceWon = resolveUserPriceWon(meta, mergedData);
  const { min, max, source } = resolveEstimateRange(meta, priceReas, mergedData, category);
  if (userPriceWon > 0 && (min > 0 || max > 0)) {
    const pos = formatPricePositionLabel(userPriceWon, min, max);
    const rangeStr = min === max
      ? formatEokCompact(min)
      : `${formatEokCompact(min)}~${formatEokCompact(max)}`;
    const rangeLabel = source === 'cohort' ? '동일수급권 추정' : '추정';
    items.push({
      text: `제시가 ${formatEokCompact(userPriceWon)} · ${rangeLabel} ${rangeStr}${pos ? ` · ${pos}` : ''}`,
      warn: userPriceWon > max,
    });
  }

  const attached = meta.uiAttachedMultiplier as Record<string, unknown> | undefined;
  const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
  const midTotal = Number(attached?.midTotal) || Number(opr?.estimatedPrice) || 0;
  const midMult = attached?.midMult;
  if (midTotal > 0 && source !== 'cohort') {
    items.push({
      text: `보수적 배율${midMult ? ` ${midMult}배` : ''} 추정 약 ${formatEokCompact(midTotal)}`,
    });
  }

  const comparables = Array.isArray(meta.comparables) ? meta.comparables : [];
  const grade = String(meta.confidenceGrade || priceReas.reliabilityGrade || '').trim();
  if (comparables.length === 0) {
    items.push({
      text: `비교사례 ${comparables.length}건 — 공시지가·배율법 중심${grade ? ` (신뢰 ${grade})` : ''}`,
      warn: true,
    });
  } else if (grade === 'C' || grade === 'D') {
    items.push({ text: `신뢰도 ${grade}등급 · 현장·서류 확인 권장`, warn: true });
  }

  const scoreItems = compRisk.scoreItems as Record<string, unknown> | undefined;
  if (scoreItems) {
    Object.entries(scoreItems).forEach(([key, raw]) => {
      const row = raw as Record<string, unknown> | number;
      const score = typeof row === 'number' ? row : Number(row?.score);
      const reason = typeof row === 'object' && row ? String(row.reason || '') : '';
      if (!Number.isFinite(score) || score > 4) return;
      if (!/허가|규제|비행|제한|명도|거래허가/.test(key + reason)) return;
      const label = SCORE_LABEL_MAP[key] || key;
      items.push({ text: `${label} · ${reason.slice(0, 80) || '현장 확인 필요'}`, warn: true });
    });
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    const k = item.text.slice(0, 48);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 6);
}

export const SCORE_LABEL_MAP: Record<string, string> = {
  nearbySales: '주변 거래',
  tradeVolume: '거래량',
  amenities: '편의시설',
  regulatoryOutlook: '규제·개발 전망',
  population: '인구',
  landRegulation: '용도지역',
  landShape: '형상',
  buildingAgePhoto: '건물 노후도(사진)',
  buildingAgeRegister: '건물 노후도(대장)',
  rentProfitability: '임대 수익성',
  '가격 적정성': '가격 적정성',
  '시장 대비 제시가': '가격 적정성',
  '규제·개발 전망': '규제·개발 전망',
  '현행 용도지역': '용도지역',
  '도로접면': '도로',
  '인근 실거래가': '주변 거래',
};

export function v31ShouldHideScoreItem(keyOrLabel: string, category: string): boolean {
  const lower = keyOrLabel.toLowerCase().replace(/\s+/g, '');
  const cat = (category || 'land').toLowerCase().trim();
  const isLand = cat === 'land' || cat === '토지';

  if (lower.includes('buildingagephoto') || lower.includes('건물노후도(사진)')) return true;
  if (isLand) {
    if (/노후|임대|수익|건물노후|하자|rental|yield|defect/.test(lower)) return true;
  }
  return false;
}

export type V31NavItem = { id: string; label: string };

export const LAND_V31_NAV: V31NavItem[] = [
  { id: 'analysis-v31-price', label: '01 가격분석' },
  { id: 'analysis-v31-development', label: '02 개발가능성' },
  { id: 'analysis-v31-benefit', label: '03 호재·미래가치' },
  { id: 'analysis-v31-market', label: '04 지역시장' },
  { id: 'analysis-v31-risk', label: '05 리스크' },
];

export const BUILDING_V31_NAV: V31NavItem[] = [
  { id: 'analysis-v31-price', label: '01 가격·수익' },
  { id: 'analysis-v31-development', label: '02 자산·개발' },
  { id: 'analysis-v31-benefit', label: '03 호재·미래' },
  { id: 'analysis-v31-market', label: '04 지역시장' },
  { id: 'analysis-v31-risk', label: '05 리스크' },
];

export type V31SectionMeta = { number: string; title: string; description: string };

export const LAND_V31_SECTIONS: Record<'development' | 'benefit' | 'market', V31SectionMeta> = {
  development: {
    number: '02',
    title: '개발가능성',
    description: '용적률 갭 · 재건축 · 토지 형상 · 용도변경 이력',
  },
  benefit: {
    number: '03',
    title: '호재 · 미래가치',
    description: '직접수혜 / 간접 / 규제주의 구분 · 6개월~중기 전망',
  },
  market: {
    number: '04',
    title: '지역시장 · 거시',
    description: '거래량 · 필지수 · 미분양 · 금리 · M2 · CSI · 공사비 · 허가 · 착공',
  },
};

export const BUILDING_V31_SECTIONS: Record<'development' | 'benefit' | 'market', V31SectionMeta> = {
  development: {
    number: '02',
    title: '자산·개발',
    description: '용적률 · 노후 · 임대 · 개발 잠재',
  },
  benefit: {
    number: '03',
    title: '호재·미래',
    description: '임대·재건축 · 지역 전망 · 투자 관점',
  },
  market: {
    number: '04',
    title: '지역시장',
    description: '거래량 · 상권 · 실거래 비교',
  },
};

export function getV31SectionMeta(
  section: 'development' | 'benefit' | 'market',
  category: 'land' | 'building',
): V31SectionMeta {
  return category === 'building' ? BUILDING_V31_SECTIONS[section] : LAND_V31_SECTIONS[section];
}

export function computeLedgerFactorProduct(meta: Record<string, unknown> | null | undefined): number {
  const m = meta || {};
  const comparables = Array.isArray(m.comparables) ? m.comparables : [];
  let avgTimeFactor = 1;
  if (comparables.length > 0) {
    const sum = comparables.reduce((acc, curr) => {
      const c = curr as Record<string, unknown>;
      return acc + (Number(c.timeAdjFactor) || 1);
    }, 0);
    avgTimeFactor = sum / comparables.length;
  }

  const keys = ['areaAdjustment', 'zoningAdjustment', 'roadAdjustment', 'stationPremium', 'hosaeAdjustment'];
  let product = avgTimeFactor;
  keys.forEach((k) => {
    const adj = m[k] as Record<string, unknown> | undefined;
    const f = Number(adj?.factor ?? adj?.multiplier ?? 1);
    if (Number.isFinite(f) && f > 0) product *= f;
  });
  return product;
}

export type LedgerFactorItem = {
  index: string;
  label: string;
  factor: number;
  reason: string;
};

function ledgerAdjFactor(adj: Record<string, unknown> | undefined): number {
  const f = Number(adj?.factor ?? adj?.multiplier ?? 1);
  return Number.isFinite(f) && f > 0 ? f : 1;
}

export function extractLedgerFactorItems(
  meta: Record<string, unknown> | null | undefined,
  category: 'land' | 'building' = 'land',
): LedgerFactorItem[] {
  const m = meta || {};
  const comparables = Array.isArray(m.comparables) ? m.comparables : [];
  const areaAdj = (m.areaAdjustment || {}) as Record<string, unknown>;
  const zoningAdj = (m.zoningAdjustment || {}) as Record<string, unknown>;
  const roadAdj = (m.roadAdjustment || {}) as Record<string, unknown>;
  const stationAdj = (m.stationPremium || {}) as Record<string, unknown>;
  const hosaeAdj = (m.hosaeAdjustment || {}) as Record<string, unknown>;
  const buildYearAdj = (m.buildYearAdjustment || {}) as Record<string, unknown>;

  let avgTimeFactor = 1;
  if (comparables.length > 0) {
    const sum = comparables.reduce((acc, curr) => {
      const c = curr as Record<string, unknown>;
      return acc + (Number(c.timeAdjFactor) || 1);
    }, 0);
    avgTimeFactor = sum / comparables.length;
  }

  const isLand = category === 'land';
  const items: LedgerFactorItem[] = [];
  let step = 1;
  const nextIndex = () => {
    const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];
    return circled[step++ - 1] || `${step - 1}`;
  };

  const targetArea = areaAdj.targetArea ?? m.targetArea;
  items.push({
    index: nextIndex(),
    label: '면적 보정 (Area)',
    factor: ledgerAdjFactor(areaAdj),
    reason: areaAdj.applied
      ? String(areaAdj.reason || `대상(${targetArea}㎡) vs 사례평균(${areaAdj.avgComparableArea}㎡) 격차 보정`)
      : `비교 사례와 대지 규모 유사 — 보정 없음${targetArea ? `. 대상 ${targetArea}㎡` : ''}.`,
  });

  if (isLand) {
    items.push({
      index: nextIndex(),
      label: '용도 보정 (Zoning)',
      factor: ledgerAdjFactor(zoningAdj),
      reason: zoningAdj.applied
        ? String(zoningAdj.reason || `${zoningAdj.targetZoning} vs ${zoningAdj.avgComparableRank}등급`)
        : `${zoningAdj.targetZoning || '동일 용도지역'} — 유효 비교 ${comparables.length}건${comparables.length === 0 ? '으로 참조용' : ''}.`,
    });
    items.push({
      index: nextIndex(),
      label: '도로 보정 (Road)',
      factor: ledgerAdjFactor(roadAdj),
      reason: roadAdj.applied
        ? String(roadAdj.reason || `${roadAdj.name || ''} (${roadAdj.status || ''})`)
        : `${roadAdj.name || '도로 접면'} · 비교 사례 ${comparables.length === 0 ? '부재로 보정 미적용' : '유사'}.`,
    });
  } else if (buildYearAdj && Object.keys(buildYearAdj).length > 0) {
    items.push({
      index: nextIndex(),
      label: '건축연도 보정 (Build Year)',
      factor: ledgerAdjFactor(buildYearAdj),
      reason: buildYearAdj.applied
        ? String(buildYearAdj.reason || `대상 ${buildYearAdj.targetAge}년 vs 사례 ${buildYearAdj.avgComparableAge}년`)
        : String(buildYearAdj.reason || '건축연도 차이 미미 — 보정 없음'),
    });
  }

  items.push({
    index: nextIndex(),
    label: '역세권 (Station)',
    factor: ledgerAdjFactor(stationAdj),
    reason: stationAdj.applied
      ? String(stationAdj.reason || `${stationAdj.stationName || ''} ${stationAdj.distance || 0}m (${stationAdj.label || ''})`)
      : '역세권 500m 외 — 프리미엄 없음.',
  });

  items.push({
    index: nextIndex(),
    label: '시점 보정 (Time)',
    factor: avgTimeFactor,
    reason: comparables.length > 0
      ? '한국부동산원 지가변동률·거래월 시계열 반영.'
      : '한국부동산원 지가변동률·거래월 시계열 — 비교 0건으로 1.000.',
  });

  const hosaeDetails = Array.isArray(hosaeAdj.details) ? hosaeAdj.details : [];
  items.push({
    index: nextIndex(),
    label: '호재 (Hosae)',
    factor: hosaeAdj.applied ? ledgerAdjFactor(hosaeAdj) : 1,
    reason: hosaeDetails.length > 0
      ? (hosaeAdj.applied
        ? `호재 ${hosaeDetails.length}건 · 종합 전망점수 ${hosaeAdj.compositeScore ?? '-'}`
        : `호재 ${hosaeDetails.length}건 탐지 · 단가 보정 미적용 (참고 리스트만).`)
      : String(hosaeAdj.reason || '인근 호재 미감지 — 보정 없음'),
  });

  return items;
}

export function buildPriceLedgerRows(
  meta: Record<string, unknown> | null | undefined,
  priceReas: Record<string, unknown> | null | undefined,
): { label: string; value: string }[] {
  const m = meta || {};
  const comparables = Array.isArray(m.comparables) ? m.comparables : [];
  const opr = m.officialPriceRatio as Record<string, unknown> | undefined;
  const attached = m.uiAttachedMultiplier as Record<string, unknown> | undefined;
  const relax = Number(m.conditionRelaxLevel) || 0;
  const detected = Number(m.totalDetected ?? opr?.sampleCount) || 0;
  const searchRadius = Number(m.searchRadiusM ?? m.comparableRadiusM ?? 1000);

  let officialVal = '-';
  if (attached?.midTotal && attached?.midMult) {
    officialVal = `약 ${formatEokCompact(Number(attached.midTotal))} (${attached.midMult}배)`;
  } else if (attached?.midTotal) {
    officialVal = `약 ${formatEokCompact(Number(attached.midTotal))}`;
  } else if (opr?.estimatedPrice) {
    officialVal = `약 ${formatEokCompact(Number(opr.estimatedPrice))}`;
  }

  const factorProduct = computeLedgerFactorProduct(m);
  const confidence = [m.confidenceGrade, relax > 0 ? `Level ${relax}` : null].filter(Boolean).join(' · ') || '-';

  return [
    {
      label: '실거래 비교',
      value: `${comparables.length}건${searchRadius ? ` (${Math.round(searchRadius / 100) / 10}km)` : ''}`,
    },
    {
      label: '탐지 / 부합',
      value: detected > 0 ? `${detected}건 → ${comparables.length}건` : (comparables.length > 0 ? `${comparables.length}건` : '-'),
    },
    { label: '공시지가 배율', value: officialVal },
    { label: '6요인 보정', value: `합산 ${factorProduct.toFixed(3)}x` },
    { label: '신뢰도', value: confidence },
  ];
}

/** 제휴 금융사 계약 전까지 v3.1 대출 상담 CTA 비노출 */
export const V31_SHOW_FINANCE_PARTNER_CTA = false;

export function isApartmentAnalysisCategory(
  category?: string,
  mergedData?: Record<string, unknown> | null,
): boolean {
  const cat = String(mergedData?.category || category || '').toLowerCase();
  return cat === 'apartment' || cat.includes('아파트');
}
