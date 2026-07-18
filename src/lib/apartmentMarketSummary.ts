/** 탐정요약 `renderApartmentMarketSummarySection`과 동일한 아파트 시장 동향 데이터 */

type SeriesPoint = { date: string; value: number };

const pointValue = (point: unknown): number | null => {
    if (point && typeof point === 'object') {
        const val = (point as { value?: unknown }).value;
        return typeof val === 'number' ? val : (parseFloat(String(val)) || null);
    }
    if (typeof point === 'number') return point;
    if (typeof point === 'string') {
        const parsed = parseFloat(point);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
};

const pointDate = (point: unknown): string => {
    if (point && typeof point === 'object') {
        return String((point as { date?: unknown }).date || '').trim();
    }
    return '';
};

const sortedSeriesPoints = (data: unknown[]): SeriesPoint[] => {
    const points: { date: string; value: number; order: number }[] = [];
    for (let i = 0; i < data.length; i++) {
        const v = pointValue(data[i]);
        if (v === null) continue;
        points.push({ date: pointDate(data[i]), value: v, order: i });
    }
    points.sort((a, b) => {
        const c = a.date.localeCompare(b.date);
        if (c !== 0) return c;
        return a.order - b.order;
    });
    return points.map((p) => ({ date: p.date, value: p.value }));
};

export const parseIndicatorSeries = (seriesData: unknown) => {
    if (!seriesData) return null;

    let data: unknown[] | null = null;
    let summary: { latest?: unknown; previous?: unknown } | null = null;

    if (Array.isArray(seriesData)) {
        data = seriesData;
    } else if (seriesData && typeof seriesData === 'object') {
        const obj = seriesData as { data?: unknown[]; summary?: { latest?: unknown; previous?: unknown } };
        data = Array.isArray(obj.data) ? obj.data : null;
        summary = obj.summary || null;
    }

    if (!data || data.length === 0) return null;

    const summaryLatest = summary?.latest !== undefined ? parseFloat(String(summary.latest)) : null;
    const summaryPrevious = summary?.previous !== undefined ? parseFloat(String(summary.previous)) : null;

    let current: number | null = null;
    let previous: number | null = null;

    if (summaryLatest !== null && !Number.isNaN(summaryLatest)) {
        current = summaryLatest;
        previous = summaryPrevious !== null && !Number.isNaN(summaryPrevious) ? summaryPrevious : null;
    }

    const sorted = sortedSeriesPoints(data);
    if (sorted.length > 0) {
        const allDatesEmpty = sorted.every((p) => p.date === '');
        const newestFirst = allDatesEmpty && sorted.length >= 2 && sorted[0].value > sorted[sorted.length - 1].value;

        const fromSeriesCurrent = newestFirst ? sorted[0].value : sorted[sorted.length - 1].value;
        const fromSeriesPrevious =
            sorted.length >= 2 ? (newestFirst ? sorted[1].value : sorted[sorted.length - 2].value) : null;

        if (current === null) current = fromSeriesCurrent;
        if (previous === null && fromSeriesPrevious !== null) previous = fromSeriesPrevious;
    }

    if (current === null) return null;

    let trend = '보합';
    if (previous !== null && previous !== 0) {
        const delta = current - previous;
        if (delta > 0) trend = '상승';
        else if (delta < 0) trend = '하락';
    }

    return { current, previous, trend };
};

const getSaleDesc = (val: number) => {
    const diff = val - 100;
    const diffAbsStr = Math.abs(diff).toFixed(2);
    if (Math.abs(diff) < 0.005) {
        return '기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 변동 없이 보합세를 보이며 제자리걸음을 걷고 있다는 뜻이에요.';
    }
    const word = diff > 0 ? '상승' : '하락';
    const detail =
        Math.abs(diff) < 0.5 ? `미세하게 ${word}하며 제자리걸음을 걷고` : `${word}하며 변동이 나타나고`;
    return `기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 ${diffAbsStr}% ${detail} 있다는 뜻이에요.`;
};

const getJeonseWolseDesc = (jVal: number, wVal: number) => {
    const jDiff = jVal - 100;
    const wDiff = wVal - 100;
    const jStr = Math.abs(jDiff).toFixed(2);
    const wStr = Math.abs(wDiff).toFixed(2);
    const jWord = jDiff > 0 ? '상승' : '하락';
    const wWord = wDiff > 0 ? '상승' : '하락';

    if (jDiff > 0 && wDiff > 0) {
        return `기준 시점 대비 전세가는 ${jStr}%, 월세가는 ${wStr}%씩 각각 상승하여 세입자들의 주거 비용이 오르고 있다는 의미예요.`;
    }
    if (jDiff < 0 && wDiff < 0) {
        return `기준 시점 대비 전세가는 ${jStr}%, 월세가는 ${wStr}%씩 각각 하락하여 세입자들의 주거 비용 부담이 줄어들고 있다는 의미예요.`;
    }
    return `기준 시점 대비 전세가는 ${jStr}% ${jWord}, 월세가는 ${wStr}% ${wWord}하여 시장의 주거 비용 변화가 엇갈리고 있다는 의미예요.`;
};

const getSaleSDDesc = (val: number) => {
    const valStr = val.toFixed(1);
    if (val > 100) {
        return `기준점(100점)보다 높은 ${valStr}점으로, 현재 아파트를 '팔려는 사람'보다 '사려는 사람'이 더 많아 집값이 위로 튈 준비를 하고 있다는 신호예요.`;
    }
    if (val < 100) {
        return `기준점(100점)보다 낮은 ${valStr}점으로, 현재 아파트를 '사려는 사람'보다 '팔려는 사람'이 더 많아 집값이 하향 조정될 가능성이 있다는 신호예요.`;
    }
    return `기준점인 100점과 일치하여, 현재 아파트를 '팔려는 사람'과 '사려는 사람'이 팽팽하게 균형을 맞추고 있다는 신호예요.`;
};

const getJeonseWolseSDDesc = (jVal: number, wVal: number) => {
    const jValStr = jVal.toFixed(1);
    const wValStr = wVal.toFixed(1);
    if (jVal > 100 && wVal > 100) {
        return '100점을 훌륭히 넘겨 전세·월세 모두 집을 구하려는 세입자가 매물보다 훨씬 많다는 뜻이에요. 전월세 대란이나 가격 상승 우려가 커요.';
    }
    if (jVal < 100 && wVal < 100) {
        return '100점보다 낮아 전세·월세 모두 집을 내놓은 임대인이 많고 구하려는 세입자가 적다는 뜻이에요. 역전세난이나 가격 하락 우려가 있어요.';
    }
    if (jVal > 100) {
        return `전세수급(${jValStr})이 100점을 넘어 전세는 세입자가 매물보다 많으나, 월세(${wValStr})는 임대인이 더 많아 시장 흐름에 편차가 있다는 뜻이에요.`;
    }
    return `월세수급(${wValStr})이 100점을 넘어 월세는 세입자가 매물보다 많으나, 전세(${jValStr})는 임대인이 더 많아 시장 흐름에 편차가 있다는 뜻이에요.`;
};

export type ApartmentMarketBlock = {
    key: string;
    title: string;
    flowLine: string;
    trendLine: string;
    body: string;
    accent: string;
};

export function buildApartmentMarketBlocks(marketIndicators: Record<string, unknown>): ApartmentMarketBlock[] {
    const ind = marketIndicators || {};

    const saleParsed = parseIndicatorSeries(ind.saleIndex || ind.priceIndex);
    const saleVal = saleParsed?.current ?? 100.11;
    const saleTrend = saleParsed?.trend ?? '상승';

    const jeonseParsed = parseIndicatorSeries(ind.jeonseIndex);
    const jeonseVal = jeonseParsed?.current ?? 101.54;
    const jeonseTrend = jeonseParsed?.trend ?? '상승';

    const wolseParsed = parseIndicatorSeries(ind.wolseIndex);
    const wolseVal = wolseParsed?.current ?? 101.33;
    const wolseTrend = wolseParsed?.trend ?? '상승';

    const sd = (ind.supplyDemand || {}) as Record<string, { summary?: { latest?: unknown; trend?: string } }>;
    const saleSDSummary = sd.sale?.summary || {};
    const saleSDVal =
        saleSDSummary.latest !== undefined ? parseFloat(String(saleSDSummary.latest)) : 105.5;
    const saleSDTrend = saleSDSummary.trend || '상승';

    const jeonseSDSummary = sd.jeonse?.summary || {};
    const jeonseSDVal =
        jeonseSDSummary.latest !== undefined ? parseFloat(String(jeonseSDSummary.latest)) : 109.5;
    const jeonseSDTrend = jeonseSDSummary.trend || '상승';

    const wolseSDSummary = sd.wolse?.summary || {};
    const wolseSDVal =
        wolseSDSummary.latest !== undefined ? parseFloat(String(wolseSDSummary.latest)) : 109.7;
    const wolseSDTrend = wolseSDSummary.trend || '상승';

    let jwTrend = '보합';
    if (jeonseTrend === '상승' && wolseTrend === '상승') jwTrend = '상승';
    else if (jeonseTrend === '하락' && wolseTrend === '하락') jwTrend = '하락';
    else if (jeonseTrend === '상승' || wolseTrend === '상승') jwTrend = '상승';

    let jwSDTrend = '보합';
    if (jeonseSDTrend === '상승' && wolseSDTrend === '상승') jwSDTrend = '상승';
    else if (jeonseSDTrend === '하락' && wolseSDTrend === '하락') jwSDTrend = '하락';
    else if (jeonseSDTrend === '상승' || wolseSDTrend === '상승') jwSDTrend = '상승';

    return [
        {
            key: 'saleIndex',
            title: `매매지수 ${saleVal.toFixed(2)}`,
            flowLine: `매매시장 흐름 : ${saleTrend}`,
            trendLine: `최근 추이: ${saleTrend}`,
            body: getSaleDesc(saleVal),
            accent: '#38bdf8',
        },
        {
            key: 'jeonseIndex',
            title: `전세지수 ${jeonseVal.toFixed(2)} / 월세지수 ${wolseVal.toFixed(2)}`,
            flowLine: `임대차시장 흐름 : ${jwTrend}`,
            trendLine: `최근 추이: ${jwTrend}`,
            body: getJeonseWolseDesc(jeonseVal, wolseVal),
            accent: '#34d399',
        },
        {
            key: 'saleSD',
            title: `매매수급 ${saleSDVal.toFixed(1)}`,
            flowLine: `매매 시장 동력 : ${saleSDTrend}`,
            trendLine: `수급 동향: ${saleSDTrend}`,
            body: getSaleSDDesc(saleSDVal),
            accent: '#fbbf24',
        },
        {
            key: 'jeonseSD',
            title: `전세수급 ${jeonseSDVal.toFixed(1)} / 월세수급 ${wolseSDVal.toFixed(1)}`,
            flowLine: `전월세 매물 과부하 : ${jwSDTrend}`,
            trendLine: `수급 동향: ${jwSDTrend}`,
            body: getJeonseWolseSDDesc(jeonseSDVal, wolseSDVal),
            accent: '#c084fc',
        },
    ];
}
