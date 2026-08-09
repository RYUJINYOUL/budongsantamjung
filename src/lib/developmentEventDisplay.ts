/** development_events SSOT — UI 표시 그룹 (백엔드 developmentEventsConstants.js 와 동기) */

export const NON_HOAJAE_EVENT_CATEGORIES = new Set(['district']);

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  redevelopment: '재개발',
  maintenance: '재건축·정비',
  readjustment: '환경정비',
  scheduled_maintenance: '예정 정비',
  urban_development: '도시개발',
  tourist: '관광특구',
  industrial_complex: '산업단지',
  housing_land: '택지개발',
  public_housing: '공공주택',
  district: '지구단위계획',
  innovation: '혁신클러스터',
  infrastructure_construction: '인프라·개발',
  infrastructure_railway: '철도',
  infrastructure_road: '도로',
  unknown: '기타',
};

export type DevelopmentEventDisplayGroup = 'hoajae' | 'regulatory';

export function getEventDisplayGroup(eventCategory: string): DevelopmentEventDisplayGroup {
  return eventCategory === 'district' ? 'regulatory' : 'hoajae';
}

export function isHoajaeEligibleEvent(row: {
  event_category?: string;
  progress_status?: string;
  is_hoajae_eligible?: number | boolean;
} | null | undefined): boolean {
  if (!row) return false;
  if (NON_HOAJAE_EVENT_CATEGORIES.has(row.event_category || '')) return false;
  if (row.progress_status === 'completed') return false;
  return row.is_hoajae_eligible !== 0 && row.is_hoajae_eligible !== false;
}

/** 지구단위: 호재 카드가 아닌 규제·계획 섹션에 표시 */
export function isRegulatoryOnlyEvent(eventCategory: string): boolean {
  return getEventDisplayGroup(eventCategory) === 'regulatory';
}
