/** 땅야 URL → 상세 rawAdText (POI·경매 부가정보·주변매물 등) */

const JIMOK_MAP: Record<string, string> = {
  답: '논',
  전: '밭',
  대: '대지',
  도로: '도로',
  임야: '임야',
  잡종지: '잡종지',
  공원: '공원',
  학교: '학교용지',
};

export interface DdangyaFetchResult {
  uid: string;
  isMeamul: boolean;
  isLanddeal: boolean;
  isAuction: boolean;
  landData: Record<string, any>;
  landAttData: Record<string, any> | null;
  neighborData: { result?: boolean; data?: any[] } | null;
}

async function scrapeProxy(url: string) {
  const res = await fetch('/api/scrape-hogangnono', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'ddangya' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details || '땅야 데이터를 가져오는데 실패했습니다.');
  }

  return res.json();
}

async function safeScrapeJson(url: string) {
  try {
    const json = await scrapeProxy(url);
    return json?.result ? json : null;
  } catch {
    return null;
  }
}

export function parseDdangyaUrl(propertyUrl: string) {
  const isMeamul = propertyUrl.includes('/meamul/detail/');
  const isLanddeal = propertyUrl.includes('/landdeal/detail/');
  const isAuction = propertyUrl.includes('/auction/detail/');
  const uidMatch = propertyUrl.match(/detail\/([^/?]+)/);

  if (!uidMatch || (!isMeamul && !isLanddeal && !isAuction)) {
    throw new Error('올바른 땅야 URL이 아닙니다. meamul/landdeal/auction detail URL을 사용해주세요.');
  }

  return {
    uid: uidMatch[1],
    isMeamul,
    isLanddeal,
    isAuction,
  };
}

/** 땅야 API 전체 수집 (실거래 POI·경매 부가정보·주변매물 포함) */
export async function fetchDdangyaDetail(propertyUrl: string): Promise<DdangyaFetchResult> {
  const { uid, isMeamul, isLanddeal, isAuction } = parseDdangyaUrl(propertyUrl);
  let landData: Record<string, any>;
  let landAttData: Record<string, any> | null = null;

  if (isLanddeal) {
    const [dealJson, attJson] = await Promise.all([
      scrapeProxy(`https://ddangya.com/server/api/?c=Land&m=getLandDealDetail&pnu=${uid}`),
      scrapeProxy(`https://ddangya.com/server/api/?c=PNU&m=getLandAtt&pnu=${uid}`).catch(() => null),
    ]);

    if (!dealJson.result || !dealJson.data) {
      throw new Error('땅야에서 실거래 정보를 찾을 수 없습니다.');
    }
    landData = dealJson.data;
    if (attJson?.result && attJson.data) landAttData = attJson.data;

    const lng = landData.x;
    const lat = landData.y;
    if (lat && lng) {
      const [poiJson, constJson] = await Promise.all([
        safeScrapeJson(
          `https://ddangya.com/server/api/?c=Budongsan&m=getPoiList&x=${lng}&y=${lat}&orderby=distance&keyword=&distance=2&limit=5&page=1`,
        ),
        safeScrapeJson(
          `https://ddangya.com/server/api/?c=Etc&m=getConstructionList&page=1&limit=5&keyword=&lat=${lat}&lng=${lng}&distance=5&s3_region1_code=near`,
        ),
      ]);
      if (poiJson?.data) landData._poiList = poiJson.data;
      if (constJson?.data) landData._constructionList = constJson.data;
    }
  } else if (isAuction) {
    const json = await scrapeProxy(
      `https://ddangya.com/server/api/?c=Auction&m=getAuction&uid=${uid}`,
    );
    if (!json.result || !json.data) {
      throw new Error('땅야에서 경매 정보를 찾을 수 없습니다.');
    }
    landData = json.data;

    const aLng = landData.lng || landData.x;
    const aLat = landData.lat || landData.y;
    let regionCode10 = landData.s3_region3_code || '';

    if (aLat && aLng && !regionCode10) {
      try {
        const regionJson = await scrapeProxy(
          `https://ddangya.com/server/api/?c=PNU&m=getRegionByLatLng&lng=${aLng}&lat=${aLat}&zoom=13`,
        );
        if (regionJson.result && regionJson.data?.code) {
          regionCode10 = regionJson.data.code;
        }
      } catch {
        // 지역코드 없이 진행
      }
    }

    if (regionCode10) {
      const urls = [
        `https://ddangya.com/server/api/?c=Land&m=getLandDealList&page=1&limit=5&keyword=&regioncode=${regionCode10}&regiontable=&x=0&y=0&pnu=&orderby=contractdate&jimok=&fromyear=2022&distance=0&code=${regionCode10}`,
        `https://ddangya.com/server/api/?c=MeamulDdangya&m=getRegionMeamulListByCode&page=1&limit=5&keyword=&jimok=&code=${regionCode10}`,
        `https://ddangya.com/server/api/?c=Etc&m=getGosiList&page=1&limit=3&keyword=&code=${regionCode10}`,
      ];
      if (aLat && aLng) {
        urls.push(
          `https://ddangya.com/server/api/?c=Budongsan&m=getPoiList&x=${aLng}&y=${aLat}&orderby=distance&keyword=&distance=2&limit=5&page=1`,
          `https://ddangya.com/server/api/?c=Etc&m=getConstructionList&page=1&limit=5&keyword=&lat=${aLat}&lng=${aLng}&distance=5&s3_region1_code=near`,
        );
      }

      const results = await Promise.all(urls.map((u) => safeScrapeJson(u)));
      if (results[0]?.data) landData._dealList = results[0].data;
      if (results[1]?.data) landData._meamulList = results[1].data;
      if (results[2]?.data) landData._gosiList = results[2].data;
      if (results[3]?.data) landData._poiList = results[3].data;
      if (results[4]?.data) landData._constructionList = results[4].data;
      landData._regionCode = regionCode10;
    }
  } else {
    const json = await scrapeProxy(
      `https://ddangya.com/server/api/?c=MeamulDdangya&m=getMeamul&uid=${uid}`,
    );
    if (!json.result || !json.data) {
      throw new Error('땅야에서 매물 정보를 찾을 수 없습니다.');
    }
    landData = json.data;
  }

  let neighborData: { result?: boolean; data?: any[] } | null = null;
  const pnuForRegion = isLanddeal ? uid : landData.pnu || '';
  const regionCodeRaw = landData.s3_region3_code || pnuForRegion || null;

  if (regionCodeRaw) {
    const regionCode = String(regionCodeRaw).substring(0, 5);
    try {
      neighborData = await scrapeProxy(
        `https://ddangya.com/server/api/?c=MeamulDdangya&m=getMeamulList&code=${regionCode}&limit=100&page=1`,
      );
    } catch {
      neighborData = null;
    }
  }

  return { uid, isMeamul, isLanddeal, isAuction, landData, landAttData, neighborData };
}

function buildNeighborInfo(
  neighborData: DdangyaFetchResult['neighborData'],
  uid: string,
): string {
  if (!neighborData?.result || !neighborData.data) return '';

  const recentDeals = neighborData.data
    .filter((item) => String(item.uid) !== String(uid) && String(item.pnu) !== String(uid))
    .slice(0, 5)
    .map((item) => {
      const address = item.simpleaddress || item.address || '주소 정보 없음';
      const jimok = JIMOK_MAP[item.jimok] || item.jimok || '지목 정보 없음';
      return `- ${address}: ${item.hanprice} (${item.area}㎡, ${jimok}, ${item.afterdate})`;
    })
    .join('\n');

  return recentDeals ? `\n\n=== 주변 매물 정보 ===\n${recentDeals}` : '';
}

/** 수집 데이터 → 구조화된 rawAdText */
export function buildDdangyaRawAdText(result: DdangyaFetchResult): string {
  const { uid, isLanddeal, isAuction, landData, landAttData, neighborData } = result;
  const neighborInfo = buildNeighborInfo(neighborData, uid);

  if (isLanddeal) {
    const gongsiHistory =
      landAttData?.gongsis
        ?.slice(0, 5)
        .map((g: { year: number; gongsi: number }) => `${g.year}년: ${g.gongsi.toLocaleString()}원/㎡`)
        .join(' / ') || '정보없음';

    const usagesInclude = landAttData?.usages?.include?.join(', ') || '정보없음';
    const usagesPartial = landAttData?.usages?.partial?.join(', ') || '';

    const rawAdContent = `
=== 토지 실거래 정보 ===
거래유형: 실거래
거래금액: ${landData.hanprice || (landData.price ? `${landData.price.toLocaleString()}만원` : '정보없음')}
거래면적: ${landData.area?.toLocaleString()}㎡ (${landData.area33 || Math.round((landData.area || 0) * 0.3025)}평)
지목: ${JIMOK_MAP[landData.jimok] || landData.jimok || '정보없음'}
용도지역: ${landData.usagetype || landAttData?.purpose || '정보없음'}
주소: ${landData.naddress || landData.address || `${landData.si || ''} ${landData.dong || ''} ${landData.jibun || ''}`}
거래일자: ${landData.contractdate || landData.dealdate || '정보없음'}

=== 가격 정보 ===
총 거래금액: ${landData.hanprice || '정보없음'}
㎡당 거래가: ${landData.price1m?.toLocaleString() || Math.round(((landData.price || 0) / (landData.area || 1)) * 10000)}만원
평당 거래가: ${landData.price33m?.toLocaleString() || '정보없음'}만원
공시지가(㎡): ${landData.gongsiprice?.toLocaleString() || landAttData?.gongsi?.toLocaleString() || '정보없음'}원${
      landAttData?.gongsis ? `\n공시지가 이력: ${gongsiHistory}` : ''
    }

=== 토지 속성 ===
소유구분: ${landAttData?.owner || '정보없음'}
지목(공부): ${landAttData?.pjimok || landAttData?.jimok || '정보없음'}
공부면적: ${landAttData?.parea?.toLocaleString() || '정보없음'}㎡
이용현황: ${landAttData?.usestatus || '정보없음'}
지형고저: ${landAttData?.hstatus || '정보없음'}
지형모양: ${landAttData?.shape || '정보없음'}
도로접면: ${landAttData?.roadstatus || '정보없음'}

=== 용도구역 정보 ===
포함구역: ${usagesInclude}${usagesPartial ? `\n저촉구역: ${usagesPartial}` : ''}

=== 위치 정보 ===
위도: ${landData.y || '정보없음'}
경도: ${landData.x || '정보없음'}
PNU: ${landData.pnu || uid}${
      landData._poiList?.length
        ? `

=== 주변 시설 (반경 2km) ===
${landData._poiList
  .map(
    (p: { name: string; subcategory: string; distance: number }) =>
      `- ${p.name} (${p.subcategory}) : ${(p.distance * 1000).toFixed(0)}m`,
  )
  .join('\n')}`
        : ''
    }${
      landData._constructionList?.length
        ? `

=== 주변 건설공사 (반경 5km) ===
${landData._constructionList
  .map(
    (c: {
      subcategory: string;
      title: string;
      owner?: string;
      startdate: string;
      enddate: string;
      distance?: number;
    }) =>
      `- [${c.subcategory}] ${c.title} (${c.owner || '민간'}, ${c.startdate}~${c.enddate}, ${c.distance?.toFixed(2)}km)`,
  )
  .join('\n')}`
        : ''
    }`.trim();

    return rawAdContent + (neighborInfo ? `\n\n${neighborInfo.trim()}` : '');
  }

  if (isAuction) {
    const dealListSection = landData._dealList?.length
      ? `

=== 주변 실거래 내역 (동일 지역) ===
${landData._dealList
  .map(
    (d: { address?: string; dong?: string; jibun?: string; hanprice: string; area: number; jimok: string; contractdate: string }) =>
      `- ${d.address || `${d.dong} ${d.jibun}`}: ${d.hanprice} (${d.area}㎡, ${JIMOK_MAP[d.jimok] || d.jimok}, ${d.contractdate})`,
  )
  .join('\n')}`
      : '';

    const meamulSection = landData._meamulList?.length
      ? `

=== 주변 현재 매물 ===
${landData._meamulList
  .map(
    (m: { title?: string; address?: string; hanprice: string; area: number; price33m?: number }) =>
      `- ${m.title || m.address}: ${m.hanprice} (${m.area}㎡, 평당 ${m.price33m?.toLocaleString()}만원)`,
  )
  .join('\n')}`
      : '';

    const gosiSection = landData._gosiList?.length
      ? `

=== 도시계획 고시 (최근 3건) ===
${landData._gosiList
  .map(
    (g: { pastday: string; title: string; incharge: string; publishdate: string }) =>
      `- [${g.pastday}] ${g.title.trim()} (${g.incharge}, ${g.publishdate})`,
  )
  .join('\n')}`
      : '';

    const poiSection = landData._poiList?.length
      ? `

=== 주변 시설 (반경 2km) ===
${landData._poiList
  .map(
    (p: { name: string; subcategory: string; distance: number }) =>
      `- ${p.name} (${p.subcategory}): ${(p.distance * 1000).toFixed(0)}m`,
  )
  .join('\n')}`
      : '';

    const constSection = landData._constructionList?.length
      ? `

=== 주변 건설공사 (반경 5km) ===
${landData._constructionList
  .map(
    (c: {
      subcategory: string;
      title: string;
      owner?: string;
      startdate: string;
      enddate: string;
      distance?: number;
    }) =>
      `- [${c.subcategory}] ${c.title} (${c.owner || '민간'}, ${c.startdate}~${c.enddate}, ${c.distance?.toFixed(2)}km)`,
  )
  .join('\n')}`
      : '';

    const rawAdContent = `
=== 토지 경매 정보 ===
거래유형: 경매
사건번호: ${landData.id || landData.idnum || '정보없음'}
담당법원: ${landData.court || '정보없음'}
담당계: ${landData.incharge || '정보없음'}
담당전화: ${landData.tel || '정보없음'}
경매일시: ${landData.auctiondatetime || landData.auctiondate || '정보없음'}
경매상태: ${landData.status || '정보없음'}

=== 가격 정보 ===
감정가: ${landData.estimatedprice ? `${Math.round(landData.estimatedprice / 10000).toLocaleString()}만원` : landData.simpleminestimatedprice || '정보없음'}
최저입찰가: ${landData.minprice ? `${landData.minprice.toLocaleString()}만원` : landData.simpleminprice || '정보없음'}
낙찰가: ${landData.price ? `${landData.price.toLocaleString()}만원` : '미낙찰'}
유찰횟수: ${landData.auctioncount ? landData.auctioncount - 1 : 0}회
입찰률: ${landData.percent ? `${landData.percent}%` : '정보없음'}

=== 매물 정보 ===
주소: ${landData.address || landData.naddress || '정보없음'}
매물 유형: ${landData.maemulinfo || '정보없음'}
매물 수: ${landData.maemul || 1}건

=== 위치 정보 ===
위도: ${landData.lat || '정보없음'}
경도: ${landData.lng || '정보없음'}
PNU: ${landData.pnu || '정보없음'}

=== 경매 특이사항 ===
${landData.extrainfo ? String(landData.extrainfo).replace(/<[^>]*>/g, '').trim() : '없음'}${dealListSection}${meamulSection}${gosiSection}${poiSection}${constSection}`.trim();

    return rawAdContent + (neighborInfo ? `\n\n${neighborInfo.trim()}` : '');
  }

  // meamul
  const rawAdContent = `
=== 매물 정보 ===
매물 제목: ${landData.title || '토지 매물'}
가격: ${landData.hanprice}
면적: ${landData.area}㎡ (${landData.area33}평)
지목: ${JIMOK_MAP[landData.jimok] || landData.jimok}
용도지역: ${landData.usagetype}
주소: ${landData.address}

=== 가격 정보 ===
총 가격: ${landData.hanprice}
㎡당 가격: ${landData.price1m?.toLocaleString()}만원
평당 가격: ${landData.price33m?.toLocaleString()}만원

=== 위치 정보 ===
위도: ${landData.lat}
경도: ${landData.lng}
PNU: ${landData.pnu}

=== 매물 설명 ===
${landData.contents || '상세 설명이 없습니다.'}

=== 중개업소 정보 ===
${
  landData.agent
    ? `업소명: ${landData.agent.agentname}
대표자: ${landData.agent.name}
연락처: ${landData.agent.agentphone}
주소: ${landData.agent.address}
등록번호: ${landData.agent.regnumber}`
    : '중개업소 정보 없음'
}

=== 기타 정보 ===
등록일: ${landData.regdate}
매물 번호: ${landData.uid}${neighborInfo}
`.trim();

  return rawAdContent;
}

export function getDdangyaAddress(landData: Record<string, any>, isLanddeal: boolean, uid: string): string {
  return (
    landData.address ||
    landData.naddress ||
    `${landData.si || ''} ${landData.dong || ''} ${landData.jibun || ''}`.trim() ||
    (isLanddeal ? uid : '')
  );
}
