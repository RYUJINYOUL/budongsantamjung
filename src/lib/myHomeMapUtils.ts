import type { ApartmentDiscoverFilters } from './apartmentDiscoverFilters';
import { mapDiscoverItemsToFeed } from './apartmentDiscoverFeedMap';
import type { ApartmentDiscoverItem } from './fetchApartmentDiscover';
import { fetchApartmentDiscover } from './fetchApartmentDiscover';
import {
  fetchR114LiteDiscover,
  mapR114LiteDiscoverToFeedItem,
  mergeDiscoverWithR114Lite,
} from './fetchR114LiteDiscover';
import type { MapMarkerProperty } from './mapMarkers';

/** 홈 discover feed와 동일한 병합 행 */
export type MyHomeDiscoverFeedItem = {
  id: string;
  propertyTitle: string;
  lat?: number;
  lng?: number;
  masterId?: string;
  aptSeq?: string;
  rtmsAptSeq?: string;
  r114PropId?: string | null;
  exclusiveArea?: number | null;
  area?: number | null;
  centerM2?: number | null;
  hasReport?: boolean;
  latestReportId?: string | null;
  propertyGrade?: { riskScore?: string };
  location?: { address?: string; name?: string };
  category?: string;
};

/** 홈 `/` 아파트 탭과 동일 — discover + r114 Lite 병합 */
export async function fetchMergedApartmentDiscoverFeed(
  filters: ApartmentDiscoverFilters,
  geo: { lat: number; lng: number; radiusKm: number },
  init?: RequestInit,
): Promise<MyHomeDiscoverFeedItem[]> {
  const [discoverRes, liteRes] = await Promise.all([
    fetchApartmentDiscover(filters, geo, init),
    fetchR114LiteDiscover(geo, init, { limit: 50, filters }),
  ]);
  const { list } = mapDiscoverItemsToFeed(discoverRes.items, () => '');
  const liteList = liteRes.items.map(mapR114LiteDiscoverToFeedItem);
  return mergeDiscoverWithR114Lite(list, liteList) as MyHomeDiscoverFeedItem[];
}

/** 홈 mapProperties와 동일한 discover/Lite 마커 */
export function discoverFeedItemToMapMarker(item: MyHomeDiscoverFeedItem): MapMarkerProperty | null {
  if (item.lat == null || item.lng == null) return null;
  const riskScore = parseFloat(item.propertyGrade?.riskScore || '0');
  return {
    id: item.id,
    address: item.location?.address || item.location?.name || '',
    propertyTitle: item.propertyTitle,
    category: item.category || 'apartment',
    riskScore,
    pendingAi: riskScore <= 0,
    lat: item.lat,
    lng: item.lng,
  };
}

export function discoverItemToMapMarker(item: ApartmentDiscoverItem): MapMarkerProperty {
  return {
    id: item.id,
    address: item.address || item.locationName || '',
    riskScore: 0,
    lat: item.lat ?? undefined,
    lng: item.lng ?? undefined,
    category: 'apartment',
    propertyTitle: item.propertyTitle,
    markerKind: 'myHomeApartment',
  };
}

export function workplaceToMapMarker(workplace: {
  workplaceLabel?: string | null;
  workLat?: number | null;
  workLng?: number | null;
}): MapMarkerProperty | null {
  if (workplace.workLat == null || workplace.workLng == null) return null;
  return {
    id: 'workplace:home',
    address: workplace.workplaceLabel ?? '직장 · 목적지',
    riskScore: 0,
    lat: workplace.workLat,
    lng: workplace.workLng,
    category: 'other',
    propertyTitle: workplace.workplaceLabel ?? '직장 · 목적지',
    markerKind: 'myHomeWorkplace',
  };
}

export function registrationToMapMarker(
  reg: {
    masterId?: string | null;
    rtmsAptSeq?: string | null;
    r114PropId?: string | null;
    complexName: string;
    lat?: number | null;
    lng?: number | null;
  },
  idPrefix: string,
): MapMarkerProperty | null {
  if (reg.lat == null || reg.lng == null) return null;
  const id = reg.r114PropId || reg.rtmsAptSeq || reg.masterId || `${idPrefix}-home`;
  return {
    id: `${idPrefix}:${id}`,
    address: reg.complexName,
    riskScore: 0,
    lat: reg.lat,
    lng: reg.lng,
    category: 'apartment',
    propertyTitle: reg.complexName,
    markerKind: 'myHomeRegistered',
  };
}
