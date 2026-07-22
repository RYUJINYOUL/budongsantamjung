import type { PresaleListItem } from './presaleApi';

export type PresaleGeo = { lat: number; lng: number };

const SESSION_KEY = 'presale_geocode_v1';
const memoryCache = new Map<string, PresaleGeo | null>();

function normalizeAddress(address: string): string {
  return address.trim().replace(/\s+/g, ' ');
}

function readSessionCache(): Record<string, PresaleGeo> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PresaleGeo>;
  } catch {
    return {};
  }
}

function writeSessionCache(key: string, geo: PresaleGeo | null) {
  if (typeof window === 'undefined') return;
  try {
    const cache = readSessionCache();
    if (geo) cache[key] = geo;
    else delete cache[key];
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota */
  }
}

function getCachedGeo(address: string): PresaleGeo | null | undefined {
  const key = normalizeAddress(address);
  if (memoryCache.has(key)) return memoryCache.get(key);
  const sessionHit = readSessionCache()[key];
  if (sessionHit) {
    memoryCache.set(key, sessionHit);
    return sessionHit;
  }
  return undefined;
}

export async function geocodePresaleAddress(address: string): Promise<PresaleGeo | null> {
  const key = normalizeAddress(address);
  if (!key) return null;

  const cached = getCachedGeo(key);
  if (cached !== undefined) return cached;

  if (typeof window === 'undefined' || !window.kakao?.maps?.services) {
    return null;
  }

  return new Promise((resolve) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(key, (result: { y: string; x: string }[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result[0]) {
        const geo = {
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
        };
        memoryCache.set(key, geo);
        writeSessionCache(key, geo);
        resolve(geo);
      } else {
        memoryCache.set(key, null);
        writeSessionCache(key, null);
        resolve(null);
      }
    });
  });
}

/** 목록 주소 일괄 geocode (동시 3건, applyhome 항목만) */
export async function geocodePresaleItems(
  items: PresaleListItem[],
  onBatch?: (coordsById: Record<string, PresaleGeo>) => void,
): Promise<Record<string, PresaleGeo>> {
  const targets = items.filter((item) => item.itemKind !== 'redev' && item.address?.trim());
  const coordsById: Record<string, PresaleGeo> = {};
  const concurrency = 3;

  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (item) => {
        const geo = await geocodePresaleAddress(item.address);
        return { id: item.id, geo };
      }),
    );
    for (const { id, geo } of results) {
      if (geo) coordsById[id] = geo;
    }
    onBatch?.({ ...coordsById });
  }

  return coordsById;
}
