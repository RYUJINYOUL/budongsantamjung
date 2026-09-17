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

const DISPLAY_ORDER = ['same_unit', 'same_building', 'regional', 'cohort'] as const;

/** tier 패널에 노출할 tier (③④는 재분석·지도 검증 전까지 UI 비노출) */
export const UNIT_COMP_TIER_UI_VISIBLE = ['same_unit', 'same_building'] as const;

export function filterUnitCompTierRowsForUi(rows: UnitCompTierRow[]): UnitCompTierRow[] {
  const allow = new Set<string>(UNIT_COMP_TIER_UI_VISIBLE);
  return rows.filter((r) => allow.has(r.tier));
}

/** 구 API same_pnu → same_unit 표시 */
function normalizeTierKey(tier: string): string {
  if (tier === 'same_pnu') return 'same_unit';
  return tier;
}

export function parseUnitCompComparison(
  meta?: Record<string, unknown> | null,
): UnitCompTierRow[] {
  const raw = meta?.unitCompComparison;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const byTier = new Map<string, UnitCompTierRow>();
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const tier = normalizeTierKey(String(row.tier || ''));
    if (!tier) continue;
    const existing = byTier.get(tier);
    const count = Number(row.count) || 0;
    const estimatedTotalWon = row.estimatedTotalWon != null ? Number(row.estimatedTotalWon) : null;
    if (existing && tier === 'same_unit' && (existing.count || 0) >= count) continue;
    byTier.set(tier, {
      tier,
      label: String(row.label || tier),
      role: row.role != null ? String(row.role) : undefined,
      count,
      estimatedTotalWon,
      minWon: row.minWon != null ? Number(row.minWon) : null,
      maxWon: row.maxWon != null ? Number(row.maxWon) : null,
      available: row.available === true,
    });
  }

  const out: UnitCompTierRow[] = [];
  for (const key of DISPLAY_ORDER) {
    const row = byTier.get(key);
    if (!row) {
      if (key === 'same_unit' || key === 'same_building') {
        out.push({
          tier: key,
          label: key === 'same_unit' ? '동일 세대' : '동일 건물',
          role: key === 'same_unit' ? '동일 필지·층·면적' : '동일 건물·다필지 포함',
          count: 0,
          estimatedTotalWon: null,
          available: false,
        });
      }
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
  const src = String(meta?.finalEstimateSource || meta?.unitCompTierUsed || '');
  return normalizeTierKey(src);
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

function withValidCoords(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.filter((c) => {
    const lat = parseFloat(String(c.lat));
    const lng = parseFloat(String(c.lng));
    return Number.isFinite(lat) && Number.isFinite(lng);
  });
}

function flattenVitalsRegionalTrades(mergedData?: Record<string, unknown> | null): Record<string, unknown>[] {
  const vitals = mergedData?.vitals as Record<string, unknown> | undefined;
  const groups = vitals?.regionalTrades;
  if (!Array.isArray(groups)) return [];
  const out: Record<string, unknown>[] = [];
  for (const g of groups) {
    const row = g as Record<string, unknown>;
    const data = Array.isArray(row.data) ? row.data : [];
    for (const t of data) {
      if (t && typeof t === 'object') out.push(t as Record<string, unknown>);
    }
  }
  return out;
}

function flattenUiAttachedRegional(meta: Record<string, unknown>): Record<string, unknown>[] {
  const groups = meta.uiAttachedRegionalTrades;
  if (!Array.isArray(groups)) return [];
  const out: Record<string, unknown>[] = [];
  for (const g of groups) {
    const row = g as Record<string, unknown>;
    const data = Array.isArray(row.data) ? row.data : [];
    for (const t of data) {
      if (t && typeof t === 'object') out.push(t as Record<string, unknown>);
    }
  }
  return out;
}

/** tier별 지도 마커 (서버 unitComp*MapMarkers 우선, 스냅샷 vitals fallback) */
export function resolveMapMarkersForUnitCompTier(
  tier: string,
  meta: Record<string, unknown>,
  comparables: unknown[],
  mergedData?: Record<string, unknown> | null,
): { markers: Record<string, unknown>[]; mapLabel: string } {
  const tierNorm = normalizeTierKey(tier);
  const comps = (Array.isArray(comparables) ? comparables : []) as Record<string, unknown>[];
  const withCoords = withValidCoords(comps);
  const targetPnu = String(meta.pnu || '').slice(0, 19);
  const targetObj = meta.target as Record<string, unknown> | undefined;
  const targetAddr = String(targetObj?.address ?? meta.targetAddress ?? '');
  const targetJibun = targetAddr.match(/\d+-\d+|\d+/)?.[0] || '';

  if (tierNorm === 'same_unit' || tierNorm === 'same_building') {
    const filtered = withCoords.filter((c) => isSamePnuComparable(c, targetPnu, targetJibun));
    const markers = filtered.length > 0 ? filtered : withCoords;
    return {
      markers,
      mapLabel: tierNorm === 'same_building' ? '동일 건물 실거래 지도' : '동일 세대 실거래 지도',
    };
  }

  if (tierNorm === 'regional') {
    const serverMarkers = Array.isArray(meta.unitCompRegionalMapMarkers)
      ? (meta.unitCompRegionalMapMarkers as Record<string, unknown>[])
      : [];
    const fromServer = withValidCoords(serverMarkers);
    if (fromServer.length > 0) {
      return { markers: fromServer, mapLabel: '지역 유사 실거래 지도' };
    }
    const fromVitals = withValidCoords(flattenVitalsRegionalTrades(mergedData));
    const fromAttached = withValidCoords(flattenUiAttachedRegional(meta));
    const merged = [...fromAttached, ...fromVitals, ...withCoords];
    const deduped: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    for (const m of merged) {
      const key = `${m.lat},${m.lng},${m.jibun || ''},${m.dealAmount || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(m);
    }
    return { markers: deduped, mapLabel: '지역 유사 실거래 지도' };
  }

  if (tierNorm === 'cohort') {
    const serverCohort = Array.isArray(meta.unitCompCohortMapMarkers)
      ? (meta.unitCompCohortMapMarkers as Record<string, unknown>[])
      : [];
    const fromServer = withValidCoords(serverCohort);
    if (fromServer.length > 0) {
      return { markers: fromServer, mapLabel: '공시지가 코호트 표본 지도' };
    }
    const opr = meta.officialPriceRatio as Record<string, unknown> | undefined;
    const obs = opr?.observedRatio as Record<string, unknown> | undefined;
    const samples = (
      (Array.isArray(opr?.samples) && opr!.samples.length > 0)
        ? opr!.samples
        : (Array.isArray(obs?.cohortSamples)
          ? obs!.cohortSamples
          : (Array.isArray(obs?.cohortSamplesAll) ? obs!.cohortSamplesAll : []))
    ) as Record<string, unknown>[];
    const cohortMarkers = withValidCoords(samples);
    return {
      markers: cohortMarkers,
      mapLabel: '공시지가 코호트 표본 지도',
    };
  }

  return { markers: withCoords, mapLabel: '비교사례 위치 지도' };
}

function tierCountFromMeta(meta: Record<string, unknown>, tier: string): number {
  const rows = parseUnitCompComparison(meta);
  const row = rows.find((r) => r.tier === tier);
  return Number(row?.count) || 0;
}

/** ①·② 동일 세대/건물 실거래 표본 없음 (602 thin sameUnit 케이스는 제외) */
export function isUnitCompDirectSsotMissing(meta?: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  if (meta.unitCompDirectSsotMissing === true) return true;
  if (meta.unitCompDirectSsotMissing === false) return false;
  const unitN = tierCountFromMeta(meta, 'same_unit');
  const bldN = tierCountFromMeta(meta, 'same_building');
  return unitN < 1 && bldN < 1;
}

/** 최종 추정이 ③·④만 의미 있는 경우 (시장성 참고) */
export function isUnitCompMarketContextOnly(meta?: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  if (meta.unitCompMarketContextOnly === true) return true;
  if (!isUnitCompDirectSsotMissing(meta)) return false;
  const src = resolveUnitCompFinalSource(meta);
  return src === 'regional' || src === 'cohort';
}

export type UnitCompSsotGuidance = {
  showBanner: boolean;
  title: string;
  primary: string;
  secondary: string;
};

export function resolveUnitCompSsotGuidance(meta?: Record<string, unknown> | null): UnitCompSsotGuidance | null {
  if (!meta || !isUnitCompDirectSsotMissing(meta)) return null;
  const marketOnly = isUnitCompMarketContextOnly(meta);
  return {
    showBanner: true,
    title: '동일 세대·동일 건물 실거래 표본 없음',
    primary:
      '해당 호에 대한 직접비교 SSOT를 산출하지 못했습니다. 감정평가서·경매 공고 감정가 등 공식·제출 자료를 1차 참고하세요.',
    secondary: marketOnly
      ? '지역·코호트 기반 참고 추정은 시장성 맥락용입니다. 적정 매매가·유사·저·고평가로 단정하지 마세요. (재분석 후 tier·지도를 다시 노출할 예정입니다.)'
      : '가격 적정성은 판정 유보·참고 추정으로 서술하세요.',
  };
}

export function unitCompTierHeadlineLabel(meta?: Record<string, unknown> | null): string | null {
  const label = meta?.finalEstimateLabel;
  if (label) return String(label);
  const src = resolveUnitCompFinalSource(meta);
  const map: Record<string, string> = {
    same_unit: '동일 세대',
    same_pnu: '동일 세대',
    same_building: '동일 건물',
    regional: '지역 유사',
    cohort: '공시지가 코호트',
  };
  return map[src] || null;
}
