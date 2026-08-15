/** 홈(/) 지도·탭 상태 — 다른 페이지 이동 후 복귀용 */
export type HomeMapSession = {
  lat: number;
  lng: number;
  zoomLevel: number;
  category: string;
  tab: 'map' | 'list';
};

const STORAGE_KEY = 'home_map_session_v1';

export function readHomeMapSession(): HomeMapSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
      zoomLevel: typeof parsed.zoomLevel === 'number' ? parsed.zoomLevel : 9,
      category: typeof parsed.category === 'string' ? parsed.category : 'all',
      tab: parsed.tab === 'list' ? 'list' : 'map',
    };
  } catch {
    return null;
  }
}

export function writeHomeMapSession(partial: Partial<HomeMapSession>): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = readHomeMapSession();
    const next: HomeMapSession = {
      lat: partial.lat ?? prev?.lat ?? 37.5665,
      lng: partial.lng ?? prev?.lng ?? 126.978,
      zoomLevel: partial.zoomLevel ?? prev?.zoomLevel ?? 9,
      category: partial.category ?? prev?.category ?? 'all',
      tab: partial.tab ?? prev?.tab ?? 'map',
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}
