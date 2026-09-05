/**
 * Land / building score v2 weights — mirrors ddangpago-backend landScoreConfig.js
 * @see docs/LAND_SCORE_SYSTEM.md
 */

export const LAND_SCORE_WEIGHTS: Record<string, number> = {
  '가격 적정성': 30,
  '도로접면': 12,
  '규제·개발 전망': 12,
  '거래량': 10,
  '인구 현황': 10,
  '인근 실거래가': 6,
  '생활 편의시설': 10,
  '현행 용도지역': 5,
  '토지 형상': 5,
};

export const BUILDING_SCORE_WEIGHTS: Record<string, number> = {
  '가격 적정성': 24,
  '도로접면': 10,
  '규제·개발 전망': 10,
  '거래량': 8,
  '인구 현황': 8,
  '인근 실거래가': 5,
  '생활 편의시설': 6,
  '현행 용도지역': 5,
  '토지 형상': 5,
  '건물 노후도(대장)': 9,
  '임대 수익성': 10,
};

/** scoreItems key → canonical weight key */
const SCORE_KEY_CANONICAL: Record<string, string> = {
  nearbySales: '인근 실거래가',
  tradeVolume: '거래량',
  amenities: '생활 편의시설',
  regulatoryOutlook: '규제·개발 전망',
  '규제 전망': '규제·개발 전망',
  population: '인구 현황',
  landRegulation: '현행 용도지역',
  '토지 이용 규제': '현행 용도지역',
  landShape: '토지 형상',
  '시장 대비 제시가': '가격 적정성',
  buildingAgeRegister: '건물 노후도(대장)',
  rentProfitability: '임대 수익성',
};

export function toCanonicalScoreKey(key: string): string {
  return SCORE_KEY_CANONICAL[key] || key;
}

export function getScoreWeightsForCategory(category: string): Record<string, number> | null {
  const cat = (category || 'land').toLowerCase().trim();
  if (cat === 'building' || cat === '빌딩') return BUILDING_SCORE_WEIGHTS;
  if (cat === 'land' || cat === '토지') return LAND_SCORE_WEIGHTS;
  return null;
}

export function usesWeightedScoreDisplay(category: string): boolean {
  return getScoreWeightsForCategory(category) !== null;
}

export function resolveScoreItemWeight(
  key: string,
  category: string,
  apiWeights?: Record<string, number> | null,
): number | null {
  const table = apiWeights && Object.keys(apiWeights).length > 0
    ? apiWeights
    : getScoreWeightsForCategory(category);
  if (!table) return null;
  const canonical = toCanonicalScoreKey(key);
  return table[canonical] ?? null;
}

/** raw 1~10 → weighted contribution (0~weight) */
export function toWeightedScore(rawScore: number, weight: number): number {
  if (!Number.isFinite(rawScore) || !Number.isFinite(weight) || weight <= 0) return 0;
  const clamped = Math.max(0, Math.min(10, rawScore));
  return Math.round((clamped / 10) * weight * 10) / 10;
}

export function formatWeightedScoreLabel(rawScore: number, weight: number): string {
  const pts = toWeightedScore(rawScore, weight);
  const display = Number.isInteger(pts) ? String(pts) : pts.toFixed(1);
  return `${display} / ${weight}점`;
}

/** Dedupe alias keys (규제 전망 + regulatoryOutlook → 규제·개발 전망 1줄) */
export function dedupeScoreItems<T>(
  scoreItems: Record<string, T>,
): Array<{ key: string; canonical: string; item: T }> {
  const best = new Map<string, { key: string; item: T; priority: number }>();

  for (const [key, item] of Object.entries(scoreItems)) {
    const canonical = toCanonicalScoreKey(key);
    const priority = key === canonical ? 3 : (/^[가-힣]/.test(key) ? 2 : 1);
    const prev = best.get(canonical);
    if (!prev || priority > prev.priority) {
      best.set(canonical, { key: canonical, item, priority });
    }
  }

  return Array.from(best.entries()).map(([canonical, { key, item }]) => ({
    key,
    canonical,
    item,
  }));
}
