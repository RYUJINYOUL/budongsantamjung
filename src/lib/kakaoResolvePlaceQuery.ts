import { loadKakaoMapsSdk } from './loadKakaoMapsSdk';

export type KakaoPlaceSuggestion = {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

function mapAddressResults(result: { address_name?: string; road_address?: { address_name?: string }; x: string; y: string }[]): KakaoPlaceSuggestion[] {
  return result.slice(0, 5).map((p) => ({
    place_name: p.address_name || p.road_address?.address_name || '',
    address_name: p.address_name || '',
    road_address_name: p.road_address?.address_name || '',
    x: p.x,
    y: p.y,
  }));
}

function mapKeywordResults(data: { place_name: string; address_name: string; road_address_name?: string; x: string; y: string }[]): KakaoPlaceSuggestion[] {
  return data.slice(0, 5).map((p) => ({
    place_name: p.place_name,
    address_name: p.address_name,
    road_address_name: p.road_address_name || '',
    x: p.x,
    y: p.y,
  }));
}

async function restLocalSearch(
  path: 'keyword' | 'address',
  query: string,
): Promise<KakaoPlaceSuggestion[]> {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
  if (!key || typeof fetch === 'undefined') return [];
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/${path}.json?query=${encodeURIComponent(query)}&size=5`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const docs = data.documents || [];
    if (path === 'address') {
      return docs.map((p: { address_name: string; road_address_name?: string; x: string; y: string }) => ({
        place_name: p.address_name,
        address_name: p.address_name,
        road_address_name: p.road_address_name || '',
        x: p.x,
        y: p.y,
      }));
    }
    return mapKeywordResults(docs);
  } catch {
    return [];
  }
}

/** 홈 리스트 검색과 동일: 주소 → 장소 키워드 → REST 폴백 */
export async function searchKakaoPlaceSuggestions(query: string): Promise<KakaoPlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  await loadKakaoMapsSdk();
  const services = window.kakao?.maps?.services;

  if (services?.Geocoder) {
    const fromAddress = await new Promise<KakaoPlaceSuggestion[]>((resolve) => {
      const geocoder = new services.Geocoder();
      geocoder.addressSearch(q, (result: Parameters<typeof mapAddressResults>[0], status: string) => {
        if (status === services.Status.OK && result?.length > 0) {
          resolve(mapAddressResults(result));
        } else {
          resolve([]);
        }
      });
    });
    if (fromAddress.length > 0) return fromAddress;

    if (services.Places) {
      const fromKeyword = await new Promise<KakaoPlaceSuggestion[]>((resolve) => {
        const places = new services.Places();
        places.keywordSearch(q, (data: Parameters<typeof mapKeywordResults>[0], status: string) => {
          if (status === services.Status.OK && data?.length > 0) {
            resolve(mapKeywordResults(data));
          } else {
            resolve([]);
          }
        });
      });
      if (fromKeyword.length > 0) return fromKeyword;
    }
  }

  const restKeyword = await restLocalSearch('keyword', q);
  if (restKeyword.length > 0) return restKeyword;

  return restLocalSearch('address', q);
}

export function suggestionToCoords(s: KakaoPlaceSuggestion): { lat: number; lng: number } | null {
  const lat = parseFloat(s.y);
  const lng = parseFloat(s.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export async function resolvePlaceQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  const list = await searchKakaoPlaceSuggestions(query);
  if (list.length === 0) return null;
  return suggestionToCoords(list[0]);
}
