import type { R114LitePyeongType, R114LiteTrade, R114TradeType } from './r114LiteTypes';

export interface TradeChartPoint {
  label: string;
  priceVal: number;
  contractDate: string;
}

const SUPPLY_TOL = 0.6;

/** 평형 카드 선택 — pyeong_approx · 공급/전용㎡ 범위 매칭 */
export function tradeMatchesPyeong(trade: R114LiteTrade, pyeong: R114LitePyeongType): boolean {
  const approxs = pyeong.mergedPyeongApproxs?.length
    ? pyeong.mergedPyeongApproxs
    : [pyeong.pyeongApprox];

  if (trade.pyeongApprox != null && approxs.includes(trade.pyeongApprox)) {
    return true;
  }

  const supply = trade.supplyArea;
  if (supply != null && Number.isFinite(supply)) {
    if (supply >= pyeong.supplyMin - SUPPLY_TOL && supply <= pyeong.supplyMax + SUPPLY_TOL) {
      return true;
    }
  }

  const excl = trade.exclusiveArea;
  if (excl != null && Number.isFinite(excl)) {
    const min = pyeong.exclusiveAreaMin;
    const max = pyeong.exclusiveAreaMax;
    if (min > 0 && max > 0) {
      if (excl >= min - SUPPLY_TOL && excl <= max + SUPPLY_TOL) return true;
    }
  }

  return false;
}

export function filterTradesByPyeong(
  trades: R114LiteTrade[],
  pyeong: R114LitePyeongType | null | undefined,
): R114LiteTrade[] {
  if (!pyeong) return trades;
  return trades.filter((t) => tradeMatchesPyeong(t, pyeong));
}

export function formatRiseRate6m(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%`;
}

export function formatAvgPrice1mEok(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '—';
  return `${(man / 10000).toFixed(1)}억`;
}

/** ISO `2025-09-25` → `25.09.25` */
export function formatContractDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1].slice(2)}.${m[2]}.${m[3]}`;
  const compact = iso.replace(/-/g, '.');
  return compact.length >= 8 ? compact.slice(2) : compact;
}

export function tradeAmountMan(trade: R114LiteTrade, kind: R114TradeType): number {
  if (kind === 'sale') return trade.priceMan ?? 0;
  if (kind === 'jeonse') return trade.depositMan ?? 0;
  return trade.depositMan ?? trade.monthlyRentMan ?? 0;
}

export function buildTradeChartSeries(
  trades: R114LiteTrade[],
  kind: R114TradeType,
  maxPoints = 36,
): TradeChartPoint[] {
  const sorted = [...trades]
    .filter((t) => tradeAmountMan(t, kind) > 0)
    .sort((a, b) => (a.contractDate ?? '').localeCompare(b.contractDate ?? ''));

  const slice = sorted.length > maxPoints ? sorted.slice(-maxPoints) : sorted;

  return slice.map((t) => ({
    label: formatContractDateShort(t.contractDate),
    priceVal: tradeAmountMan(t, kind),
    contractDate: t.contractDate ?? '',
  }));
}

/** 최근 1개월 평균 매매·전세 → 전세가율(%) */
export function computeJeonseRatioPct(
  avgSaleMan: number | null | undefined,
  avgJeonseMan: number | null | undefined,
): number | null {
  if (avgSaleMan == null || avgJeonseMan == null) return null;
  if (!Number.isFinite(avgSaleMan) || !Number.isFinite(avgJeonseMan)) return null;
  if (avgSaleMan <= 0 || avgJeonseMan <= 0) return null;
  return Math.round((avgJeonseMan / avgSaleMan) * 1000) / 10;
}

export function formatJeonseRatioPct(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${ratio.toFixed(1)}%`;
}

export function moveInAgeYears(moveIn: string | null | undefined): number | null {
  if (!moveIn || moveIn.length < 4) return null;
  const y = parseInt(moveIn.slice(0, 4), 10);
  if (!Number.isFinite(y) || y < 1900) return null;
  return new Date().getFullYear() - y;
}
