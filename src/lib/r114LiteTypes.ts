export type R114TradeType = 'sale' | 'jeonse' | 'wolse';

export interface R114LiteTrade {
  contractDate: string | null;
  supplyArea: number | null;
  exclusiveArea?: number | null;
  pyeongApprox: number | null;
  priceMan: number | null;
  depositMan: number | null;
  monthlyRentMan: number | null;
}

export interface R114LitePyeongType {
  pyeongApprox: number;
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
  pyeongFilter: number | null;
}

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

export interface R114LiteDetailResponse {
  success: boolean;
  data?: {
    complex: R114LiteComplex;
    pyeongTypes: R114LitePyeongType[];
    pyeongAreaStats?: R114LitePyeongAreaStats[];
    trades: Record<R114TradeType, R114LiteTrade[]>;
    stats: R114LiteStats;
  };
  message?: string;
}
