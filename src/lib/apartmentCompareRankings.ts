/**
 * compare v0 — 축별 상대 순위 (종합 점수 아님)
 */

export type CompareAxisRank = {
  axis: 'commute' | 'momentum' | 'supply';
  label: string;
  /** column index → rank 1 = best */
  ranks: Record<number, number>;
  /** tie or missing data */
  note?: string;
};

function parseSupplyManFromExtended(value: string | undefined): number | null {
  if (!value || value === '-') return null;
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function assignRanks(
  scores: { idx: number; score: number; penalized?: boolean }[],
  higherIsBetter: boolean,
): Record<number, number> {
  const ranks: Record<number, number> = {};
  const valid = scores.filter((s) => Number.isFinite(s.score));
  if (valid.length === 0) return ranks;

  const sorted = [...valid].sort((a, b) => {
    if (a.penalized && !b.penalized) return 1;
    if (!a.penalized && b.penalized) return -1;
    return higherIsBetter ? b.score - a.score : a.score - b.score;
  });

  sorted.forEach((item, i) => {
    ranks[item.idx] = i + 1;
  });
  return ranks;
}

export type CompareRankInput = {
  commuteMinutesTransit?: number | null;
  commuteMinutesCar?: number | null;
  riseRate6m?: number | null;
  tradeCount6m?: number | null;
  supplyMoveInMan?: number | null;
};

export function computeCompareAxisRanks(
  columns: CompareRankInput[],
  options: { maxCommuteMinutes?: number | null; workPlaceSet?: boolean },
): CompareAxisRank[] {
  const out: CompareAxisRank[] = [];

  if (options.workPlaceSet) {
    const max = options.maxCommuteMinutes ?? null;
    const scores = columns.map((c, idx) => {
      const t = c.commuteMinutesTransit;
      const car = c.commuteMinutesCar;
      let best = Infinity;
      if (t != null && t > 0) best = Math.min(best, t);
      if (car != null && car > 0) best = Math.min(best, car);
      if (!Number.isFinite(best)) return { idx, score: NaN, penalized: false };
      const penalized = max != null && max > 0 && best > max;
      return { idx, score: best, penalized };
    });
    out.push({
      axis: 'commute',
      label: '통근',
      ranks: assignRanks(scores, false),
      note: max != null && max > 0 ? `상한 ${max}분` : undefined,
    });
  }

  const momScores = columns.map((c, idx) => {
    const rise = c.riseRate6m;
    const trade = c.tradeCount6m ?? 0;
    if (rise == null || Number.isNaN(rise)) return { idx, score: NaN };
    return { idx, score: rise * 1000 + trade };
  });
  if (momScores.some((s) => Number.isFinite(s.score))) {
    out.push({
      axis: 'momentum',
      label: '모멘텀(6m)',
      ranks: assignRanks(momScores, true),
    });
  }

  const supplyScores = columns.map((c, idx) => ({
    idx,
    score: c.supplyMoveInMan ?? NaN,
  }));
  if (supplyScores.some((s) => Number.isFinite(s.score))) {
    out.push({
      axis: 'supply',
      label: '입주예정(↓유리)',
      ranks: assignRanks(supplyScores, false),
    });
  }

  return out;
}

export function extendedSupplyMoveInMan(
  extended?: { rows?: { id: string; value: string }[] } | null,
): number | null {
  const row = extended?.rows?.find((r) => r.id === 'supply_movein');
  return parseSupplyManFromExtended(row?.value);
}

export function rankBadge(rank: number | undefined, total: number): string {
  if (rank == null || rank < 1) return '';
  if (rank === 1) return '1위';
  if (total <= 4 && rank === total) return `${rank}위`;
  return `${rank}위`;
}
