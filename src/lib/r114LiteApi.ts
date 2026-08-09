import type {
  R114LiteDetailResponse,
  R114LitePyeongAreaStats,
  R114LitePyeongType,
} from './r114LiteTypes';
import type { ApartmentAreaOption } from './apartmentCompareAreas';

export async function fetchR114LiteComplex(
  r114PropId: string,
  options?: { pyeongApprox?: number; tradeLimit?: number },
): Promise<R114LiteDetailResponse> {
  const params = new URLSearchParams();
  if (options?.pyeongApprox != null) {
    params.set('pyeong_approx', String(options.pyeongApprox));
  }
  if (options?.tradeLimit != null) {
    params.set('trade_limit', String(options.tradeLimit));
  }
  const qs = params.toString();
  const url = `/api/r114/complex/${encodeURIComponent(r114PropId)}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  return res.json() as Promise<R114LiteDetailResponse>;
}

/** 만원 → "5억 5,000" / "5,500" */
export function formatPriceMan(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '-';
  if (man >= 10000) {
    const eok = Math.floor(man / 10000);
    const rest = man % 10000;
    if (rest === 0) return `${eok.toLocaleString()}억`;
    return `${eok.toLocaleString()}억 ${rest.toLocaleString()}`;
  }
  return `${man.toLocaleString()}만`;
}

export function formatWolse(depositMan: number | null, monthlyMan: number | null): string {
  const dep = formatPriceMan(depositMan);
  const mon = monthlyMan != null && monthlyMan > 0 ? `${monthlyMan.toLocaleString()}만` : '-';
  return `${dep}/${mon}`;
}

export function formatSupplyRange(min: number, max: number): string {
  if (Math.abs(min - max) < 0.01) return `${min.toFixed(2)}㎡`;
  return `${min.toFixed(2)}~${max.toFixed(2)}㎡`;
}

export function formatExclusiveRange(min: number, max: number): string {
  if (Math.abs(min - max) < 0.01) return `${min.toFixed(2)}㎡`;
  return `${min.toFixed(2)}~${max.toFixed(2)}㎡`;
}

export function formatMoveIn(moveIn: string | null): string | null {
  if (!moveIn || moveIn.length < 6) return moveIn;
  const y = moveIn.slice(0, 4);
  const m = moveIn.slice(4, 6);
  const d = moveIn.length >= 8 ? moveIn.slice(6, 8) : '';
  return d ? `${y}.${m}.${d}` : `${y}.${m}`;
}

function exclusiveCenter(p: R114LitePyeongType | R114LitePyeongAreaStats): number {
  const min = p.exclusiveAreaMin;
  const max = p.exclusiveAreaMax;
  if (min > 0 && max > 0) return Math.round(((min + max) / 2) * 10) / 10;
  if (min > 0) return Math.round(min * 10) / 10;
  if (max > 0) return Math.round(max * 10) / 10;
  return 0;
}

function pyeongToAreaOption(
  p: R114LitePyeongType,
  stats?: R114LitePyeongAreaStats,
): ApartmentAreaOption {
  const excl = stats?.exclusiveAreaM2 != null && stats.exclusiveAreaM2 > 0
    ? stats.exclusiveAreaM2
    : exclusiveCenter(p);
  const saleCount6m = stats?.saleCount6m ?? 0;
  return {
    exclusiveAreaM2: excl,
    supplyAreaM2: p.supplyMin > 0 ? Math.round(p.supplyMin * 100) / 100 : null,
    supplyAreaMaxM2: p.supplyMax > 0 ? Math.round(p.supplyMax * 100) / 100 : null,
    pyeongApprox: p.pyeongApprox,
    tradeCount6m: saleCount6m,
    cardStatsAvailable: saleCount6m > 0,
    riseRate6m: stats?.riseRate6m ?? null,
    avgPrice1m: stats?.avgPrice1m ?? null,
  };
}

/** Lite 단지 — r114_pyeong + 평형별 6mo stats */
export async function fetchR114LiteAreaOptions(r114PropId: string): Promise<{
  complexName: string | null;
  rtmsAptSeq: string | null;
  areas: ApartmentAreaOption[];
  error?: string | null;
}> {
  const res = await fetchR114LiteComplex(r114PropId, { tradeLimit: 200 });
  if (!res.success || !res.data) {
    return { complexName: null, rtmsAptSeq: null, areas: [], error: res.message || '단지 정보를 불러오지 못했습니다.' };
  }
  const { complex, pyeongTypes, pyeongAreaStats } = res.data;
  const statsByPyeong = new Map(
    (pyeongAreaStats || []).map((s) => [s.pyeongApprox, s]),
  );
  const areas = pyeongTypes.map((p) => pyeongToAreaOption(p, statsByPyeong.get(p.pyeongApprox)));
  return {
    complexName: complex.title,
    rtmsAptSeq: complex.rtmsAptSeq,
    areas,
    error: areas.length === 0 ? '등록된 평형이 없습니다.' : null,
  };
}
