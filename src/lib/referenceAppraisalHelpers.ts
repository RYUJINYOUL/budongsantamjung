import { formatEokCompact } from './analysisV31Helpers';

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
