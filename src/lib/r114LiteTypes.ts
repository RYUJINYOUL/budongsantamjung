export type R114TradeType = 'sale' | 'jeonse' | 'wolse';

export interface R114LiteTrade {
  contractDate: string | null;
  supplyArea: number | null;
  exclusiveArea?: number | null;
  pyeongApprox: number | null;
  /** RTMS batch ingest row only */
  floor?: string | null;
  priceMan: number | null;
  depositMan: number | null;
  monthlyRentMan: number | null;
}

export interface R114LitePyeongType {
  pyeongApprox: number;
  /** merge된 원본 pyeong_approx (33+34 → [33,34]) */
  mergedPyeongApproxs?: number[];
  households: number;
  supplyMin: number;
  supplyMax: number;
  exclusiveAreaMin: number;
  exclusiveAreaMax: number;
}

export interface R114LiteComplex {
  r114PropId: string;
  title: string;
  city: string | null;
  gu: string | null;
  dong: string | null;
  jibun: string | null;
  address: string | null;
  moveIn: string | null;
  householdCount: number | null;
  buildingCount: number | null;
  maxFloor: number | null;
  floorAreaRatio: number | null;
  buildingCoverageRatio: number | null;
  parkingTotal: number | null;
  heatingSystem: string | null;
  heatingFuel: string | null;
  floorType: string | null;
  areaDistribution: string | null;
  lat: number | null;
  lng: number | null;
  collectedAt: string | null;
  rtmsAptSeq: string | null;
  rtmsAptNm: string | null;
  rtmsVerifiedAt: string | null;
}

export interface R114LiteStats {
  saleCount1m: number;
  saleCount6m: number;
  saleTotal: number;
  jeonseTotal?: number;
  wolseTotal?: number;
  jeonseCount6m: number;
  wolseCount6m: number;
  tradeTotal: number;
  tradeSparse: boolean;
  riseRate6m?: number | null;
  avgPrice1m?: number | null;
  avgPriceMonth?: string | null;
  exclusiveAreaM2?: number | null;
  jeonseRiseRate6m?: number | null;
  avgJeonseDeposit1m?: number | null;
  wolseRiseRate6m?: number | null;
  avgWolseMonthlyRent1m?: number | null;
  tradeLimit: number;
  tradeOffset?: number;
  pyeongFilter: number | null;
}

export type R114LiteTradesPageResponse = {
  success: boolean;
  tradesOnly?: boolean;
  data?: { trades: Record<R114TradeType, R114LiteTrade[]> };
  message?: string;
};

export interface R114LitePyeongAreaStats {
  pyeongApprox: number;
  supplyMin: number | null;
  supplyMax: number | null;
  exclusiveAreaMin: number | null;
  exclusiveAreaMax: number | null;
  households: number;
  riseRate6m?: number | null;
  avgPrice1m?: number | null;
  avgPriceMonth?: string | null;
  exclusiveAreaM2?: number | null;
  saleCount6m: number;
  jeonseCount6m?: number;
  wolseCount6m?: number;
  jeonseRiseRate6m?: number | null;
  avgJeonseDeposit1m?: number | null;
  wolseRiseRate6m?: number | null;
  avgWolseMonthlyRent1m?: number | null;
  tradeSparse: boolean;
}

export interface R114LiteAnchorTradeInput {
  priceMan: number | '';
  exclusiveAreaM2: number | '';
  contractYearMonth: string;
}

export interface R114LiteResolveAptSeqRequest {
  portalTitle: string;
  portalAddress: string;
  anchorTrades: R114LiteAnchorTradeInput[];
}

export interface R114LiteResolveAptSeqResponse {
  success: boolean;
  alreadyVerified?: boolean;
  message?: string;
  code?: string;
  data?: {
    r114PropId: string;
    rtmsAptSeq: string;
    rtmsAptNm?: string | null;
    rtmsVerifiedAt: string;
    matchCount?: number;
    masterSynced?: number;
  };
  meta?: {
    verdict?: string;
    matchCount?: number;
    joinStatus?: string;
  };
}

export interface R114LiteDetailResponse {
  success: boolean;
  data?: {
    complex: R114LiteComplex;
    pyeongTypes: R114LitePyeongType[];
    pyeongAreaStats?: R114LitePyeongAreaStats[];
    trades: Record<R114TradeType, R114LiteTrade[]>;
    stats: R114LiteStats;
  };
  latestReportId?: string | null;
  hasReport?: boolean;
  message?: string;
}

export interface R114LiteContextSchool {
  school_id?: string;
  school_name?: string;
  school_level?: string;
  distance?: number;
  total_students?: number;
  student_growth_rate?: number;
}

export interface R114LiteContextRow {
  id: string;
  label: string;
  value: string;
  empty?: boolean;
}

export interface R114LiteContextDetails {
  schoolDistrict?: { schools?: R114LiteContextSchool[] };
  academy?: { within1km?: number | null; within2km?: number | null };
  nearbyInfrastructure?: {
    radiusKm?: number;
    items?: Array<{
      id?: number;
      name: string;
      category: string;
      distanceM?: number | null;
      walkMin?: number | null;
    }>;
  };
  developmentEvents?: {
    items?: Array<{
      name: string;
      category: string;
      distanceM?: number | null;
      walkMin?: number | null;
      progress_score?: number | null;
      ui_label?: string | null;
    }>;
    radiusKm?: number;
  };
  redevelopment?: {
    isInZone?: boolean;
    projects?: Array<{ title: string; stage?: string | null; gosiDate?: string | null }>;
  };
  dynamicNews?: {
    items?: Array<{ title: string; date?: string | null; url?: string | null }>;
  };
  population?: {
    summary?: string;
    movement?: { netMigration?: number; trend?: string };
  };
}

export interface R114LiteContextResponse {
  success: boolean;
  message?: string;
  data?: {
    sigunguCd: string | null;
    sigunguName: string | null;
    rows: R114LiteContextRow[];
    details?: R114LiteContextDetails;
  };
  meta?: { source?: string; available?: boolean };
}
