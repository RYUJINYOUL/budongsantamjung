export const PASS_BADGE = {
  ACTIVE: 'active',
  TRADE_VOLUME_CHECK: 'trade_volume_check',
} as const;

export type PassBadge = typeof PASS_BADGE[keyof typeof PASS_BADGE];

export type PassQueueMarketProof = {
  status?: string | null;
  uiLabel?: string | null;
  userMessage?: string | null;
  tradeCount36mo?: number | null;
  flag?: string | null;
};

export type PassQueueInfo = {
  passBadge?: PassBadge | null;
  passBadgeLabel?: string | null;
  ddangyaUid?: number | null;
  ddangyaUrl?: string | null;
  passStrict?: boolean | null;
  passStrictEffective?: boolean | null;
  marketProofBlocked?: boolean | null;
  listingRatio?: number | null;
  appliedMultiplier?: number | null;
  resolverLevel?: string | null;
  marketProof?: PassQueueMarketProof | null;
  cohortScreenVersion?: string | null;
};

export const PASS_QUEUE_LIST_TAGLINE =
  'cohort 스크린 통과 매물입니다. 활성·거래량 확인 필 배지로 구분되며, 최종 판단은 사용자에게 있습니다.';

export const DEEP_ANALYZE_MIN_SCORE = 50;

export function passBadgeStyle(passBadge?: PassBadge | null): {
  className: string;
  icon?: string;
} {
  if (passBadge === PASS_BADGE.ACTIVE) {
    return { className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  }
  if (passBadge === PASS_BADGE.TRADE_VOLUME_CHECK) {
    return { className: 'bg-amber-100 text-amber-900 border-amber-300', icon: '⚠️' };
  }
  return { className: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export function formatListingRatio(ratio?: number | null): string | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  return `${(ratio * 100).toFixed(1)}%`;
}

export function isPassQueueListing(item?: { passBadge?: PassBadge | null; passQueue?: PassQueueInfo | null } | null): boolean {
  return !!(item?.passBadge || item?.passQueue?.passBadge);
}
