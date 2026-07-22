import type { MapMarkerProperty } from './mapMarkers';
import type { PresaleListItem } from './presaleApi';
import type { PresaleGeo } from './presaleGeocode';

export type MapBounds = {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
};

export function presaleItemToMarker(
  item: PresaleListItem,
  coords: PresaleGeo,
): MapMarkerProperty {
  return {
    id: item.id,
    address: item.address,
    propertyTitle: item.houseName,
    category: 'apartment',
    riskScore: 0,
    markerKind: 'presale',
    presaleDDay: item.status?.dDay ?? null,
    lat: coords.lat,
    lng: coords.lng,
  };
}

export function buildPresaleMarkers(
  items: PresaleListItem[],
  coordsById: Record<string, PresaleGeo>,
): MapMarkerProperty[] {
  return items
    .map((item) => {
      const coords = coordsById[item.id];
      if (!coords) return null;
      return presaleItemToMarker(item, coords);
    })
    .filter((m): m is MapMarkerProperty => m != null);
}

export function filterMarkersInBounds(
  markers: MapMarkerProperty[],
  bounds: MapBounds | null,
): MapMarkerProperty[] {
  if (!bounds) return markers;
  return markers.filter((m) => {
    if (m.lat == null || m.lng == null) return false;
    return (
      m.lat >= bounds.swLat &&
      m.lat <= bounds.neLat &&
      m.lng >= bounds.swLng &&
      m.lng <= bounds.neLng
    );
  });
}

export function collectPresaleListItems(
  items: PresaleListItem[],
  sections: { items: PresaleListItem[] }[],
  useSections: boolean,
): PresaleListItem[] {
  if (useSections && sections.length > 0) {
    return sections.flatMap((section) => section.items);
  }
  return items;
}
