import type { MapMarkerProperty } from './mapMarkers';
import type { ApartmentDiscoverItem } from './fetchApartmentDiscover';

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
