/** 카카오 LatLngBounds 중심 — 공식 API에 getCenter() 없음 */
export function centerFromKakaoBounds(
  bounds: {
    getSouthWest: () => { getLat: () => number; getLng: () => number };
    getNorthEast: () => { getLat: () => number; getLng: () => number };
  },
  LatLng: new (lat: number, lng: number) => unknown,
): unknown {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return new LatLng(
    (sw.getLat() + ne.getLat()) / 2,
    (sw.getLng() + ne.getLng()) / 2,
  );
}
