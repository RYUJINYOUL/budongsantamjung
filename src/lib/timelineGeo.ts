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

export const DEFAULT_MAP_POSITION = {
  lat: 37.5665,
  lng: 126.9780,
  zoomLevel: 9,
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
