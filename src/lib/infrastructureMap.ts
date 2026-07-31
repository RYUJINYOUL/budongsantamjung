/** 지도 infrastructure 레이어 스타일 */
export const INFRA_MAP_STYLE = {
  railway: {
    lineColor: '#1a9ba8',
    lineWeight: 3.5,
    lineOpacity: 0.9,
    pointBg: '#4b5563',
    pointColor: '#ffffff',
  },
  road: {
    lineColor: '#d97706',
    lineWeight: 2.5,
    lineOpacity: 0.8,
    pointBg: '#92400e',
    pointColor: '#ffffff',
  },
} as const;

export type InfraCategory = 'railway' | 'road' | 'construction';

export interface InfraCoordinate {
  lat: number;
  lng: number;
}

export interface InfraPolyline {
  coordinates?: InfraCoordinate[];
}

export interface InfraPoint {
  name?: string | null;
  lat: number;
  lng: number;
}

export interface InfraPolygon {
  rings?: InfraCoordinate[][];
}

export interface InfrastructureProject {
  id: number;
  hgnId: string;
  name: string;
  category: InfraCategory;
  polylines?: InfraPolyline[];
  points?: InfraPoint[];
  polygons?: InfraPolygon[];
}

export function parseInfraCoord(lat: unknown, lng: unknown): InfraCoordinate | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < 33 || la > 39 || ln < 124 || ln > 132) return null;
  return { lat: la, lng: ln };
}

export function isStationCodeName(name: string | null | undefined): boolean {
  if (!name) return true;
  return /^S\d+$/i.test(name.trim()) || /^\d{2,3}(-\d)?$/.test(name.trim());
}

export function toKakaoPath(
  kakao: any,
  coordinates: InfraCoordinate[]
): any[] {
  return coordinates
    .map((c) => parseInfraCoord(c.lat, c.lng))
    .filter(Boolean)
    .map((c) => new kakao.maps.LatLng(c!.lat, c!.lng));
}

export const INFRA_FOCUS_LEVEL = 4;
export const INFRA_OVERVIEW_MAX_LEVEL = 6;

export function getInfraLongestPath(
  kakao: any,
  item: InfrastructureProject
): any[] {
  let longestPath: any[] = [];
  for (const pl of item.polylines || []) {
    const path = toKakaoPath(kakao, pl.coordinates || []);
    if (path.length > longestPath.length) longestPath = path;
  }
  if (longestPath.length === 0 && (item.points?.length || 0) >= 2) {
    longestPath = (item.points || [])
      .map((p) => parseInfraCoord(p.lat, p.lng))
      .filter(Boolean)
      .map((c) => new kakao.maps.LatLng(c!.lat, c!.lng));
  }
  return longestPath;
}

export function getInfraStations(item: InfrastructureProject): InfraPoint[] {
  return (item.points || []).filter(
    (pt) => pt.name && !isStationCodeName(pt.name) && parseInfraCoord(pt.lat, pt.lng)
  );
}

export function getInfraTitle(item: InfrastructureProject, stationName?: string | null): string {
  if (stationName && stationName !== '전체') {
    const suffix = stationName.endsWith('역') ? stationName : `${stationName}역`;
    return `${item.name} ${suffix}`;
  }
  return item.name;
}

export const INFRA_CATEGORY_LABEL: Record<'railway' | 'road', string> = {
  railway: '철도·GTX',
  road: '고속도로·도로',
};
