/** 토지 UI 트랙 — 백엔드 landUiTrack.js 와 동기화 */

export type LandUiTrack = 'A' | 'B' | 'C';

const TRACK_A = new Set(['commercial', 'residential']);
const TRACK_B = new Set(['farmland', 'forest']);

export function resolveLandUiTrack(
  meta?: Record<string, unknown> | null,
  mergedData?: Record<string, unknown> | null,
): LandUiTrack {
  const mp = meta?.marketProof as Record<string, unknown> | undefined;
  const assetClass = String(mp?.assetClass || '');
  if (TRACK_A.has(assetClass)) return 'A';
  if (TRACK_B.has(assetClass)) return 'B';
  if (assetClass === 'green') return 'C';

  const land = (mergedData?.vitals as Record<string, unknown> | undefined)?.land as Record<string, unknown> | undefined;
  const chars = (land?.characteristics || mergedData?.land || {}) as Record<string, unknown>;
  const jimok = String(chars.jimok || mergedData?.jimok || '');
  const zoning = String(chars.zoning || mergedData?.zoning || mergedData?.landUse || '');

  if (jimok === '대' && /상업|주거|준주/.test(zoning)) return 'A';
  if (['전', '답', '임야', '과수원'].includes(jimok)) return 'B';
  if (/계획관리|생산관리|농림|녹지|보전|자연환경|관리지역/.test(zoning)) return 'C';
  return 'B';
}

export function shouldShowFullMarketProof(track: LandUiTrack): boolean {
  return track === 'A';
}

export function shouldShowReferenceMarketProof(track: LandUiTrack): boolean {
  return track === 'B';
}
