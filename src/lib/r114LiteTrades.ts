import type { R114LitePyeongType, R114LiteTrade } from './r114LiteTypes';

const SUPPLY_TOL = 0.6;

/** 평형 카드 선택 — pyeong_approx · 공급/전용㎡ 범위 매칭 */
export function tradeMatchesPyeong(trade: R114LiteTrade, pyeong: R114LitePyeongType): boolean {
  if (trade.pyeongApprox != null && trade.pyeongApprox === pyeong.pyeongApprox) {
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
