export type ListingRequestCategory = 'apartment' | 'land' | 'building';

export type ListingRequestSourceType = 'r114_lite' | 'analysis_detail';

export interface ListingRequestContext {
  category: ListingRequestCategory;
  sourceType: ListingRequestSourceType;
  sourceId?: string | null;
  complexName?: string | null;
  address?: string | null;
  defaultPyeong?: number | null;
  /** 희망 예산 pre-fill (만원) — 제시가 우선 */
  defaultBudgetMan?: number | null;
  /** UI 참고 문구 (예: "제시가 12억") */
  referencePriceHint?: string | null;
  showPyeong?: boolean;
  showMoveIn?: boolean;
}

export interface ListingRequestPayload {
  category: ListingRequestCategory;
  sourceType: ListingRequestSourceType;
  sourceId?: string;
  complexName?: string;
  address?: string;
  pyeongApprox?: number;
  budgetMan?: number;
  moveInTiming?: string;
  contactName: string;
  contactPhone: string;
  prefilledPriceMan?: number;
}

/** analysisMetadata.userPriceWon(원) 또는 userSubmittedData.price → 만원 */
export function resolveUserPriceMan(
  metadata?: { userPriceWon?: number | string | null } | null,
  userSubmitted?: { price?: number | string | null; deposit?: number | string | null } | null,
): number | null {
  const won = Number(metadata?.userPriceWon || 0);
  if (Number.isFinite(won) && won > 0) {
    return Math.round(won / 10000);
  }
  const raw = userSubmitted?.price ?? userSubmitted?.deposit;
  const n = Number(raw || 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 10_000_000) return Math.round(n / 10000);
  return Math.round(n);
}

export async function submitListingRequest(
  token: string,
  payload: ListingRequestPayload,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/land/detective/listing-requests', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      prefilledPriceMan: payload.prefilledPriceMan ?? payload.budgetMan,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: data.error || '의뢰 접수에 실패했습니다.' };
  }
  return { success: true };
}

export function formatBudgetManLabel(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '';
  if (man >= 10000) {
    const eok = man / 10000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  return `${man.toLocaleString()}만`;
}
