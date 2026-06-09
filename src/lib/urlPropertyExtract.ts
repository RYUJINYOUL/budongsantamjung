import type { AnalysisDetailInput } from './collectAnalysisInputData';
import {
  buildDdangyaRawAdText,
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
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.round(value);

  const cleaned = String(value).replace(/,/g, '').replace(/만원?/g, '').trim();
  const eok = cleaned.match(/(\d+(?:\.\d+)?)\s*억/);
  const manOnly = cleaned.match(/^(\d+(?:\.\d+)?)\s*만?$/);
  let total = 0;
  if (eok) total += parseFloat(eok[1]) * 10000;
  const manAfterEok = cleaned.match(/억\s*(\d+(?:\.\d+)?)/);
  if (manAfterEok) total += parseFloat(manAfterEok[1]);
  if (manOnly && !eok) total += parseFloat(manOnly[1]);
  if (!eok && !manOnly && !manAfterEok) {
    const num = parseFloat(cleaned);
    if (!Number.isNaN(num)) return Math.round(num);
  }
  return total > 0 ? Math.round(total) : '';
}

function parseWonToManwon(won: number | null | undefined): number | '' {
  if (!won || Number.isNaN(won)) return '';
  return Math.round(won / 10000);
}

function mapValueupCategory(code?: string): string {
  const m: Record<string, string> = {
    LD: 'land',
    APT: 'apartment',
    HD: 'house',
    CB: 'building',
    CP: 'store',
    OF: 'apartment',
  };
  return m[code || ''] || 'land';
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

  return buildPrefill({
    category: 'apartment',
    address,
    ...coords,
    detailInput: {
      salePrice: parseHanpriceToManwon(firstItem.deposit),
      area: hoInfo.privateArea ? Number(hoInfo.privateArea) : '',
      floor: hoInfo.floor ? Number(hoInfo.floor) : '',
      transactionType: '매매',
    },
    summary: `${aptInfo.aptName} · ${firstItem.deposit?.toLocaleString?.() || firstItem.deposit}만원 · ${hoInfo.privateArea}㎡`,
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
    : parseHanpriceToManwon(landData.hanprice || landData.price);

  const coords = await resolveCoordsAndPnu(address, lat, lng, pnu);
  const rawAdText = buildDdangyaRawAdText(detail);

  return buildPrefill({
    category: 'land',
    address,
    ...coords,
    rawAdText,
    detailInput: {
      salePrice,
      area: landData.area ? Number(landData.area) : '',
      transactionType: '매매',
    },
    summary: `땅야 ${isLanddeal ? '실거래' : isAuction ? '경매' : '매물'} · ${address}`,
  });
}

async function extractValueup(propertyUrl: string): Promise<UrlExtractPrefill> {
  const pnuMatch = propertyUrl.match(/\/properties\/trades\/(\d+)/);
  if (!pnuMatch) {
    throw new Error('올바른 밸류맵 URL이 아닙니다. /properties/trades/{pnu} 형식이 필요합니다.');
  }

  const pnu = pnuMatch[1];

  // PNU로 실거래 상세를 직접 조회 (markers 지도 검색은 좌표/범위 오차로 누락될 수 있음)
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

  return buildPrefill({
    category,
    address,
    ...coords,
    detailInput: {
      salePrice: parseWonToManwon(trade.tradePrice),
      area: trade.landArea ? Number(trade.landArea) : '',
      transactionType: '매매',
    },
    summary: `밸류맵 · ${address} · ${trade.propertyType?.label || '매물'}`,
  });
}

export async function extractPropertyFromUrl(propertyUrl: string): Promise<UrlExtractPrefill> {
  const url = propertyUrl.trim();
  if (!url) throw new Error('URL을 입력해주세요.');

  if (url.includes('hogangnono.com')) return extractHogangnono(url);
  if (url.includes('ddangya.com')) return extractDdangya(url);
  if (url.includes('valueupmap.com')) return extractValueup(url);

  throw new Error('지원하지 않는 URL입니다. 호갱노노, 땅야, 밸류맵 URL을 사용해주세요.');
}
