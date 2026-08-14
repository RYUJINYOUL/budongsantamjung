import type {
  R114LiteDetailResponse,
  R114LiteContextResponse,
  R114LitePyeongAreaStats,
  R114LitePyeongType,
  R114LiteTradesPageResponse,
  R114TradeType,
} from './r114LiteTypes';
import type { ApartmentAreaOption } from './apartmentCompareAreas';

export const LITE_INITIAL_TRADE_LIMIT = 36;
export const LITE_LOAD_MORE_TRADE_LIMIT = 20;

async function fetchWithRetry(url: string, init?: RequestInit, retries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

export type FetchR114LiteComplexOptions = {
  pyeongApprox?: number;
  tradeLimit?: number;
  tradeOffset?: number;
  tradeType?: R114TradeType;
  tradesOnly?: boolean;
};

function buildR114ComplexQuery(options?: FetchR114LiteComplexOptions): URLSearchParams {
  const params = new URLSearchParams();
  if (options?.pyeongApprox != null) {
    params.set('pyeong_approx', String(options.pyeongApprox));
  }
  if (options?.tradeLimit != null) {
    params.set('trade_limit', String(options.tradeLimit));
  }
  if (options?.tradeOffset != null && options.tradeOffset > 0) {
    params.set('trade_offset', String(options.tradeOffset));
  }
  if (options?.tradeType) {
    params.set('trade_type', options.tradeType);
  }
  if (options?.tradesOnly) {
    params.set('trades_only', '1');
  }
  return params;
}

export async function fetchR114LiteComplex(
  r114PropId: string,
  options?: FetchR114LiteComplexOptions,
): Promise<R114LiteDetailResponse> {
  const params = buildR114ComplexQuery(options);
  const qs = params.toString();
  const url = `/api/r114/complex/${encodeURIComponent(r114PropId)}${qs ? `?${qs}` : ''}`;
  const res = await fetchWithRetry(url, { cache: 'no-store' });
  return res.json() as Promise<R114LiteDetailResponse>;
}

/** 거래 탭 더보기 — stats/card 생략 */
export async function fetchR114LiteTradesPage(
  r114PropId: string,
  options: {
    tradeType: R114TradeType;
    tradeOffset: number;
    tradeLimit?: number;
  },
): Promise<R114LiteTradesPageResponse> {
  const params = buildR114ComplexQuery({
    tradesOnly: true,
    tradeType: options.tradeType,
    tradeOffset: options.tradeOffset,
    tradeLimit: options.tradeLimit ?? LITE_LOAD_MORE_TRADE_LIMIT,
  });
  const url = `/api/r114/complex/${encodeURIComponent(r114PropId)}?${params.toString()}`;
  const res = await fetchWithRetry(url, { cache: 'no-store' });
  return res.json() as Promise<R114LiteTradesPageResponse>;
}

/** meta(0건) + 거래 첫 페이지 — 패널 2단계 로드 (요청 2회) */
export async function fetchR114LiteComplexWithTrades(r114PropId: string): Promise<R114LiteDetailResponse> {
  const meta = await fetchR114LiteComplex(r114PropId, { tradeLimit: 0 });
  if (!meta.success || !meta.data) return meta;

  try {
    const params = buildR114ComplexQuery({
      tradesOnly: true,
      tradeLimit: LITE_INITIAL_TRADE_LIMIT,
      tradeOffset: 0,
    });
    const url = `/api/r114/complex/${encodeURIComponent(r114PropId)}?${params.toString()}`;
    const res = await fetchWithRetry(url, { cache: 'no-store' });
    const tradesPage = await res.json() as R114LiteTradesPageResponse & {
      meta?: { tradeTotals?: { sale: number; jeonse: number; wolse: number; tradeTotal: number } };
    };
    if (tradesPage.success && tradesPage.data?.trades) {
      meta.data.trades = tradesPage.data.trades;
      const totals = tradesPage.meta?.tradeTotals;
      if (totals && meta.data.stats) {
        meta.data.stats.saleTotal = totals.sale;
        meta.data.stats.jeonseTotal = totals.jeonse;
        meta.data.stats.wolseTotal = totals.wolse;
        meta.data.stats.tradeTotal = totals.tradeTotal;
      }
    }
  } catch {
    /* meta만 표시 */
  }
  return meta;
}

/** 지역·입지 — complex 로드 후 lazy (batch + 좌표) */
export async function fetchR114LiteContext(r114PropId: string): Promise<R114LiteContextResponse> {
  const url = `/api/r114/complex/${encodeURIComponent(r114PropId)}/context`;
  const res = await fetchWithRetry(url, { cache: 'no-store' });
  return res.json() as Promise<R114LiteContextResponse>;
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
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(lo) || lo <= 0) return '—';
  if (!Number.isFinite(hi) || hi <= 0) return `~${Math.round(lo)}㎡`;
  if (Math.abs(hi - lo) <= 1.0) {
    return `~${Math.round((lo + hi) / 2)}㎡`;
  }
  if (Math.abs(lo - hi) < 0.01) return `${lo.toFixed(2)}㎡`;
  return `${lo.toFixed(2)}~${hi.toFixed(2)}㎡`;
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

/** Lite 단지 — r114_pyeong (Lite 패널 meta와 동일, tradeLimit 0) */
export async function fetchR114LiteAreaOptions(r114PropId: string): Promise<{
  complexName: string | null;
  rtmsAptSeq: string | null;
  areas: ApartmentAreaOption[];
  error?: string | null;
}> {
  const res = await fetchR114LiteComplex(r114PropId, { tradeLimit: 0 });
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
