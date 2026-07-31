import type { ApartmentDiscoverFilters } from './apartmentDiscoverFilters';

export const M2_PER_PYEONG = 3.3058;
export const PYEONG_FILTER_MAX = 40;

export function m2ToPyeong(m2: number): number {
  return m2 / M2_PER_PYEONG;
}

export function isPyeongFilterActive(f: Pick<ApartmentDiscoverFilters, 'pyeongMin' | 'pyeongMax'>): boolean {
  return f.pyeongMin > 0 || f.pyeongMax < PYEONG_FILTER_MAX;
}

export function areaInPyeongBand(m2: number, minPy: number, maxPy: number): boolean {
  const py = m2ToPyeong(m2);
  return py >= minPy && py <= maxPy;
}

/** 구간 안 평형 중 card API center(㎡) — 넓은 구간은 최고 평, 좁은 구간은 거래 많은 면적 */
export function pickRepresentativeAreaM2(
  areas: { exclusiveAreaM2: number; tradeCount6m: number }[],
  minPy: number,
  maxPy: number,
  reportAreaM2?: number | null,
): number | null {
  let candidates = areas.filter((a) => areaInPyeongBand(a.exclusiveAreaM2, minPy, maxPy));
  if (
    candidates.length === 0 &&
    reportAreaM2 != null &&
    reportAreaM2 > 0 &&
    areaInPyeongBand(reportAreaM2, minPy, maxPy)
  ) {
    candidates = [{ exclusiveAreaM2: reportAreaM2, tradeCount6m: 0 }];
  }
  if (candidates.length === 0) return null;

  const rangeWidth = maxPy - minPy;
  const preferHighest = rangeWidth >= 15 || maxPy >= PYEONG_FILTER_MAX;

  if (preferHighest) {
    return candidates.reduce(
      (best, a) => (a.exclusiveAreaM2 > best ? a.exclusiveAreaM2 : best),
      candidates[0].exclusiveAreaM2,
    );
  }

  candidates.sort(
    (a, b) => b.tradeCount6m - a.tradeCount6m || b.exclusiveAreaM2 - a.exclusiveAreaM2,
  );
  return candidates[0].exclusiveAreaM2;
}

export function formatPyeongFilterLabel(minPy: number, maxPy: number): string {
  if (!isPyeongFilterActive({ pyeongMin: minPy, pyeongMax: maxPy })) return '평형';
  if (minPy === maxPy) return `${minPy}평`;
  if (minPy <= 0 && maxPy < PYEONG_FILTER_MAX) return `~${maxPy}평`;
  if (maxPy >= PYEONG_FILTER_MAX) return `${minPy}평~`;
  return `${minPy}~${maxPy}평`;
}
