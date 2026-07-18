import type { AnalysisDetailInput } from './collectAnalysisInputData';
import {
  buildDdangyaRawAdText,
  buildDdangyaSellerQnaText,
  fetchDdangyaDetail,
  getDdangyaAddress,
} from './ddangyaRawAdText';

export interface UrlExtractPrefill {
  timestamp: number;
  category: string;
  address: string;
  lat: number;
  lng: number;
  pnu: string | null;
  polygon: { lat: number; lng: number }[] | null;
  detailInput: Partial<AnalysisDetailInput>;
  summary: string;
  /** 땅야 등에서 수집한 상세 광고 원문 (AI 추출·분석 보조용) */
  rawAdText?: string;
  /** 땅야 Q&A · 호갱노노 설명 · 밸류맵 업종현황 → AI 정밀 분석 특이사항 prefill */
  specialNotes?: string;
}

async function scrapeProxy(url: string, type: string) {
  const res = await fetch('/api/scrape-hogangnono', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details || '데이터를 가져오는데 실패했습니다.');
  }

  if (type === 'naver-print') return res.text();
  return res.json();
}

export function parseHanpriceToManwon(value: unknown): number | '' {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number' && !Number.isNaN(value)) {
    // 땅야 price 등: 만원 단위. 1억(원) 이상이면 원 단위로 간주
    if (value >= 100_000_000) return Math.round(value / 10000);
    return Math.round(value);
  }

  let text = String(value).replace(/,/g, '').trim();
  text = text.replace(/^(매매|전세|전|월세|임대)\s*/u, '');
  text = text.replace(/\s*원\s*$/u, '').trim();

  let total = 0;

  const eokMatch = text.match(/(\d+(?:\.\d+)?)\s*억/u);
  if (eokMatch) {
    total += parseFloat(eokMatch[1]) * 10000;
    text = text.slice(text.indexOf('억') + 1).trim();
  }

  if (text) {
    total += parseKoreanManwonSuffix(text);
  }

  return total > 0 ? Math.round(total) : '';
}

/** "9천만", "9천", "500만", "3천" 등 → 만원 단위 */
function parseKoreanManwonSuffix(text: string): number {
  let sum = 0;
  let rest = text.trim();

  const cheonMan = rest.match(/(\d+(?:\.\d+)?)\s*천\s*만/u);
  if (cheonMan) {
    sum += parseFloat(cheonMan[1]) * 1000;
    rest = rest.replace(cheonMan[0], '').trim();
  } else {
    const cheon = rest.match(/(\d+(?:\.\d+)?)\s*천/u);
    if (cheon) {
      sum += parseFloat(cheon[1]) * 1000;
      rest = rest.replace(cheon[0], '').trim();
    }
  }

  const man = rest.match(/(\d+(?:\.\d+)?)\s*만/u);
  if (man) {
    sum += parseFloat(man[1]);
    rest = rest.replace(man[0], '').trim();
  }

  if (!sum && rest) {
    const num = parseFloat(rest.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(num)) sum += num;
  }

  return sum;
}

function resolveDdangyaSalePriceManwon(landData: Record<string, unknown>): number | '' {
  const numericPrice = landData.price;
  if (typeof numericPrice === 'number' && numericPrice > 0 && !Number.isNaN(numericPrice)) {
    return parseHanpriceToManwon(numericPrice);
  }
  return parseHanpriceToManwon(landData.hanprice ?? landData.price);
}

function parseWonToManwon(won: number | null | undefined): number | '' {
  if (!won || Number.isNaN(won)) return '';
  return Math.round(won / 10000);
}

function mapValueupCategoryCode(code?: string): string | null {
  if (!code) return null;
  const m: Record<string, string> = {
    LD: 'land',
    APT: 'apartment',
    HD: 'house',
    CB: 'building',
    CP: 'store',
    OF: 'apartment',
    LAND: 'land',
    BUILDING: 'building',
    GENERAL_BUILDING: 'building',
    HOUSE: 'house',
    DETACHED_HOUSE: 'house',
    STORE: 'store',
    SHOP: 'store',
    APARTMENT: 'apartment',
    OFFICETEL: 'apartment',
  };
  return m[code] || null;
}

type ValueupUrlKind = 'trades' | 'items';

function parseValueupUrl(propertyUrl: string): { kind: ValueupUrlKind; id: string } | null {
  const itemsMatch = propertyUrl.match(/\/properties\/items\/(\d+)/);
  if (itemsMatch) return { kind: 'items', id: itemsMatch[1] };

  const tradesMatch = propertyUrl.match(/\/properties\/trades(?:-partitions)?\/(\d+)/);
  if (tradesMatch) return { kind: 'trades', id: tradesMatch[1] };

  return null;
}

function mapValueupCategory(code?: string): string {
  const mapped = mapValueupCategoryCode(code);
  return mapped || 'land';
}

function mapValueupItemCategory(item: {
  propertyType1?: { code?: string };
  propertyType2?: { code?: string };
  propertyType3?: { code?: string };
}): string {
  return (
    mapValueupCategoryCode(item.propertyType1?.code)
    || mapValueupCategoryCode(item.propertyType2?.code)
    || mapValueupCategoryCode(item.propertyType3?.code)
    || 'land'
  );
}

function resolveValueupItemArea(
  item: Record<string, unknown>,
  category: string,
): number | '' {
  const partition = item.dealPartitionArea != null ? Number(item.dealPartitionArea) : NaN;
  const building = item.dealBuildingTotalArea != null ? Number(item.dealBuildingTotalArea) : NaN;
  const land = item.dealLandArea != null ? Number(item.dealLandArea) : NaN;

  if (category === 'store' && !Number.isNaN(partition) && partition > 0) return partition;
  if ((category === 'building' || category === 'apartment') && !Number.isNaN(building) && building > 0) {
    return building;
  }
  if (!Number.isNaN(land) && land > 0) return land;
  if (!Number.isNaN(partition) && partition > 0) return partition;
  if (!Number.isNaN(building) && building > 0) return building;
  return '';
}

/** 밸류맵 매물(items) 설명 → AI 특이사항 */
function buildValueupItemSpecialNotes(item: Record<string, unknown>): string {
  const lines: string[] = [];
  const typeLabel = [
    (item.propertyType1 as { label?: string })?.label,
    (item.propertyType2 as { label?: string })?.label,
  ]
    .filter(Boolean)
    .join(' · ');
  if (typeLabel) lines.push(typeLabel);

  const line = item.explanationLine;
  const detail = item.explanationDetail;
  if (line != null && String(line).trim()) lines.push(String(line).trim());
  if (detail != null && String(detail).trim()) lines.push(String(detail).trim());

  return lines.join('\n\n').trim();
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined' || !window.kakao?.maps?.services) return null;

  return new Promise((resolve) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result: { y: string; x: string }[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result[0]) {
        resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
      } else {
        resolve(null);
      }
    });
  });
}

async function resolveCoordsAndPnu(
  address: string,
  lat?: number | null,
  lng?: number | null,
  pnu?: string | null,
): Promise<{ lat: number; lng: number; pnu: string | null; polygon: { lat: number; lng: number }[] | null }> {
  let resolvedLat = lat ?? null;
  let resolvedLng = lng ?? null;
  let resolvedPnu = pnu ?? null;
  let polygon: { lat: number; lng: number }[] | null = null;

  if ((!resolvedLat || !resolvedLng) && address) {
    const geo = await geocodeAddress(address);
    if (geo) {
      resolvedLat = geo.lat;
      resolvedLng = geo.lng;
    }
  }

  if (resolvedLat && resolvedLng) {
    try {
      const res = await fetch(`/api/vworld?lat=${resolvedLat}&lng=${resolvedLng}`);
      if (res.ok) {
        const data = await res.json();
        const features = data?.response?.result?.featureCollection?.features;
        if (features?.length) {
          resolvedPnu = resolvedPnu || features[0]?.properties?.pnu?.toString() || null;
        }
      }
    } catch {
      // PNU 없이도 진행
    }
  }

  if (!resolvedLat || !resolvedLng) {
    throw new Error('주소 좌표를 확인할 수 없습니다. 주소를 직접 검색해 주세요.');
  }

  return { lat: resolvedLat, lng: resolvedLng, pnu: resolvedPnu, polygon };
}

function buildPrefill(
  partial: Omit<UrlExtractPrefill, 'timestamp' | 'polygon'> & { polygon?: UrlExtractPrefill['polygon'] },
): UrlExtractPrefill {
  return {
    ...partial,
    polygon: partial.polygon ?? null,
    timestamp: Date.now(),
    detailInput: {
      transactionType: '매매',
      ...partial.detailInput,
    },
  };
}

function parseHogangnonoFloor(floor: unknown): number | '' {
  if (floor === null || floor === undefined || floor === '') return '';
  const str = String(floor).trim();
  if (!str) return '';
  const num = Number(str);
  if (!Number.isNaN(num) && str === String(num)) return num;
  return '';
}

/** 호갱노노 매물 설명 → AI 특이사항 (description, title, memo 등) */
function buildHogangnonoSpecialNotes(
  firstItem: Record<string, unknown>,
  hoInfo: Record<string, unknown>,
  aptInfo: Record<string, unknown>,
): string {
  const lines: string[] = [];

  const aptName = aptInfo.aptName ?? aptInfo.name;
  if (aptName) lines.push(String(aptName).trim());

  const hoLabel = hoInfo.hoName ?? hoInfo.ho ?? hoInfo.hoNum ?? firstItem.hoName;
  const description =
    firstItem.description ??
    firstItem.itemDescription ??
    firstItem.memo ??
    firstItem.content ??
    firstItem.title;

  const descStr = description != null ? String(description).trim() : '';
  if (descStr) {
    if (hoLabel && !descStr.startsWith(String(hoLabel))) {
      lines.push(`${hoLabel}. ${descStr}`);
    } else {
      lines.push(descStr);
    }
  } else if (hoLabel) {
    lines.push(String(hoLabel).trim());
  }

  const direction = firstItem.direction ?? hoInfo.direction;
  if (direction) lines.push(`향: ${String(direction).trim()}`);

  return lines.join('\n').trim();
}

async function extractHogangnono(propertyUrl: string): Promise<UrlExtractPrefill> {
  const match = propertyUrl.match(/item-catalog\/(\d+)/);
  if (!match) {
    throw new Error('올바른 호갱노노 URL이 아닙니다. item-catalog/숫자 형식이 필요합니다.');
  }

  const apiUrl = `https://hogangnono.com/api/v2/item-catalogs/${match[1]}?tradeType=0&offset=0&limit=20`;
  const data = await scrapeProxy(apiUrl, 'hogangnono');

  if (data.status !== 'success') throw new Error('호갱노노에서 데이터를 찾을 수 없습니다.');

  const aptInfo = data.data?.aptInfo;
  const hoInfo = data.data?.hoInfo;
  const firstItem = data.data?.items?.[0];
  if (!aptInfo || !hoInfo || !firstItem) {
    throw new Error('매물 정보가 완전하지 않습니다.');
  }

  const address = aptInfo.roadAddress || aptInfo.address || '';
  const coords = await resolveCoordsAndPnu(address);
  const specialNotes = buildHogangnonoSpecialNotes(firstItem, hoInfo, aptInfo);
  const floor = parseHogangnonoFloor(
    hoInfo.floor ?? hoInfo.floorLevel ?? hoInfo.floorType ?? firstItem.floor,
  );

  return buildPrefill({
    category: 'apartment',
    address,
    ...coords,
    specialNotes: specialNotes || undefined,
    detailInput: {
      salePrice: parseHanpriceToManwon(firstItem.deposit),
      area: hoInfo.privateArea ? Number(hoInfo.privateArea) : '',
      floor,
      transactionType: '매매',
    },
    summary: `${aptInfo.aptName} · ${firstItem.deposit?.toLocaleString?.() || firstItem.deposit}만원 · ${hoInfo.privateArea}㎡${specialNotes ? ' · 설명 포함' : ''}`,
  });
}

async function extractDdangya(propertyUrl: string): Promise<UrlExtractPrefill> {
  const detail = await fetchDdangyaDetail(propertyUrl);
  const { landData, isLanddeal, isAuction, uid } = detail;

  const address = getDdangyaAddress(landData, isLanddeal, uid);
  const lat = Number(landData.lat ?? landData.y ?? null) || null;
  const lng = Number(landData.lng ?? landData.x ?? null) || null;
  const pnu = (landData.pnu as string) || (isLanddeal ? uid : null);

  const salePrice = isAuction
    ? parseHanpriceToManwon(
        landData.minprice || landData.simpleminprice || landData.estimatedprice,
      )
    : resolveDdangyaSalePriceManwon(landData);

  const coords = await resolveCoordsAndPnu(address, lat, lng, pnu);
  const rawAdText = buildDdangyaRawAdText(detail);
  const specialNotes = buildDdangyaSellerQnaText(landData);

  return buildPrefill({
    category: 'land',
    address,
    ...coords,
    rawAdText,
    specialNotes: specialNotes || undefined,
    detailInput: {
      salePrice,
      area: landData.area ? Number(landData.area) : '',
      transactionType: '매매',
    },
    summary: `땅야 ${isLanddeal ? '실거래' : isAuction ? '경매' : '매물'} · ${address}${specialNotes ? ' · Q&A 포함' : ''}`,
  });
}

interface ValueupStoreItem {
  storeName?: string;
  branchName?: string;
  businessCategory?: string;
  floorName?: string;
  partitionName?: string;
}

interface ValueupStoresResponse {
  count?: number;
  contents?: ValueupStoreItem[];
}

function valueupStoreQuarterLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const baseYear = month < 3 ? year - 1 : year;
  const quarter = month < 3 ? 4 : Math.ceil((month + 1) / 3) - 1;
  return `${baseYear}.${quarter}분기 기준`;
}

function formatValueupStoreCell(value: unknown): string {
  const text = value != null ? String(value).trim() : '';
  return text || '-';
}

/** 밸류맵 업종현황(#store) → AI 특이사항 */
function buildValueupStoreSpecialNotes(stores: ValueupStoresResponse | null | undefined): string {
  const contents = stores?.contents;
  if (!contents?.length) return '';

  const count = stores?.count ?? contents.length;
  const lines: string[] = [
    '[업종현황]',
    `현재 총 ${count}개 업종이 영업중 (${valueupStoreQuarterLabel()})`,
    '층 | 호 | 상호명(지점명) | 업종소분류',
  ];

  for (const item of contents) {
    const floor = formatValueupStoreCell(item.floorName);
    const ho = formatValueupStoreCell(item.partitionName);
    const storeLabel = [item.storeName, item.branchName]
      .map((part) => (part != null ? String(part).trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim();
    const category = formatValueupStoreCell(item.businessCategory);
    lines.push(`${floor} | ${ho} | ${storeLabel || '-'} | ${category}`);
  }

  return lines.join('\n').trim();
}

async function fetchValueupStores(pnu: string): Promise<ValueupStoresResponse | null> {
  try {
    const data = await scrapeProxy(
      `https://www.valueupmap.com/api/properties/stores?pnu=${pnu}`,
      'valueup',
    );
    if (data && Array.isArray(data.contents)) {
      return data as ValueupStoresResponse;
    }
    return null;
  } catch {
    return null;
  }
}

async function extractValueupFromTrade(pnu: string): Promise<UrlExtractPrefill> {
  const data = await scrapeProxy(
    `https://www.valueupmap.com/api/properties/trades/${pnu}`,
    'valueup',
  );

  const trade = data?.trade;
  if (!trade) {
    throw new Error('밸류맵에서 해당 매물 정보를 찾을 수 없습니다.');
  }

  const address =
    data.address ||
    trade.lands?.[0]?.address ||
    data.roadAddress ||
    data.shortAddress ||
    '';

  const lat = Number(data.latitude);
  const lng = Number(data.longitude);

  if (!address) {
    throw new Error('밸류맵에서 주소 정보를 찾을 수 없습니다.');
  }
  if (!lat || !lng) {
    throw new Error('밸류맵 매물의 좌표 정보를 찾을 수 없습니다.');
  }

  const category = mapValueupCategory(trade.propertyType?.code);
  const coords = await resolveCoordsAndPnu(address, lat, lng, pnu);
  const storesData = await fetchValueupStores(pnu);
  const storeNotes = buildValueupStoreSpecialNotes(storesData);

  const area = trade.partitionArea
    ? Number(trade.partitionArea)
    : trade.buildingTotalArea
      ? Number(trade.buildingTotalArea)
      : trade.landArea
        ? Number(trade.landArea)
        : '';

  const floor = trade.partitionFloorName
    ? parseHogangnonoFloor(trade.partitionFloorName)
    : '';

  return buildPrefill({
    category,
    address,
    ...coords,
    specialNotes: storeNotes || undefined,
    detailInput: {
      salePrice: parseWonToManwon(trade.tradePrice),
      area: Number.isNaN(Number(area)) ? '' : area,
      floor,
      transactionType: '매매',
    },
    summary: `밸류맵 · ${address} · ${trade.propertyType?.label || '매물'}${storeNotes ? ' · 업종현황 포함' : ''}`,
  });
}

async function extractValueupFromItem(itemId: string): Promise<UrlExtractPrefill> {
  const data = await scrapeProxy(
    `https://www.valueupmap.com/api/plus/items/${itemId}`,
    'valueup',
  );

  const item = data?.item;
  if (!item) {
    throw new Error('밸류맵에서 해당 매물 정보를 찾을 수 없습니다.');
  }

  const pnu =
    data.pnu?.toString()
    || item.pnus?.[0]?.toString()
    || item.lands?.[0]?.pnu?.toString()
    || null;

  const address = item.address || item.roadAddress || item.shortAddress || '';
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);

  if (!address) {
    throw new Error('밸류맵에서 주소 정보를 찾을 수 없습니다.');
  }
  if (!lat || !lng) {
    throw new Error('밸류맵 매물의 좌표 정보를 찾을 수 없습니다.');
  }

  const category = mapValueupItemCategory(item);
  const coords = await resolveCoordsAndPnu(address, lat, lng, pnu);
  const itemNotes = buildValueupItemSpecialNotes(item);
  const storesData = pnu ? await fetchValueupStores(pnu) : null;
  const storeNotes = buildValueupStoreSpecialNotes(storesData);
  const specialNotes = [itemNotes, storeNotes].filter(Boolean).join('\n\n').trim();

  const typeLabel =
    [item.propertyType1?.label, item.propertyType2?.label].filter(Boolean).join(' · ')
    || '매물';

  return buildPrefill({
    category,
    address,
    ...coords,
    specialNotes: specialNotes || undefined,
    detailInput: {
      salePrice: parseWonToManwon(item.price),
      area: resolveValueupItemArea(item, category),
      transactionType: item.dealType?.code === 'JEONSE' ? '전세' : '매매',
      deposit:
        item.dealType?.code === 'JEONSE' && item.deposit
          ? parseWonToManwon(item.deposit)
          : '',
      monthlyRent:
        item.dealType?.code === 'MONTHLY_RENT' && item.monthlyRent
          ? parseWonToManwon(item.monthlyRent)
          : '',
    },
    summary: `밸류맵 · ${address} · ${typeLabel}${specialNotes ? ' · 설명 포함' : ''}`,
  });
}

async function extractValueup(propertyUrl: string): Promise<UrlExtractPrefill> {
  const parsed = parseValueupUrl(propertyUrl);
  if (!parsed) {
    throw new Error(
      '올바른 밸류맵 URL이 아닙니다. '
      + '/properties/items/{id}, /properties/trades/{pnu}, '
      + '/properties/trades-partitions/{pnu} 형식을 지원합니다.',
    );
  }

  if (parsed.kind === 'items') {
    return extractValueupFromItem(parsed.id);
  }

  return extractValueupFromTrade(parsed.id);
}

export async function extractPropertyFromUrl(propertyUrl: string): Promise<UrlExtractPrefill> {
  const url = propertyUrl.trim();
  if (!url) throw new Error('URL을 입력해주세요.');

  if (url.includes('hogangnono.com')) return extractHogangnono(url);
  if (url.includes('ddangya.com')) return extractDdangya(url);
  if (url.includes('valueupmap.com')) return extractValueup(url);

  throw new Error('지원하지 않는 URL입니다. 호갱노노, 땅야, 밸류맵 URL을 사용해주세요.');
}
