import type { CompareScoringItem } from './apartmentCompareScoring';

/** compare 점수 신뢰에 쓰는 핵심 신호 (6개) */
const COVERAGE_SIGNAL_COUNT = 6;

export const COMPARE_COVERAGE_MIN = 0.5;

/**
 * scoring payload만으로 데이터 커버리지 추정 (0~1).
 * 3년/1년/6m 상승률 + 전세·안정·촉매 축 availability.
 */
export function computeCompareScoringCoverage(item: CompareScoringItem): number {
  let hit = 0;
  const parts = item.momentumBreakdown?.parts ?? [];

  for (const key of ['cagr3y', 'yoy1y', 'rise6m'] as const) {
    const p = parts.find((x) => x.key === key);
    if (p && !p.excluded && p.ratePercent != null && !Number.isNaN(p.ratePercent)) {
      hit += 1;
    }
  }

  for (const key of ['upside', 'stability', 'catalyst'] as const) {
    const v = item.axes?.[key];
    if (v != null && !Number.isNaN(v)) hit += 1;
  }

  return hit / COVERAGE_SIGNAL_COUNT;
}

export function isCompareScoringCoverageSufficient(item: CompareScoringItem): boolean {
  return computeCompareScoringCoverage(item) >= COMPARE_COVERAGE_MIN;
}
