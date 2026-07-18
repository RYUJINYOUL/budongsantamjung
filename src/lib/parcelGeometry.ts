export type LatLngPoint = { lat: number; lng: number };

function ringToPoints(ring: unknown): LatLngPoint[] {
  if (!Array.isArray(ring)) return [];
  const points: LatLngPoint[] = [];
  for (const coord of ring) {
    if (!Array.isArray(coord) || coord.length < 2) continue;
    const lng = Number(coord[0]);
    const lat = Number(coord[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    // 한국 좌표 범위 밖이면 lat/lng 뒤바뀐 경우 보정
    if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
      points.push({ lat: lng, lng: lat });
    } else {
      points.push({ lat, lng });
    }
  }
  return points;
}

/** VWorld GeoJSON geometry → 필지 외곽 폴리곤 */
export function parseParcelPolygon(geometry: unknown): LatLngPoint[] | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as { type?: string; coordinates?: unknown };
  const { type, coordinates } = g;

  if (type === 'Polygon' && Array.isArray(coordinates) && coordinates.length > 0) {
    const points = ringToPoints(coordinates[0]);
    return points.length >= 3 ? points : null;
  }

  if (type === 'MultiPolygon' && Array.isArray(coordinates)) {
    let best: LatLngPoint[] | null = null;
    for (const poly of coordinates) {
      if (!Array.isArray(poly) || poly.length === 0) continue;
      const points = ringToPoints(poly[0]);
      if (points.length >= 3 && (!best || points.length > best.length)) {
        best = points;
      }
    }
    return best;
  }

  return null;
}

export function parseParcelPolygonFromVworldResponse(data: unknown): LatLngPoint[] | null {
  const feature = (data as { response?: { result?: { featureCollection?: { features?: unknown[] } } } })
    ?.response?.result?.featureCollection?.features?.[0];
  if (!feature || typeof feature !== 'object') return null;
  return parseParcelPolygon((feature as { geometry?: unknown }).geometry);
}
