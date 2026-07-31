/** `apartmentDiscoverFilters.ts` HEATING_OPTIONS 와 동기 */
export const HEATING_FILTER_OPTIONS = ['지역난방', '개별난방', '중앙난방'] as const;

export type HeatingFilterOption = (typeof HEATING_FILTER_OPTIONS)[number];

/** 백엔드 apartmentHeatingType.js 와 동일 규칙 */
export function normalizeHeatingType(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).replace(/\s/g, '');

  for (const c of HEATING_FILTER_OPTIONS) {
    if (s === c || s.includes(c)) return c;
  }

  if (/지역|열공급|DH|district/i.test(s)) return '지역난방';
  if (/중앙/.test(s)) return '중앙난방';
  if (/개별|개별냉난방|도시가스|LPG|벽난|전기|심야|기름|연료/i.test(s)) return '개별난방';

  return String(raw).trim() || null;
}

export function heatingMatchesFilter(
  rawValue: string | null | undefined,
  selectedTypes: string[],
): boolean {
  if (!selectedTypes.length) return true;
  const canon = normalizeHeatingType(rawValue);
  /** NULL/미등록 = 모름 → 제외하지 않음 */
  if (!canon) return true;
  return selectedTypes.some((t) => {
    const sel = normalizeHeatingType(t);
    return sel === canon || canon.includes(t) || (sel != null && canon.includes(sel));
  });
}
