/** 목록·장소 검색 — 단지명 정규화·매칭·거리 정렬 */

export type ListSearchAnchor = {
  lat: number;
  lng: number;
  label: string;
};

type GeoItem = {
  lat?: number | null;
  lng?: number | null;
  propertyTitle?: string | null;
  bldNm?: string | null;
  location?: { name?: string | null; address?: string | null } | null;
};

export function normalizeSearchLabel(text: string | undefined | null): string {
  return (text || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/아파트$/u, '')
    .toLowerCase();
}

export function haversineKm(
  a: { lat?: number | null; lng?: number | null },
  b: { lat: number; lng: number },
): number | null {
  const lat1 = a.lat;
  const lng1 = a.lng;
  if (
    lat1 == null || lng1 == null
    || !Number.isFinite(lat1) || !Number.isFinite(lng1)
  ) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - lat1);
  const dLng = toRad(b.lng - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1
    + Math.cos(toRad(lat1)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function searchableFields(item: GeoItem): string[] {
  return [
    item.propertyTitle,
    item.bldNm,
    item.location?.name,
    item.location?.address,
  ].filter((v): v is string => Boolean(v?.trim()));
}

/** 검색어 ↔ feed 단지명 — 양방향·아파트 접미사 무시 */
export function analysisMatchesListSearch(item: GeoItem, query: string): boolean {
  const qNorm = normalizeSearchLabel(query);
  if (!qNorm || qNorm.length < 2) return true;

  for (const field of searchableFields(item)) {
    const nNorm = normalizeSearchLabel(field);
    if (!nNorm) continue;
    if (nNorm.includes(qNorm) || qNorm.includes(nNorm)) return true;
  }
  return false;
}

function titleMatchScore(item: GeoItem, labelNorm: string): number {
  if (!labelNorm) return 0;
  let best = 0;
  for (const field of searchableFields(item)) {
    const nNorm = normalizeSearchLabel(field);
    if (!nNorm) continue;
    if (nNorm === labelNorm) return 3;
    if (nNorm.includes(labelNorm) || labelNorm.includes(nNorm)) {
      best = Math.max(best, 2);
    }
  }
  return best;
}

/** 장소 검색 좌표·이름 기준 feed에서 가장 가까운(이름 일치 우선) 단지 */
export function findBestAnalysisMatchForSearch<T extends GeoItem>(
  list: T[],
  anchor: ListSearchAnchor,
): T | null {
  const labelNorm = normalizeSearchLabel(anchor.label);
  let best: T | null = null;
  let bestScore = -1;
  let bestDist = Infinity;

  for (const item of list) {
    const titleScore = titleMatchScore(item, labelNorm);
    const dist = haversineKm(item, anchor);
    const distScore = dist != null && dist <= 0.5 ? 1 : 0;
    const score = titleScore > 0 ? titleScore : distScore;
    const sortDist = dist ?? Infinity;

    if (
      score > bestScore
      || (score === bestScore && sortDist < bestDist)
    ) {
      best = item;
      bestScore = score;
      bestDist = sortDist;
    }
  }

  if (best && (bestScore > 0 || bestDist <= 0.5)) return best;
  return null;
}

/** 검색 앵커 기준 — 이름 일치 우선, 그다음 거리 */
export function sortAnalysesForSearchAnchor<T extends GeoItem>(
  list: T[],
  anchor: ListSearchAnchor,
): T[] {
  const labelNorm = normalizeSearchLabel(anchor.label);
  return [...list].sort((a, b) => {
    const scoreA = titleMatchScore(a, labelNorm);
    const scoreB = titleMatchScore(b, labelNorm);
    if (scoreA !== scoreB) return scoreB - scoreA;

    const distA = haversineKm(a, anchor) ?? Infinity;
    const distB = haversineKm(b, anchor) ?? Infinity;
    return distA - distB;
  });
}
