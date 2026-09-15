import {
  buildEstimateRangeLabel,
  formatEokCompact,
  resolveEstimateRange,
} from './analysisV31Helpers';

export interface ReferenceAppraisal {
  source?: string;
  label?: string;
  auctionItemId?: number | null;
  caseNumber?: string | null;
  appraisalPriceMan: number;
  appraisalPriceWon?: number;
  minPriceMan?: number | null;
  note?: string;
  disclaimer?: string;
  gapVsEstimatePct?: number | null;
}

export function extractReferenceAppraisal(ai: Record<string, unknown> | null | undefined): ReferenceAppraisal | null {
  if (!ai) return null;
  const direct = ai.referenceAppraisal as ReferenceAppraisal | undefined;
  const meta = (ai.analysisMetadata || {}) as Record<string, unknown>;
  const fromMeta = meta.referenceAppraisal as ReferenceAppraisal | undefined;
  const ref = direct?.appraisalPriceMan ? direct : fromMeta?.appraisalPriceMan ? fromMeta : null;
  if (!ref || !Number(ref.appraisalPriceMan) || Number(ref.appraisalPriceMan) <= 0) return null;
  return ref;
}

export function formatReferenceAppraisalPrice(ref: ReferenceAppraisal): string {
  const won = ref.appraisalPriceWon || Number(ref.appraisalPriceMan) * 10000;
  return `${formatEokCompact(won)}원`;
}

export function formatReferenceAppraisalGap(ref: ReferenceAppraisal): string | null {
  if (ref.gapVsEstimatePct == null || Number.isNaN(ref.gapVsEstimatePct)) return null;
  const pct = ref.gapVsEstimatePct;
  const sign = pct > 0 ? '+' : '';
  return `서버 추정가 대비 ${sign}${pct}%`;
}

export type ServerEstimateDisplay = {
  primary: string;
  subline?: string;
  won: number;
};

function resolveV31Category(category?: string): 'land' | 'building' {
  const cat = String(category || 'land').toLowerCase();
  if (cat === 'building' || cat === '빌딩' || cat === 'store' || cat === '상가') return 'building';
  return 'land';
}

/** 법원 감정가 블록 옆 AI·서버 추정가 (감정가 gap 계산과 동일 SSOT 우선) */
export function resolveServerEstimateDisplay(
  ai: Record<string, unknown> | null | undefined,
  options?: { mergedData?: Record<string, unknown> | null; category?: string },
): ServerEstimateDisplay | null {
  if (!ai) return null;
  const meta = (ai.analysisMetadata || {}) as Record<string, unknown>;
  const priceReas = (ai['5_priceReasonableness'] || {}) as Record<string, unknown>;
  const v31Cat = resolveV31Category(
    options?.category || String(meta.category || meta.propertyCategory || ''),
  );

  const metaTotal = Number(meta.estimatedTotalPrice) || 0;
  const { min, max, source } = resolveEstimateRange(
    meta,
    priceReas,
    options?.mergedData,
    v31Cat,
  );

  let won = 0;
  let primary = '';
  if (min > 0 || max > 0) {
    won = min === max ? min : Math.round((min + max) / 2);
    primary = min === max
      ? `${formatEokCompact(min)}원`
      : `${formatEokCompact(min)}~${formatEokCompact(max)}`;
  } else if (metaTotal > 0) {
    won = metaTotal;
    primary = `${formatEokCompact(metaTotal)}원`;
  } else {
    return null;
  }

  const subParts: string[] = [];
  subParts.push(`${Math.round(won / 10_000).toLocaleString('ko-KR')}만원`);
  if (min > 0 && source) {
    subParts.push(buildEstimateRangeLabel(source, meta));
  }

  return {
    primary,
    won,
    subline: subParts.join(' · '),
  };
}
