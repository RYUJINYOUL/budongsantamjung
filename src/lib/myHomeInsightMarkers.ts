import type { MapMarkerProperty } from './mapMarkers';
import type { MyHomeCompareItem } from './myHomeTypes';

export type MyHomeInsightKind = 'news' | 'redevelopment';

export type MyHomeInsightItem = {
  id: string;
  kind: MyHomeInsightKind;
  title: string;
  date?: string | null;
  subtitle?: string | null;
  url?: string | null;
  lat: number;
  lng: number;
  anchorLabel?: string;
};

const MAX_INSIGHTS = 6;

/** 앵커 좌표 주변에 마커가 겹치지 않도록 소량 오프셋 */
function offsetLatLng(lat: number, lng: number, index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
  const radiusM = 140 + (index % 2) * 55;
  const dLat = (radiusM / 111_320) * Math.cos(angle);
  const dLng = (radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: lat + dLat, lng: lng + dLng };
}

function collectFromCompare(
  item: MyHomeCompareItem | null | undefined,
  anchorLabel: string,
  out: Omit<MyHomeInsightItem, 'lat' | 'lng'>[],
) {
  if (!item) return;

  const news = item.extended?.details?.dynamicNews?.items ?? [];
  for (const n of news) {
    if (!n.title?.trim()) continue;
    out.push({
      id: `news:${anchorLabel}:${out.length}`,
      kind: 'news',
      title: n.title.trim(),
      date: n.date ?? null,
      url: n.url ?? null,
      anchorLabel,
    });
  }

  const redev = item.extended?.details?.redevelopment;
  if (redev?.isInZone && redev.projects?.length) {
    for (const p of redev.projects) {
      if (!p.title?.trim()) continue;
      out.push({
        id: `redev:${anchorLabel}:${out.length}`,
        kind: 'redevelopment',
        title: p.title.trim(),
        date: p.gosiDate ?? null,
        subtitle: p.stage ?? null,
        anchorLabel,
      });
    }
  } else if (redev?.isInZone && (redev.projectCount ?? 0) > 0) {
    out.push({
      id: `redev:${anchorLabel}:zone`,
      kind: 'redevelopment',
      title: '정비·재건축 구역',
      subtitle: `${redev.projectCount}건`,
      anchorLabel,
    });
  }
}

export function buildMyHomeInsightItems(
  compareResults: MyHomeCompareItem[],
  registration: { lat?: number | null; lng?: number | null; complexName?: string } | null | undefined,
  compareSlots: Array<{ lat?: number | null; lng?: number | null; complexName?: string }>,
): MyHomeInsightItem[] {
  const raw: Omit<MyHomeInsightItem, 'lat' | 'lng'>[] = [];

  const homeLat = registration?.lat;
  const homeLng = registration?.lng;
  const homeLabel = registration?.complexName ?? compareResults[0]?.complexName ?? '우리집';

  if (homeLat != null && homeLng != null) {
    collectFromCompare(compareResults[0], homeLabel, raw);
  }

  compareSlots.forEach((slot, i) => {
    if (slot.lat == null || slot.lng == null) return;
    collectFromCompare(compareResults[i + 1], slot.complexName ?? `비교${i + 1}`, raw);
  });

  const limited = raw.slice(0, MAX_INSIGHTS);
  const anchors: { lat: number; lng: number; label: string }[] = [];

  if (homeLat != null && homeLng != null) {
    anchors.push({ lat: homeLat, lng: homeLng, label: homeLabel });
  }
  compareSlots.forEach((slot, i) => {
    if (slot.lat == null || slot.lng == null) return;
    anchors.push({
      lat: slot.lat,
      lng: slot.lng,
      label: slot.complexName ?? `비교${i + 1}`,
    });
  });

  const byAnchor = new Map<string, Omit<MyHomeInsightItem, 'lat' | 'lng'>[]>();
  for (const item of limited) {
    const key = item.anchorLabel ?? homeLabel;
    const list = byAnchor.get(key) ?? [];
    list.push(item);
    byAnchor.set(key, list);
  }

  const result: MyHomeInsightItem[] = [];
  for (const anchor of anchors) {
    const items = byAnchor.get(anchor.label) ?? [];
    items.forEach((item, idx) => {
      const pos = offsetLatLng(anchor.lat, anchor.lng, idx, items.length);
      result.push({ ...item, lat: pos.lat, lng: pos.lng });
    });
  }

  return result.slice(0, MAX_INSIGHTS);
}

export function insightItemToMapMarker(item: MyHomeInsightItem): MapMarkerProperty {
  return {
    id: `insight:${item.id}`,
    address: item.subtitle ?? item.date ?? item.anchorLabel ?? '',
    riskScore: 0,
    lat: item.lat,
    lng: item.lng,
    category: 'gosi',
    propertyTitle: item.title,
    markerKind: 'myHomeInsight',
  };
}

export function parseInsightMarkerId(markerId: string): string | null {
  if (!markerId.startsWith('insight:')) return null;
  return markerId.slice('insight:'.length);
}
