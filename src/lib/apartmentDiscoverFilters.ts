import { PYEONG_FILTER_MAX } from './aptDiscoverArea';
import { heatingMatchesFilter, normalizeHeatingType } from './apartmentHeatingTypes';
import { loadCompareProfile } from './apartmentCompareBasket';
import {
  PRICE_FILTER_MAX_EOK,
  isPriceFilterActive,
} from './aptDiscoverPrice';

export type ApartmentDealMode = 'sale' | 'jeonse' | 'wolse';

export type ApartmentDiscoverSort =
  | 'default'
  | 'rise_desc'
  | 'rise_asc'
  | 'trade_desc'
  | 'trade_asc';

export type ApartmentDiscoverFilters = {
  dealMode: ApartmentDealMode;
  /** 전용면적 → 평 구간 (0~40, 전체=0~40) */
  pyeongMin: number;
  pyeongMax: number;
/** @deprecated 예산 필드 — 마이그레이션용 */
  budgetEok?: string;
  firstTimeBuyer: boolean;
  /** 매매가 구간 (억) — 0 ~ PRICE_FILTER_MAX_EOK 전체=필터 없음 */
  priceMinEok: number;
  priceMaxEok: number;
  /** @deprecated → priceMinEok/priceMaxEok */
  budgetFilterMinEok?: number;
  budgetFilterMaxEok?: number | null;
  sortBy: ApartmentDiscoverSort;
  minJeonseRatePercent: number | null;
  maxJeonseRatePercent: number | null;
  minGapMan: number | null;
  maxGapMan: number | null;
  minHouseholds: number | null;
  maxBuildingAgeYears: number | null;
  minParkingPerHousehold: number | null;
  maxParkingPerHousehold: number | null;
  maxElementaryNavMinutes: number | null;
  entranceTypes: string[];
  heatingTypes: string[];
};

export const APARTMENT_DISCOVER_FILTERS_KEY = 'apartment_discover_filters_v3';

export const ENTRANCE_OPTIONS = ['계단식', '복도식', '복합식'];
export const HEATING_OPTIONS = ['지역난방', '개별난방', '중앙난방'];

export const SORT_OPTIONS: { id: ApartmentDiscoverSort; label: string }[] = [
  { id: 'default', label: '기본' },
  { id: 'rise_desc', label: '6개월 상승률 높은순' },
  { id: 'rise_asc', label: '6개월 상승률 낮은순' },
  { id: 'trade_desc', label: '거래량 많은순' },
  { id: 'trade_asc', label: '거래량 적은순' },
];

export function defaultApartmentDiscoverFilters(): ApartmentDiscoverFilters {
  return {
    dealMode: 'sale',
    pyeongMin: 0,
    pyeongMax: PYEONG_FILTER_MAX,
    budgetEok: '',
    firstTimeBuyer: true,
    priceMinEok: 0,
    priceMaxEok: PRICE_FILTER_MAX_EOK,
    sortBy: 'default',
    minJeonseRatePercent: null,
    maxJeonseRatePercent: null,
    minGapMan: null,
    maxGapMan: null,
    minHouseholds: null,
    maxBuildingAgeYears: null,
    minParkingPerHousehold: null,
    maxParkingPerHousehold: null,
    maxElementaryNavMinutes: null,
    entranceTypes: [],
    heatingTypes: [],
  };
}

export function loadApartmentDiscoverFilters(): ApartmentDiscoverFilters {
  if (typeof window === 'undefined') return defaultApartmentDiscoverFilters();
  try {
    const raw = localStorage.getItem(APARTMENT_DISCOVER_FILTERS_KEY)
      ?? localStorage.getItem('apartment_discover_filters_v2');
    const prof = loadCompareProfile();
    const withProfile = {
      ...defaultApartmentDiscoverFilters(),
      firstTimeBuyer: prof.firstTimeBuyer !== false,
    };
    if (!raw) return withProfile;
    const parsed = JSON.parse(raw) as Partial<ApartmentDiscoverFilters> & {
      areaPresetM2?: number | null;
      budgetFilterMinEok?: number;
      budgetFilterMaxEok?: number | null;
    };
    const merged = { ...withProfile, ...parsed };
    if (parsed.priceMinEok == null && parsed.budgetFilterMinEok != null) {
      merged.priceMinEok = parsed.budgetFilterMinEok;
    }
    if (parsed.priceMaxEok == null) {
      if (parsed.budgetFilterMaxEok != null) {
        merged.priceMaxEok = parsed.budgetFilterMaxEok;
      } else if (parsed.budgetEok?.trim()) {
        merged.priceMaxEok = PRICE_FILTER_MAX_EOK;
      }
    }
    if (merged.priceMinEok == null) merged.priceMinEok = 0;
    if (merged.priceMaxEok == null) merged.priceMaxEok = PRICE_FILTER_MAX_EOK;
    if (parsed.areaPresetM2 != null && parsed.pyeongMin == null) {
      const py = parsed.areaPresetM2 / 3.3058;
      const band = Math.floor(py / 10) * 10;
      merged.pyeongMin = Math.max(0, band);
      merged.pyeongMax = Math.min(PYEONG_FILTER_MAX, band + 10);
    }
    if (merged.pyeongMin == null) merged.pyeongMin = 0;
    if (merged.pyeongMax == null) merged.pyeongMax = PYEONG_FILTER_MAX;
    delete (merged as { budgetFilterEnabled?: boolean }).budgetFilterEnabled;
    return merged;
  } catch {
    return defaultApartmentDiscoverFilters();
  }
}

export function saveApartmentDiscoverFilters(f: ApartmentDiscoverFilters) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APARTMENT_DISCOVER_FILTERS_KEY, JSON.stringify(f));
  window.dispatchEvent(new CustomEvent('apartment-discover-filters-updated'));
}

export type ApartmentCardSnapshot = {
  exclusiveAreaM2?: number | null;
  riseRate6m?: number | null;
  avgPrice1m?: number | null;
  tradeCount6m?: number;
  gapPriceMan?: number | null;
  jeonseRatePercent?: number | null;
  avgJeonseDepositMan?: number | null;
  hardware?: {
    householdCount?: number | null;
    buildingAgeYears?: number | null;
    parkingPerHousehold?: number | null;
    entranceType?: string | null;
  } | null;
  elementarySchoolNavMinutes?: number | null;
  optional?: { rows?: { id: string; value: string; label?: string }[] };
};

export function cardHeatingValue(card: ApartmentCardSnapshot | undefined): string | null {
  const row = card?.optional?.rows?.find((r) => r.id === 'heating');
  const raw = row?.value?.trim() || null;
  return raw ? normalizeHeatingType(raw) || raw : null;
}

export function resolveAreaForCard(
  centerM2: number | null | undefined,
  reportArea?: number | null,
): number | null {
  if (centerM2 != null && centerM2 > 0) return centerM2;
  if (reportArea != null && reportArea > 0) return reportArea;
  return null;
}

export function hasActiveApartmentCardFilters(filters: ApartmentDiscoverFilters): boolean {
  return (
    filters.minJeonseRatePercent != null ||
    filters.maxJeonseRatePercent != null ||
    filters.minGapMan != null ||
    filters.maxGapMan != null ||
    (filters.minHouseholds != null && filters.minHouseholds > 0) ||
    (filters.maxBuildingAgeYears != null && filters.maxBuildingAgeYears > 0) ||
    filters.minParkingPerHousehold != null ||
    filters.maxParkingPerHousehold != null ||
    (filters.maxElementaryNavMinutes != null && filters.maxElementaryNavMinutes > 0) ||
    filters.entranceTypes.length > 0 ||
    filters.heatingTypes.length > 0
  );
}

function inRange(
  v: number | null | undefined,
  min: number | null,
  max: number | null,
): boolean {
  if (min == null && max == null) return true;
  if (v == null || Number.isNaN(v)) return false;
  if (min != null && v < min) return false;
  if (max != null && v > max) return false;
  return true;
}

export function passesApartmentDiscoverFilters(
  item: {
    category?: string;
    avgPrice1m?: number | null;
  },
  card: ApartmentCardSnapshot | undefined,
  filters: ApartmentDiscoverFilters,
): boolean {
  const cat = (item.category || '').toLowerCase();
  const isApt = !cat || cat.includes('apartment') || cat.includes('아파트');
  if (!isApt) return true;

  if (isPriceFilterActive(filters.priceMinEok, filters.priceMaxEok)) {
    const price = card?.avgPrice1m ?? item.avgPrice1m;
    if (price != null && price > 0) {
      const minMan = Math.max(0, filters.priceMinEok) * 10000;
      const maxMan = filters.priceMaxEok * 10000;
      if (maxMan > 0 && price > maxMan) return false;
      if (minMan > 0 && price < minMan) return false;
    } else {
      return false;
    }
  }

  if (!card) {
    if (hasActiveApartmentCardFilters(filters)) return false;
    return true;
  }

  if (!inRange(card.jeonseRatePercent, filters.minJeonseRatePercent, filters.maxJeonseRatePercent)) {
    if (filters.minJeonseRatePercent != null || filters.maxJeonseRatePercent != null) return false;
  }

  if (!inRange(card.gapPriceMan, filters.minGapMan, filters.maxGapMan)) {
    if (filters.minGapMan != null || filters.maxGapMan != null) return false;
  }

  if (filters.minHouseholds != null && filters.minHouseholds > 0) {
    const h = card?.hardware?.householdCount;
    if (h == null || h < filters.minHouseholds) return false;
  }

  if (filters.maxBuildingAgeYears != null && filters.maxBuildingAgeYears > 0) {
    const age = card?.hardware?.buildingAgeYears;
    if (age == null || age > filters.maxBuildingAgeYears) return false;
  }

  if (!inRange(card.hardware?.parkingPerHousehold, filters.minParkingPerHousehold, filters.maxParkingPerHousehold)) {
    if (filters.minParkingPerHousehold != null || filters.maxParkingPerHousehold != null) return false;
  }

  if (filters.maxElementaryNavMinutes != null && filters.maxElementaryNavMinutes > 0) {
    const m = card?.elementarySchoolNavMinutes;
    if (m == null || m > filters.maxElementaryNavMinutes) return false;
  }

  if (filters.entranceTypes.length > 0) {
    const ent = card?.hardware?.entranceType;
    if (!ent || !filters.entranceTypes.some((t) => ent.includes(t))) return false;
  }

  if (filters.heatingTypes.length > 0) {
    const row = card?.optional?.rows?.find((r) => r.id === 'heating');
    const heatRaw = row?.value?.trim() || null;
    if (!heatingMatchesFilter(heatRaw, filters.heatingTypes)) return false;
  }

  return true;
}

export function sortApartmentDiscoverList<T extends { id: string }>(
  list: T[],
  filters: ApartmentDiscoverFilters,
  cardFor: (item: T) => ApartmentCardSnapshot | undefined,
): T[] {
  if (filters.sortBy === 'default') return list;
  const sorted = [...list];
  sorted.sort((a, b) => {
    const ca = cardFor(a);
    const cb = cardFor(b);
    if (filters.sortBy === 'rise_desc' || filters.sortBy === 'rise_asc') {
      const va = ca?.riseRate6m ?? -Infinity;
      const vb = cb?.riseRate6m ?? -Infinity;
      return filters.sortBy === 'rise_desc' ? vb - va : va - vb;
    }
    const ta = ca?.tradeCount6m ?? -1;
    const tb = cb?.tradeCount6m ?? -1;
    return filters.sortBy === 'trade_desc' ? tb - ta : ta - tb;
  });
  return sorted;
}

/** 6개월 상승률 — 상승 빨강·하락 파랑 (한국 부동산 관례) */
export function riseRateToneClass(rate: number | null | undefined): string {
  if (rate == null || rate === 0) return 'text-slate-600';
  if (rate > 0) return 'text-red-500';
  return 'text-blue-500';
}

function formatRiseRate6mCell(
  card: ApartmentCardSnapshot | undefined,
  fallback: { riseRate6m?: number | null },
  areaLocked: boolean,
): { value: string; className: string } {
  const rate =
    card?.riseRate6m != null
      ? card.riseRate6m
      : areaLocked
        ? null
        : fallback.riseRate6m ?? null;

  if (rate == null) {
    return { value: '-', className: 'text-slate-600' };
  }

  const value =
    card?.riseRate6m != null
      ? `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%`
      : `${rate > 0 ? '+' : ''}${rate}%`;

  return { value, className: riseRateToneClass(rate) };
}

export function buildApartmentCardDisplay(
  dealMode: ApartmentDealMode,
  card: ApartmentCardSnapshot | undefined,
  fallback: { riseRate6m?: number | null; avgPrice1m?: number | null; area?: number | null },
  options: { areaLocked: boolean },
) {
  const area = card?.exclusiveAreaM2 ?? fallback.area;
  const areaStr = area != null && area > 0 ? `${Math.round(area)}㎡` : '-';
  const wolseRow = card?.optional?.rows?.find((r) => r.id === 'wolse_yield');

  const priceFromCard = card?.avgPrice1m;
  const priceStr =
    priceFromCard != null && priceFromCard > 0
      ? `${(priceFromCard / 10000).toFixed(1)}억`
      : options.areaLocked
        ? '-'
        : fallback.avgPrice1m != null && fallback.avgPrice1m > 0
          ? `${(fallback.avgPrice1m / 10000).toFixed(1)}억`
          : '-';

  if (dealMode === 'jeonse') {
    const noJeonse =
      card?.jeonseRatePercent == null
      && (card?.avgJeonseDepositMan == null || card.avgJeonseDepositMan <= 0);
    return {
      col1Label: '전세가율',
      col1Value: card?.jeonseRatePercent != null ? `${card.jeonseRatePercent.toFixed(1)}%` : '-',
      col2Label: '전용면적',
      col2Value: areaStr,
      col3Label: '전세(추정)',
      col3Value:
        card?.avgJeonseDepositMan != null && card.avgJeonseDepositMan > 0
          ? `${(card.avgJeonseDepositMan / 10000).toFixed(1)}억`
          : noJeonse
            ? '최근 전세 추정 없음'
            : '-',
    };
  }

  if (dealMode === 'wolse') {
    const rise6m = formatRiseRate6mCell(card, fallback, options.areaLocked);
    return {
      col1Label: '월세수익',
      col1Value: wolseRow?.value?.split('·')[0] || '-',
      col2Label: '전용면적',
      col2Value: areaStr,
      col3Label: '6개월',
      col3Value: rise6m.value,
      col3ValueClassName: rise6m.className,
    };
  }

  const rise6m = formatRiseRate6mCell(card, fallback, options.areaLocked);
  return {
    col1Label: '6개월',
    col1Value: rise6m.value,
    col1ValueClassName: rise6m.className,
    col2Label: '전용면적',
    col2Value:
      area != null && area > 0
        ? `${Number(area).toFixed(1)}㎡`
        : '-',
    col3Label: '최근 1개월',
    col3Value: priceStr,
  };
}

export function discoverFiltersActiveCount(f: ApartmentDiscoverFilters): number {
  let n = 0;
  if (isPriceFilterActive(f.priceMinEok, f.priceMaxEok)) n += 1;
  if (f.pyeongMin > 0 || f.pyeongMax < PYEONG_FILTER_MAX) n += 1;
  if (f.minJeonseRatePercent != null || f.maxJeonseRatePercent != null) n += 1;
  if (f.minGapMan != null || f.maxGapMan != null) n += 1;
  if (f.minHouseholds != null) n += 1;
  if (f.maxBuildingAgeYears != null) n += 1;
  if (f.minParkingPerHousehold != null || f.maxParkingPerHousehold != null) n += 1;
  if (f.maxElementaryNavMinutes != null) n += 1;
  if (f.entranceTypes.length) n += 1;
  if (f.heatingTypes.length) n += 1;
  if (f.sortBy !== 'default') n += 1;
  return n;
}

/** 필터 시트·빈 목록 안내 — 데이터 NULL 제외 정책 설명 */
export function apartmentDiscoverFilterHints(filters: ApartmentDiscoverFilters): string[] {
  const hints: string[] = [];
  if (filters.minJeonseRatePercent != null || filters.maxJeonseRatePercent != null) {
    hints.push('전세가율·갭은 최근 6개월 매매·전세 batch로 추정합니다. 값이 없는 단지는 목록에서 제외됩니다.');
  }
  if (filters.minGapMan != null || filters.maxGapMan != null) {
    if (!hints.some((h) => h.includes('갭'))) {
      hints.push('갭가격이 없는 단지(매매·전세 추정 부족)는 갭 필터 시 제외됩니다.');
    }
  }
  if (filters.heatingTypes.length > 0) {
    hints.push('난방 필터: 정보가 있는 단지만 방식으로 걸러지고, 난방 미등록 단지는 그대로 포함됩니다.');
  }
  return hints;
}

export function hasStrictDataFilters(filters: ApartmentDiscoverFilters): boolean {
  return (
    filters.minJeonseRatePercent != null
    || filters.maxJeonseRatePercent != null
    || filters.minGapMan != null
    || filters.maxGapMan != null
  );
}
