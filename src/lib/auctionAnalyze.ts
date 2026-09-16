import type { AuctionListItem } from './auctionTypes';

export type AnalyzeCategory = 'land' | 'house' | 'apartment' | 'store' | 'building';

export interface AuctionParcelPrefill {
  jibun: string | null;
  pnu: string | null;
  isPrimary?: boolean;
}

export interface AuctionAnalyzePrefill {
  auctionItemId: number;
  category: AnalyzeCategory;
  address: string | null;
  lat: number | null;
  lng: number | null;
  pnu: string | null;
  pnuList?: string[];
  isMultiPnu?: boolean;
  parcelJibuns?: string[];
  parcels?: AuctionParcelPrefill[];
  usageType: string | null;
  caseNumber: string | null;
  courtName: string | null;
  itemNumber?: string | null;
  minPriceMan: number | null;
  appraisalPriceMan: number | null;
  failCount: number;
  saleDate: string | null;
  linkedReportId: number | null;
  canAnalyze: boolean;
  geocodeMissing: boolean;
  /** 소유권 지분 매각 — 자동 추정 미제공 */
  analysisBlocked?: boolean;
  analysisBlockReason?: string | null;
  analysisBlockMessage?: string | null;
}

export interface AuctionAnalyzePrefillResponse {
  success: boolean;
  prefill?: AuctionAnalyzePrefill;
  message?: string;
  error?: string;
}

const CATEGORY_LABELS: Record<AnalyzeCategory, string> = {
  land: '토지',
  house: '주택',
  apartment: '아파트',
  store: '상가',
  building: '빌딩',
};

export function analyzeCategoryLabel(cat: AnalyzeCategory): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export function buildAuctionAnalyzeUrl(auctionItemId: number): string {
  const params = new URLSearchParams({
    panel: 'analyze',
    auctionMode: '1',
    auctionId: String(auctionItemId),
  });
  return `/?${params.toString()}`;
}

export function auctionItemSummary(item: Pick<AuctionListItem, 'caseNumber' | 'address' | 'usageType' | 'courtName'>): string {
  const parts = [item.courtName, item.caseNumber, item.usageType].filter(Boolean);
  return parts.join(' · ');
}
