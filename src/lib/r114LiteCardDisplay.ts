import type { ApartmentDealMode } from './apartmentDiscoverFilters';
import { riseRateToneClass } from './apartmentDiscoverFilters';
import { formatRiseRate6m, formatAvgPrice1mEok } from './r114LiteTrades';

export type R114LiteCardStatsFallback = {
  riseRate6m?: number | null;
  avgPrice1m?: number | null;
  area?: number | null;
  jeonseRiseRate6m?: number | null;
  avgJeonseDeposit1m?: number | null;
  wolseRiseRate6m?: number | null;
  avgWolseMonthlyRent1m?: number | null;
};

function formatPriceManShort(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '-';
  if (man >= 10000) {
    const eok = Math.floor(man / 10000);
    const rest = man % 10000;
    if (rest === 0) return `${eok.toLocaleString()}억`;
    return `${eok.toLocaleString()}억 ${rest.toLocaleString()}`;
  }
  return `${Math.round(man).toLocaleString()}만`;
}

function pickLiteModeStats(dealMode: ApartmentDealMode, fb: R114LiteCardStatsFallback) {
  if (dealMode === 'jeonse') {
    return {
      riseRate6m: fb.jeonseRiseRate6m ?? null,
      price1m: fb.avgJeonseDeposit1m ?? null,
      formatPrice: formatAvgPrice1mEok,
    };
  }
  if (dealMode === 'wolse') {
    return {
      riseRate6m: fb.wolseRiseRate6m ?? null,
      price1m: fb.avgWolseMonthlyRent1m ?? null,
      formatPrice: (man: number | null | undefined) => {
        if (man == null || !Number.isFinite(man) || man <= 0) return '-';
        return `${Math.round(man).toLocaleString()}만`;
      },
    };
  }
  return {
    riseRate6m: fb.riseRate6m ?? null,
    price1m: fb.avgPrice1m ?? null,
    formatPrice: formatAvgPrice1mEok,
  };
}

/** Lite discover — 매매·전세·월세 동일 3열: 6개월 | 전용 | 최근 1개월 */
export function buildLiteCardDisplay(
  dealMode: ApartmentDealMode,
  fallback: R114LiteCardStatsFallback,
) {
  const area = fallback.area;
  const areaStr = area != null && area > 0 ? `${Number(area).toFixed(2)}㎡` : '-';
  const mode = pickLiteModeStats(dealMode, fallback);
  const riseStr = formatRiseRate6m(mode.riseRate6m);
  const priceStr = mode.formatPrice(mode.price1m);

  return {
    col1Label: '6개월',
    col1Value: riseStr,
    col1ValueClassName: riseRateToneClass(mode.riseRate6m ?? null),
    col2Label: '전용면적',
    col2Value: areaStr,
    col3Label: '최근 1개월',
    col3Value: priceStr,
  };
}

export type R114LiteDetailStatsSource = R114LiteCardStatsFallback & {
  exclusiveAreaM2?: number | null;
  saleCount6m?: number;
  jeonseCount6m?: number;
  wolseCount6m?: number;
  tradeSparse?: boolean;
};

export function isLiteModeSparse(
  dealMode: ApartmentDealMode,
  source: R114LiteDetailStatsSource,
): boolean {
  if (dealMode === 'jeonse') return (source.jeonseCount6m ?? 0) === 0;
  if (dealMode === 'wolse') return (source.wolseCount6m ?? 0) === 0;
  return source.tradeSparse ?? (source.saleCount6m ?? 0) === 0;
}

export function buildLiteDetailStatsDisplay(
  dealMode: ApartmentDealMode,
  source: R114LiteDetailStatsSource,
) {
  return buildLiteCardDisplay(dealMode, {
    riseRate6m: source.riseRate6m,
    avgPrice1m: source.avgPrice1m,
    area: source.exclusiveAreaM2 ?? source.area,
    jeonseRiseRate6m: source.jeonseRiseRate6m,
    avgJeonseDeposit1m: source.avgJeonseDeposit1m,
    wolseRiseRate6m: source.wolseRiseRate6m,
    avgWolseMonthlyRent1m: source.avgWolseMonthlyRent1m,
  });
}

export { formatPriceManShort };
