/**
 * 서버 discover API 클라이언트 (아파트 탭 · 전체 탭 아파트).
 */
import type { ApartmentDiscoverFilters } from './apartmentDiscoverFilters';
import type { ApartmentCardSnapshot } from './apartmentDiscoverFilters';

export type ApartmentDiscoverItem = {
  id: string;
  masterId?: string | null;
  aptSeq: string;
  rtmsAptSeq?: string | null;
  lat: number | null;
  lng: number | null;
  propertyTitle: string;
  /** r114 SSOT — Lite 패널 진입 키 */
  r114PropId?: string | null;
  /** 도로명·지번 주소 (있으면 카드 부제목에 사용) */
  address?: string | null;
  locationName?: string | null;
  category: string;
  avgPrice1m?: number | null;
  exclusiveArea?: number | null;
  area?: number | null;
  centerM2?: number | null;
  hasReport?: boolean;
  latestReportId?: string | null;
  aiScore?: number;
  aiAnalysisStatus?: string | null;
  createdAt?: string;
  propertyGrade?: { riskScore?: string; overall?: string; reason?: string };
  card: ApartmentCardSnapshot;
};

export function discoverFiltersToSearchParams(
  f: ApartmentDiscoverFilters,
  geo: { lat: number; lng: number; radiusKm: number },
  options?: { analyzedOnly?: boolean },
): URLSearchParams {
  const params = new URLSearchParams({
    limit: '50',
    lat: String(geo.lat),
    lng: String(geo.lng),
    radius: String(geo.radiusKm),
    pyeongMin: String(f.pyeongMin),
    pyeongMax: String(f.pyeongMax),
    priceMinEok: String(f.priceMinEok),
    priceMaxEok: String(f.priceMaxEok),
    sortBy: f.sortBy,
  });
  if (f.minJeonseRatePercent != null) params.set('minJeonseRatePercent', String(f.minJeonseRatePercent));
  if (f.maxJeonseRatePercent != null) params.set('maxJeonseRatePercent', String(f.maxJeonseRatePercent));
  if (f.minGapMan != null) params.set('minGapMan', String(f.minGapMan));
  if (f.maxGapMan != null) params.set('maxGapMan', String(f.maxGapMan));
  if (f.minHouseholds != null) params.set('minHouseholds', String(f.minHouseholds));
  if (f.maxBuildingAgeYears != null) params.set('maxBuildingAgeYears', String(f.maxBuildingAgeYears));
  if (f.minParkingPerHousehold != null) {
    params.set('minParkingPerHousehold', String(f.minParkingPerHousehold));
  }
  if (f.maxParkingPerHousehold != null) {
    params.set('maxParkingPerHousehold', String(f.maxParkingPerHousehold));
  }
  if (f.maxElementaryNavMinutes != null) {
    params.set('maxElementaryNavMinutes', String(f.maxElementaryNavMinutes));
  }
  if (f.entranceTypes.length) params.set('entranceTypes', f.entranceTypes.join(','));
  if (f.heatingTypes.length) params.set('heatingTypes', f.heatingTypes.join(','));
  if (options?.analyzedOnly !== false) {
    params.set('analyzedOnly', '1');
  }
  return params;
}

export async function fetchApartmentDiscover(
  filters: ApartmentDiscoverFilters,
  geo: { lat: number; lng: number; radiusKm: number },
  init?: RequestInit,
  options?: { analyzedOnly?: boolean },
): Promise<{ items: ApartmentDiscoverItem[]; meta?: { count?: number } }> {
  const params = discoverFiltersToSearchParams(filters, geo, options);
  const res = await fetch(`/api/land/detective/apartments/discover?${params.toString()}`, {
    ...init,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || '아파트 발견 데이터를 불러오지 못했습니다.');
  }
  return { items: data.items || [], meta: data.meta };
}
