/** /recom 페이지 필터 상태 */
export type RecomTab = 'apartment' | 'reports';

export type RecomApartmentFilters = {
  minRiseRate1y: boolean;
  minRiseRate3y: boolean;
  minRiseRate5y: boolean;
  minRiseRate10y: boolean;
};

export type RecomReportFilters = {
  minAiScore: 70;
  category: '전체' | '토지' | '빌딩' | '주택' | '상가';
};

export const RECOM_REPORT_CATEGORIES = ['전체', '토지', '빌딩', '주택', '상가'] as const;

export function defaultRecomApartmentFilters(): RecomApartmentFilters {
  return {
    minRiseRate1y: false,
    minRiseRate3y: false,
    minRiseRate5y: false,
    minRiseRate10y: false,
  };
}

export function defaultRecomReportFilters(): RecomReportFilters {
  return { minAiScore: 70, category: '전체' };
}

export function apartmentFiltersToParams(f: RecomApartmentFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.minRiseRate1y) params.set('minRiseRate1y', '1');
  if (f.minRiseRate3y) params.set('minRiseRate3y', '1');
  if (f.minRiseRate10y) params.set('minRiseRate10y', '1');
  if (f.minRiseRate5y) params.set('minRiseRate5y', '1');
  return params;
}

export function reportFiltersToParams(f: RecomReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set('minAiScore', '70');
  if (f.category !== '전체') params.set('category', f.category);
  return params;
}

export function toggleRecomRise1y(f: RecomApartmentFilters): RecomApartmentFilters {
  return { ...f, minRiseRate1y: !f.minRiseRate1y };
}

export function toggleRecomRise3y(f: RecomApartmentFilters): RecomApartmentFilters {
  return { ...f, minRiseRate3y: !f.minRiseRate3y };
}

export function toggleRecomRise10y(f: RecomApartmentFilters): RecomApartmentFilters {
  return { ...f, minRiseRate10y: !f.minRiseRate10y };
}

export function toggleRecomRise5y(f: RecomApartmentFilters): RecomApartmentFilters {
  return { ...f, minRiseRate5y: !f.minRiseRate5y };
}

export function clearRecomRiseFilters(f: RecomApartmentFilters): RecomApartmentFilters {
  return defaultRecomApartmentFilters();
}

export function isRecomRiseFilterActive(f: RecomApartmentFilters): boolean {
  return f.minRiseRate1y || f.minRiseRate3y || f.minRiseRate10y || f.minRiseRate5y;
}

export function formatRiseRatePct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '-';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}
