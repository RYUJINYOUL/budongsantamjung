/** 홈(/) · 추천(/recom) 지도·탭 상태 — 페이지별 분리 저장 */
import { HOME_INITIAL_ZOOM_LEVEL } from './timelineGeo';

export type MapFeedScope = 'home' | 'recom';

export type HomeMapSession = {
  lat: number;
  lng: number;
  zoomLevel: number;
  category: string;
  tab: 'map' | 'list';
};

const HOME_STORAGE_KEY = 'home_map_session_v1';
const RECOM_STORAGE_KEY = 'recom_map_session_v1';

function mapSessionStorageKey(scope: MapFeedScope): string {
  return scope === 'recom' ? RECOM_STORAGE_KEY : HOME_STORAGE_KEY;
}

export function readHomeMapSession(scope: MapFeedScope = 'home'): HomeMapSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(mapSessionStorageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomeMapSession>;
    if (
      typeof parsed.lat !== 'number'
      || typeof parsed.lng !== 'number'
      || !Number.isFinite(parsed.lat)
      || !Number.isFinite(parsed.lng)
    ) {
      return null;
    }
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      zoomLevel: typeof parsed.zoomLevel === 'number' ? parsed.zoomLevel : HOME_INITIAL_ZOOM_LEVEL,
      category: typeof parsed.category === 'string' ? parsed.category : 'all',
      tab: parsed.tab === 'list' ? 'list' : 'map',
    };
  } catch {
    return null;
  }
}

export function writeHomeMapSession(
  partial: Partial<HomeMapSession>,
  scope: MapFeedScope = 'home',
): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = readHomeMapSession(scope);
    const defaultCategory = scope === 'recom' ? '아파트' : 'all';
    const next: HomeMapSession = {
      lat: partial.lat ?? prev?.lat ?? 37.5665,
      lng: partial.lng ?? prev?.lng ?? 126.978,
      zoomLevel: partial.zoomLevel ?? prev?.zoomLevel ?? HOME_INITIAL_ZOOM_LEVEL,
      category: partial.category ?? prev?.category ?? defaultCategory,
      tab: partial.tab ?? prev?.tab ?? 'map',
    };
    sessionStorage.setItem(mapSessionStorageKey(scope), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
