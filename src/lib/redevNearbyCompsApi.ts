import type { NearbyComp } from './redevInvestmentCalc';

export interface NearbyCompsResponse {
  success: boolean;
  center: { lat: number; lng: number } | null;
  comps: NearbyComp[];
  count: number;
  fallback: boolean;
  message?: string;
}

export async function fetchNearbyComps(
  projectId: number,
  areaSqm: number,
  sort: 'distance' | 'recent' = 'distance',
): Promise<NearbyCompsResponse> {
  const params = new URLSearchParams({
    area: String(areaSqm),
    sort,
  });
  const res = await fetch(`/api/discover/redev/${projectId}/nearby-comps?${params}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || '비교 단지를 불러오지 못했습니다.');
  }
  return data as NearbyCompsResponse;
}
