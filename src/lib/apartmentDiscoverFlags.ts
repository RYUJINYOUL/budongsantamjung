/**
 * Phase C+ / Phase 3+ — 서버 discover (단일 SQL, ~70ms prod).
 * false → 아파트 탭·전체 탭 아파트 모두 timeline 아파트 경로로 롤백.
 */
export const USE_SERVER_APARTMENT_DISCOVER = true;

/** discover API 사용: 아파트 전용 탭 또는 전체 탭(아파트만 discover, 그 외 timeline) */
export function useServerApartmentDiscoverForCategory(category: string): boolean {
  if (!USE_SERVER_APARTMENT_DISCOVER) return false;
  return category === '아파트' || category === 'all';
}
