import { buildApartmentMarketBlocks, type ApartmentMarketBlock } from './apartmentMarketSummary';
import { buildLandLocationRows, LAND_LOCATION_DISCLAIMER, type LandAnalysisRow } from './landLocationSummary';
import { generateMarketInsights, type MarketInsightItem } from './marketRone';

export const SHORTS_WIDTH = 1080;
export const SHORTS_HEIGHT = 1920;
export const SHORTS_BG = '#0a0a0c';

export function formatKoreanCurrency(val: number): string {
    if (!val || val === 0) return '-';
    if (val >= 100000000) {
        const eok = Math.floor(val / 100000000);
        const rest = val % 100000000;
        if (rest >= 10000) return `${eok}억 ${Math.round(rest / 10000).toLocaleString()}만`;
        return `${eok}억`;
    }
    if (val >= 10000) return `${Math.round(val / 10000).toLocaleString()}만`;
    return Math.round(val).toLocaleString();
}

export function formatTradeManwon(amt: number): string {
    if (!amt || amt <= 0) return '-';
    if (amt >= 10000) {
        const eok = Math.floor(amt / 10000);
        const rest = Math.round(amt % 10000);
        return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
    }
    return `${Math.round(amt).toLocaleString()}만`;
}

const SHORT_VERDICT_LABELS = [
    '매우 고평가', '매우 저평가', '고평가', '저평가',
    '적정 수준', '적정가', '적정', '선반영', '미반영', '주의', '위험', '적합',
];

export function getScoreTier(score: number) {
    if (score >= 80) return { label: '우수', color: '#34d399' };
    if (score >= 60) return { label: '양호', color: '#0EA5E9' };
    if (score >= 40) return { label: '보통', color: '#fbbf24' };
    return { label: '검토 필요', color: '#f87171' };
}

function extractShortLabel(...sources: (string | undefined | null)[]): string | null {
    for (const raw of sources) {
        if (!raw) continue;
        const text = String(raw).trim();
        if (!text) continue;
        for (const label of SHORT_VERDICT_LABELS) {
            if (text.includes(label)) return label;
        }
        if (text.length <= 8 && !/[.!?]/.test(text)) return text;
    }
    return null;
}

function findValue(map: any, key: string): any {
    if (!map) return null;
    if (map[key] !== undefined && map[key] !== null) {
        if (typeof map[key] === 'string' && map[key].trim() === '') return null;
        return map[key];
    }
    for (const nestedKey of ['storeData', 'rawData', 'report', 'vitals', 'analysis', 'userSubmittedData']) {
        const sub = map[nestedKey];
        if (sub && typeof sub === 'object') {
            const val = findValue(sub, key);
            if (val !== null && val !== undefined) return val;
        }
    }
    return null;
}

export type PyungTradeRow = {
    pyung: number;
    recentPrice: number;
    recentFloor: string;
    maxPrice: number;
    minPrice: number;
};

export type { ApartmentMarketBlock, MarketInsightItem };

const MARKET_REPORT_META: Record<string, { title: string; brandLabel: string; color: string }> = {
    land: { title: '토지 시장 분석 리포트', brandLabel: '토지 시장 동향', color: '#7c3aed' },
    apartment: { title: '아파트 시장 동향 요약', brandLabel: '아파트 시장 동향', color: '#0ea5e9' },
    house: { title: '주택 시장 분석 리포트', brandLabel: '주택 시장 동향', color: '#10b981' },
    building: { title: '오피스 시장 분석 리포트', brandLabel: '오피스 시장 동향', color: '#f59e0b' },
    store: { title: '상가 시장 분석 리포트', brandLabel: '상가 시장 동향', color: '#ef4444' },
};

export type ShortsSceneData = {
    isApartment: boolean;
    categoryLabel: string;
    locationLabel: string;
    coords: { lat: number | null; lng: number | null };
    mapProxyUrl: string | null;
    aiSummary: {
        score: number;
        scoreTier: ReturnType<typeof getScoreTier>;
        priceLabel: string | null;
        summaryText: string;
        grade: string;
    };
    pyungTrades: PyungTradeRow[];
    targetComplexName: string;
    landLocationRows: LandAnalysisRow[];
    landLocationDisclaimer: string;
    apartmentMarketBlocks: ApartmentMarketBlock[];
    marketInsightItems: MarketInsightItem[];
    marketReportTitle: string;
    marketAccentColor: string;
    marketTitle: string;
    categoryKey: string;
    housingSupply: HousingSupplySummary;
    populationUmd: PopulationUmdSummary;
    mustCheck: string[];
};

export type PopulationUmdSummary = {
    hasData: boolean;
    dongNm: string;
    pastPop: string;
    recentPop: string;
    recentMonthLabel: string;
    change: string;
    changeRate: string;
};

function buildPopulationUmdSummary(mergedData: Record<string, unknown>): PopulationUmdSummary {
    const popData = (mergedData?.population || {}) as Record<string, unknown>;
    const umd = (popData.umdComparison || {}) as Record<string, unknown>;
    const pastPop = umd.pastPop;
    const hasData = pastPop != null && String(pastPop) !== '';

    if (!hasData) {
        return {
            hasData: false,
            dongNm: '우리 동네',
            pastPop: '0',
            recentPop: '0',
            recentMonthLabel: '',
            change: '0',
            changeRate: '0',
        };
    }

    const recentYm = umd.recentYm != null ? String(umd.recentYm) : '';
    const monthLabel = recentYm.length >= 6 ? `${recentYm.substring(4)}월` : '';

    return {
        hasData: true,
        dongNm: String(umd.dongNm || '우리 동네'),
        pastPop: String(pastPop ?? '0'),
        recentPop: String(umd.recentPop ?? '0'),
        recentMonthLabel: monthLabel,
        change: String(umd.change ?? '0'),
        changeRate: String(umd.changeRate ?? '0'),
    };
}

export type HousingSupplySummary = {
    hasData: boolean;
    planned: string;
    moveIn: string;
    unsold: string;
    unsoldTrend: string;
    permits: string;
    glutScore: string;
};

function buildHousingSupplySummary(mergedData: Record<string, unknown>): HousingSupplySummary {
    const hs = (mergedData?.housingSupply || {}) as Record<string, unknown>;
    const hasData = Object.keys(hs).length > 0;
    if (!hasData) {
        return {
            hasData: false,
            planned: '0',
            moveIn: '0',
            unsold: '0',
            unsoldTrend: '안정',
            permits: '0',
            glutScore: '0',
        };
    }
    const nextYears = (hs.nextYears || {}) as Record<string, { count?: unknown }>;
    const unsold = (hs.unsold || {}) as { current?: unknown; trend?: unknown };
    const permits = (hs.permits || {}) as { last12months?: unknown };
    return {
        hasData: true,
        planned: String(nextYears.planned?.count ?? '0'),
        moveIn: String(nextYears.moveIn?.count ?? '0'),
        unsold: String(unsold.current ?? '0'),
        unsoldTrend: String(unsold.trend ?? '안정'),
        permits: String(permits.last12months ?? '0'),
        glutScore: String(hs.glutScore ?? '0'),
    };
}

function buildLocationLabel(
    mergedData: any,
    ai: any,
    isApartment: boolean,
    targetComplexName: string,
    explicitAddress?: string | null,
): string {
    const loc = mergedData?.location || {};
    const candidates = [
        explicitAddress,
        loc.address,
        mergedData?.address,
        findValue(mergedData, 'address'),
        ai?.analysisMetadata?.target?.address,
        isApartment ? targetComplexName : null,
        loc.jibun,
        loc.roadAddress,
        mergedData?.jibunAddress,
        mergedData?.roadAddress,
    ];
    for (const raw of candidates) {
        const text = String(raw ?? '').trim();
        if (text && text !== '정보없음' && text !== '-') return text;
    }
    return '위치 정보 없음';
}

export function buildShortsSceneData(
    ai: any,
    mergedData: any,
    category?: string,
    lat?: number | string | null,
    lng?: number | string | null,
    address?: string | null,
): ShortsSceneData {
    const rawCat = category || mergedData?.category || 'land';
    const cat = String(rawCat).toLowerCase().trim();
    const isApartment = cat === 'apartment' || cat === '아파트';

    const cLat = parseFloat(String(lat ?? mergedData?.lat ?? mergedData?.coordinates?.lat ?? ai?.analysisMetadata?.target?.lat ?? ''));
    const cLng = parseFloat(String(lng ?? mergedData?.lng ?? mergedData?.coordinates?.lng ?? ai?.analysisMetadata?.target?.lng ?? ''));
    const hasCoords = !Number.isNaN(cLat) && !Number.isNaN(cLng);

    const compRisk = ai?.['1_comprehensiveRisk'] || {};
    const priceReas = ai?.['5_priceReasonableness'] || {};
    const finalVerdict = ai?.['8_finalVerdict'];
    const score = typeof (compRisk.totalScore ?? compRisk.score) === 'number' ? (compRisk.totalScore ?? compRisk.score) : 0;
    const scoreTier = getScoreTier(score);
    const verdictText = typeof finalVerdict === 'object'
        ? (finalVerdict?.verdict || finalVerdict?.verdic)
        : (typeof finalVerdict === 'string' ? finalVerdict : undefined);
    const priceLabel = extractShortLabel(
        priceReas.conclusion,
        priceReas.gap,
        priceReas.opinion,
        priceReas.priceSpectrum?.narrative,
        verdictText,
    );
    let summaryText = compRisk.coreJudgement || mergedData?.detectiveNote || 'AI 분석 요약';
    summaryText = summaryText.trim();

    const mustCheckObj = ai?.['6_mustCheckList'] || {};
    const mustCheck = (Array.isArray(mustCheckObj) ? mustCheckObj : Object.values(mustCheckObj))
        .map(String)
        .filter(Boolean)
        .slice(0, 5);

    // Pyung trades
    const backendTargetTrades = mergedData?.targetTrades || mergedData?.nearbyData?.targetTrades || [];
    const targetComplexName = mergedData?.targetComplexInfo?.name || '해당 단지';
    const pyungTradesList: Record<number, any[]> = {};
    for (const trade of backendTargetTrades) {
        if (trade._isRent === true) continue;
        const areaVal = parseFloat(trade.excluUseAr || trade.area || '0');
        if (areaVal <= 0) continue;
        const dealAmt = parseFloat(String(trade.dealAmount || '0').replace(/,/g, ''));
        if (dealAmt <= 0) continue;
        const pyung = Math.round(areaVal / 3.3058);
        if (pyung <= 0) continue;
        if (!pyungTradesList[pyung]) pyungTradesList[pyung] = [];
        pyungTradesList[pyung].push(trade);
    }
    const pyungTrades: PyungTradeRow[] = Object.entries(pyungTradesList).map(([pyungStr, trades]) => {
        const sorted = [...trades].sort((a, b) => {
            const da = `${a.dealYear}${String(a.dealMonth).padStart(2, '0')}${String(a.dealDay || 1).padStart(2, '0')}`;
            const db = `${b.dealYear}${String(b.dealMonth).padStart(2, '0')}${String(b.dealDay || 1).padStart(2, '0')}`;
            return db.localeCompare(da);
        });
        const prices = sorted.map(t => parseFloat(String(t.dealAmount || '0').replace(/,/g, '')));
        const maxTrade = sorted[prices.indexOf(Math.max(...prices))];
        const minTrade = sorted[prices.indexOf(Math.min(...prices))];
        const recentTrade = sorted[0];
        return {
            pyung: parseInt(pyungStr, 10),
            recentPrice: parseFloat(String(recentTrade.dealAmount || '0').replace(/,/g, '')),
            recentFloor: recentTrade.floor ? `${recentTrade.floor}층` : '-',
            maxPrice: Math.max(...prices),
            minPrice: Math.min(...prices),
        };
    }).slice(0, 3);

    // Land location summary (non-apartment scene 3)
    const landLocationRows = !isApartment ? buildLandLocationRows(mergedData) : [];

    // Market (scene 4)
    const marketIndicators = mergedData?.marketIndicators || {};
    const meta = MARKET_REPORT_META[cat] || { title: '시장 분석 리포트', brandLabel: '시장 동향', color: '#38bdf8' };
    let apartmentMarketBlocks: ApartmentMarketBlock[] = [];
    let marketInsightItems: MarketInsightItem[] = [];

    if (isApartment) {
        apartmentMarketBlocks = buildApartmentMarketBlocks(marketIndicators);
    } else {
        marketInsightItems = generateMarketInsights(cat, marketIndicators);
    }

    const categoryMap: Record<string, string> = {
        land: '토지', building: '빌딩', apartment: '아파트', house: '주택', store: '상가',
    };

    return {
        isApartment,
        categoryLabel: categoryMap[cat] || '매물',
        locationLabel: buildLocationLabel(mergedData, ai, isApartment, targetComplexName, address),
        coords: { lat: hasCoords ? cLat : null, lng: hasCoords ? cLng : null },
        mapProxyUrl: hasCoords ? `/api/shorts/static-map?lat=${cLat}&lng=${cLng}` : null,
        aiSummary: {
            score,
            scoreTier,
            priceLabel,
            summaryText,
            grade: typeof finalVerdict === 'object' ? (finalVerdict?.investmentGrade || '-') : '-',
        },
        pyungTrades,
        targetComplexName,
        landLocationRows,
        landLocationDisclaimer: LAND_LOCATION_DISCLAIMER,
        apartmentMarketBlocks,
        marketInsightItems,
        marketReportTitle: meta.title,
        marketAccentColor: meta.color,
        marketTitle: meta.brandLabel,
        categoryKey: cat,
        housingSupply: buildHousingSupplySummary(mergedData),
        populationUmd: buildPopulationUmdSummary(mergedData),
        mustCheck,
    };
}

export { SHORTS_WIDTH as W, SHORTS_HEIGHT as H };
