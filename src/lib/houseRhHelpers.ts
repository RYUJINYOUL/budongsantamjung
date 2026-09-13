/** RH(연립·다세대 호) 단위 분석 여부 */
export function isRhUnitAnalysis(meta?: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  const houseTarget = meta.houseTarget as Record<string, unknown> | undefined;
  return meta.rhUnitMode === true || houseTarget?.isRhUnit === true;
}

/** RH 적산+비율 코호트 경로 여부 */
export function isRhCostApproach(meta?: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  return meta.tier === 'rh_unit_cost_ratio'
    || meta.rhDisplayMode === 'cost_ratio'
    || String(meta.method || '').includes('적산+비율');
}

/** RH 대지권·적산 metadata */
export function getRhCostApproachSummary(meta?: Record<string, unknown> | null) {
  if (!meta || !isRhCostApproach(meta)) return null;
  const landShareSqm = Number(meta.landShareSqm) || 0;
  const officialLandPerSqm = Number(meta.officialLandPerSqm) || 0;
  const landValueOfficial = Number(meta.landValueOfficial)
    || (landShareSqm > 0 && officialLandPerSqm > 0 ? Math.round(landShareSqm * officialLandPerSqm) : 0);
  const costApproachTotal = Number(meta.costApproachTotal) || 0;
  const costApproachRatio = Number(meta.costApproachRatio || meta.medianRatio) || 0;
  const marketComparablePrice = Number(meta.marketComparablePrice)
    || (costApproachTotal > 0 && costApproachRatio > 0 ? Math.round(costApproachTotal * costApproachRatio) : 0);
  return {
    landShareSqm,
    landShareSource: String(meta.landShareSource || ''),
    landShareNote: String(meta.landShareNote || ''),
    landValueOfficial,
    landValueEstimate: Number(meta.landValueEstimate) || 0,
    landMarketMultiplier: Number(meta.landMarketMultiplier) || 1,
    buildingCostEstimate: Number(meta.buildingCostEstimate) || 0,
    costApproachTotal,
    costApproachRatio,
    marketComparablePrice,
    estimatedTotalPrice: Number(meta.estimatedTotalPrice) || 0,
    estimatedPricePerSqm: Number(meta.estimatedPricePerSqm) || 0,
    platArea: Number(meta.platArea) || 0,
    officialLandPerSqm,
    confidenceGrade: String(meta.confidenceGrade || ''),
    ratioTierLabel: String(meta.ratioTierLabel || ''),
    comparableCount: Number(meta.comparableCount) || 0,
  };
}

/** RH 호 분석 대상 전용㎡ */
export function getRhTargetArea(meta?: Record<string, unknown> | null): number {
  if (!meta) return 0;
  const houseTarget = meta.houseTarget as Record<string, unknown> | undefined;
  const raw = meta.targetArea ?? houseTarget?.exclusiveArea ?? houseTarget?.exclusiveArea_sqm;
  const n = parseFloat(String(raw ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** RTMS 실거래 표시명 — 단독다가구 등 건물명 없을 때 지번 fallback */
export function formatRegionalTradeLabel(trade: Record<string, unknown>): string {
  const named = trade.aptNm || trade.mhouseNm || trade.offiNm || trade.roadNm;
  if (named) return String(named);
  const jibun = [trade.umdNm || trade.법정동, trade.jibun || trade.지번]
    .filter(Boolean)
    .join(' ');
  if (jibun) return jibun;
  return trade.sggNm ? String(trade.sggNm) : '미상 건물';
}
