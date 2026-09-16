import { formatEokCompact } from './analysisV31Helpers';

export type UnitCompTierRow = {
  tier: string;
  label: string;
  role?: string;
  count?: number;
  estimatedTotalWon?: number | null;
  minWon?: number | null;
  maxWon?: number | null;
  available?: boolean;
};

const DISPLAY_ORDER = ['same_pnu', 'same_building', 'regional', 'cohort'] as const;

export function parseUnitCompComparison(
  meta?: Record<string, unknown> | null,
): UnitCompTierRow[] {
  const raw = meta?.unitCompComparison;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const byTier = new Map<string, UnitCompTierRow>();
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const tier = String(row.tier || '');
    if (!tier) continue;
    byTier.set(tier, {
      tier,
      label: String(row.label || tier),
      role: row.role != null ? String(row.role) : undefined,
      count: Number(row.count) || 0,
      estimatedTotalWon: row.estimatedTotalWon != null ? Number(row.estimatedTotalWon) : null,
      minWon: row.minWon != null ? Number(row.minWon) : null,
      maxWon: row.maxWon != null ? Number(row.maxWon) : null,
      available: row.available === true,
    });
  }

  const out: UnitCompTierRow[] = [];
  for (const key of DISPLAY_ORDER) {
    const row = byTier.get(key);
    if (!row) continue;
    if (key === 'same_building' && (row.count || 0) === 0 && !(row.estimatedTotalWon || 0)) {
      continue;
    }
    out.push(row);
  }
  return out;
}

export function formatUnitCompTierAmount(row: UnitCompTierRow): string {
  const est = Number(row.estimatedTotalWon) || 0;
  const min = Number(row.minWon) || 0;
  const max = Number(row.maxWon) || 0;
  if (est <= 0 && min <= 0) return '—';
  if (min > 0 && max > 0 && min !== max && Math.abs(min - max) / Math.max(min, max) > 0.03) {
    return `약 ${formatEokCompact(min)} ~ ${formatEokCompact(max)}원`;
  }
  if (est > 0) return `약 ${formatEokCompact(est)}원`;
  if (min > 0) return `약 ${formatEokCompact(min)}원`;
  return '—';
}

export function resolveUnitCompFinalSource(meta?: Record<string, unknown> | null): string {
  return String(meta?.finalEstimateSource || meta?.unitCompTierUsed || '');
}

/** OT/ST/RH — tier 패널 + raw 60건 블록 숨김 */
export function shouldShowUnitCompTierPanel(
  meta?: Record<string, unknown> | null,
  mergedData?: Record<string, unknown> | null,
): boolean {
  const m = meta || {};
  if (!Array.isArray(m.unitCompComparison) || m.unitCompComparison.length === 0) return false;
  if (m.otUnitMode || m.stUnitMode) return true;
  if (m.rhUnitMode === true) return true;
  const track = String(m.priceValuationTrack || '');
  if (track === 'ot_unit' || track === 'st_unit' || track === 'rh_unit') return true;
  const ua = (mergedData?.unitAnalysis || m.unitAnalysis) as Record<string, unknown> | undefined;
  if (ua?.otUnitMode || ua?.stUnitMode) return true;
  const ht = m.houseTarget as Record<string, unknown> | undefined;
  if (ht?.isRhUnit === true) return true;
  return false;
}

function compPnuBase(c: Record<string, unknown>): string {
  const p = c.pnu != null ? String(c.pnu) : '';
  if (p.length >= 19) return p.slice(0, 19);
  return '';
}

function jibunFromComp(c: Record<string, unknown>): string {
  const j = c.jibun || c.지번;
  if (j) return String(j);
  const addr = String(c.address || c.umdNm || '');
  const m = addr.match(/\d+-\d+|\d+/);
  return m ? m[0] : '';
}

function isSamePnuComparable(
  c: Record<string, unknown>,
  targetPnu: string,
  targetJibun: string,
): boolean {
  const tp = String(targetPnu || '').slice(0, 19);
  const cp = compPnuBase(c);
  if (tp && cp && tp === cp) return true;
  if (targetJibun && jibunFromComp(c) === targetJibun) return true;
  const addr = String(c.address || '');
  if (targetJibun && addr.includes(targetJibun)) return true;
  return false;
}

/** tier별 지도 마커 (클라이언트 — comp·코호트 샘플) */
export function resolveMapMarkersForUnitCompTier(
  tier: string,
  meta: Record<string, unknown>,
  comparables: unknown[],
): { markers: Record<string, unknown>[]; mapLabel: string } {
  const comps = (Array.isArray(comparables) ? comparables : []) as Record<string, unknown>[];
  const withCoords = comps.filter((c) => {
    const lat = parseFloat(String(c.lat));
    const lng = parseFloat(String(c.lng));
    return Number.isFinite(lat) && Number.isFinite(lng);
  });
  const targetPnu = String(meta.pnu || '').slice(0, 19);
  const targetAddr = String(meta.target?.address || meta.targetAddress || '');
  const targetJibun = targetAddr.match(/\d+-\d+|\d+/)?.[0] || '';

  if (tier === 'same_pnu' || tier === 'same_building') {
    const filtered = withCoords.filter((c) => isSamePnuComparable(c, targetPnu, targetJibun));
    const markers = filtered.length > 0 ? filtered : withCoords;
    return {
      markers,
      mapLabel: tier === 'same_building' ? '동일 건물 실거래 지도' : '동일 PNU/필지 실거래 지도',
    };
  }

  if (tier === 'regional') {
    return { markers: withCoords, mapLabel: '인접·유사 실거래 지도' };
  }

  if (tier === 'cohort') {
    const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
    const obs = opr?.observedRatio as Record<string, unknown> | undefined;
    const samples = (
      (Array.isArray(opr?.samples) && opr!.samples.length > 0)
        ? opr!.samples
        : (Array.isArray(obs?.cohortSamples) ? obs!.cohortSamples : [])
    ) as Record<string, unknown>[];
    const cohortMarkers = samples.filter((s) => {
      const lat = parseFloat(String(s.lat));
      const lng = parseFloat(String(s.lng));
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
    return {
      markers: cohortMarkers,
      mapLabel: '공시지가 코호트 표본 지도',
    };
  }

  return { markers: withCoords, mapLabel: '비교사례 위치 지도' };
}

export function unitCompTierHeadlineLabel(meta?: Record<string, unknown> | null): string | null {
  const label = meta?.finalEstimateLabel;
  if (label) return String(label);
  const src = resolveUnitCompFinalSource(meta);
  const map: Record<string, string> = {
    same_pnu: '동일 PNU/필지',
    same_building: '동일 건물명',
    regional: '인접·유사 실거래',
    cohort: '공시지가 코호트',
  };
  return map[src] || null;
}
