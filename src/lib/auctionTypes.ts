export type AuctionMeritLabel = 'high' | 'medium' | 'low';

export interface AuctionPriceAnalysis {
  analysisType: 'PRICE_ONLY' | 'FULL_RIGHTS' | 'DETECTIVE_REPORT';
  suggestedBidMan: number | null;
  suggestedBidSource?: 'detective' | 'tier1' | null;
  fairValueMan: number | null;
  bidRatioPct: number | null;
  meritLabel: AuctionMeritLabel;
  summaryText: string;
}

export interface AuctionListItem {
  id: number;
  source: string;
  externalId: string;
  itemType: 'in_progress' | 'scheduled' | 'sold';
  caseNumber: string;
  courtName: string | null;
  itemNumber: string | null;
  address: string | null;
  usageType: string | null;
  appraisalPriceMan: number | null;
  minPriceMan: number | null;
  soldPriceMan: number | null;
  failCount: number;
  saleDate: string | null;
  statusName: string | null;
  isPackaged: boolean;
  hasDuplicateCase: boolean;
  priceAnalysis: AuctionPriceAnalysis | null;
  linkedReportId?: number | null;
  /** 소유권 지분 매각 — 탐정 자동 추정 불가 */
  analysisBlocked?: boolean;
  analysisBlockReason?: string | null;
  analysisBlockMessage?: string | null;
  canAnalyze?: boolean;
}

export interface AuctionListResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  items: AuctionListItem[];
  message?: string;
}

export interface AuctionDetailResponse {
  success: boolean;
  item?: AuctionListItem & {
    courtCode?: string | null;
    saleDatetime?: string | null;
    dong?: string | null;
    sigungu?: string | null;
    sido?: string | null;
  };
  message?: string;
}
