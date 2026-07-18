/** 지도 철도망 폴리라인·역 라벨 스타일 */
export const RAILWAY_MAP_STYLE = {
  lineColor: '#1a9ba8',
  lineWeight: 2.5,
  lineOpacity: 0.85,
  stationBg: '#4b5563',
  stationColor: '#ffffff',
} as const;

/** 한국 범위 내 유효한 철도 역 좌표만 허용 (null → 0,0 오매칭 방지) */
export function parseRailwayCoord(station: {
  lat: unknown;
  lng: unknown;
}): { lat: number; lng: number } | null {
  const lat = Number(station.lat);
  const lng = Number(station.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
  return { lat, lng };
}
