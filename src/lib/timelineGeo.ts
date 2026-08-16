/** Flutter timeline_provider / KakaoMapWidget 과 동일한 줌→반경(km) 매핑 */
const ZOOM_TO_RADIUS_KM: Record<number, number> = {
  1: 0.1,
  2: 0.25,
  3: 0.5,
  4: 1.0,
  5: 2.5,
  6: 5.0,
  7: 10.0,
  8: 25.0,
  9: 50.0,
  10: 100.0,
  11: 200.0,
  12: 400.0,
  13: 800.0,
  14: 1600.0,
};

export const TIMELINE_LIMIT = 100;

/** 홈 첫 진입 — 서울시청 기준 약 1km 반경 */
export const HOME_INITIAL_ZOOM_LEVEL = 4;

/** 장소·키워드 검색 이동 — 카카오 지도 화면 기준 약 50m */
export const SEARCH_NAVIGATION_ZOOM_LEVEL = 3;

export const DEFAULT_MAP_POSITION = {
  lat: 37.5665,
  lng: 126.9780,
  zoomLevel: HOME_INITIAL_ZOOM_LEVEL,
};

export function zoomLevelToRadiusKm(zoomLevel: number): number {
  const raw = ZOOM_TO_RADIUS_KM[zoomLevel] ?? 50.0;
  return Math.min(raw, 50.0);
}

export interface MapPosition {
  lat: number;
  lng: number;
  zoomLevel: number;
}
