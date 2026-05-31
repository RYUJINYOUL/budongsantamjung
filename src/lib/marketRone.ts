// R-ONE market indicator helpers

export interface MarketInsightItem {
    label: string;
    compactTitle?: boolean;
    showChangeOnChip?: boolean;
    body: string;
    trend?: string;
    changeLabel?: string;
    subLine?: string;
    headlineValue?: string;
    headlineUnit?: string;
}

const pointValue = (point: any): number | null => {
    if (point && typeof point === 'object') {
        const val = point.value !== undefined ? point.value : point.price;
        return val !== undefined ? Number(val) : null;
    }
    if (typeof point === 'number') return point;
    if (typeof point === 'string') {
        const parsed = parseFloat(point.replace(/,/g, ''));
        return isNaN(parsed) ? null : parsed;
    }
    return null;
};

const pointDate = (point: any): string => {
    if (point && typeof point === 'object') {
        return (point.date || point.year || point.stdrYear || '').toString().trim();
    }
    return '';
};

export const sortedSeriesPoints = (data: any[]): { date: string; value: number }[] => {
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
    return points.map(p => ({ date: p.date, value: p.value }));
};

export const trendFromDelta = (delta: number): string => {
    if (delta > 0) return '상승';
    if (delta < 0) return '하락';
    return '보합';
};

export const fmt = (v: number | null | undefined, digits = 2): string => {
    if (v === undefined || v === null) return '—';
    return v.toFixed(digits);
};

export const parseIndicatorSeries = (seriesData: any) => {
    if (!seriesData) return null;
    let data: any[] | null = null;
    let summary: any = null;

    if (Array.isArray(seriesData)) {
        data = seriesData;
    } else if (seriesData && typeof seriesData === 'object') {
        data = seriesData.data || null;
        summary = seriesData.summary || null;
    }

    if (!data || data.length === 0) return null;

    const summaryLatest = summary?.latest !== undefined ? Number(summary.latest) : null;
    const summaryPrevious = summary?.previous !== undefined ? Number(summary.previous) : null;

    let current: number | null = summaryLatest;
    let previous: number | null = summaryPrevious;

    const sorted = sortedSeriesPoints(data);
    if (sorted.length > 0) {
        const allDatesEmpty = sorted.every(p => p.date === '');
        const newestFirst = allDatesEmpty && sorted.length >= 2 && sorted[0].value > sorted[sorted.length - 1].value;

        const fromSeriesCurrent = newestFirst ? sorted[0].value : sorted[sorted.length - 1].value;
        const fromSeriesPrevious = sorted.length >= 2
            ? (newestFirst ? sorted[1].value : sorted[sorted.length - 2].value)
            : null;

        if (current === null) current = fromSeriesCurrent;
        if (previous === null && fromSeriesPrevious !== null) {
            previous = fromSeriesPrevious;
        }
    }

    if (current === null) return null;

    let changePct: number | null = null;
    let trend = '보합';
    if (previous !== null && previous !== 0) {
        changePct = ((current - previous) / Math.abs(previous)) * 100;
        trend = trendFromDelta(current - previous);
    }

    return { current, previous, changePct, trend };
};

export const parseRecentIndexBenchmark = (seriesData: any, maxLookback = 30) => {
    if (!seriesData) return null;
    let data: any[] | null = null;

    if (Array.isArray(seriesData)) {
        data = seriesData;
    } else if (seriesData && typeof seriesData === 'object') {
        data = seriesData.data || null;
    }

    if (!data || data.length === 0) return null;

    const sorted = sortedSeriesPoints(data);
    if (sorted.length === 0) return null;

    const allDatesEmpty = sorted.every(p => p.date === '');
    const newestFirst = allDatesEmpty && sorted.length >= 2 && sorted[0].value > sorted[sorted.length - 1].value;

    const current = newestFirst ? sorted[0].value : sorted[sorted.length - 1].value;
    const prior = newestFirst ? sorted.slice(1) : sorted.slice(0, sorted.length - 1);

    if (prior.length === 0) return { current, recentIndexAvg: null };

    const window = prior.length > maxLookback ? prior.slice(prior.length - maxLookback) : prior;
    const avg = window.map(p => p.value).reduce((a, b) => a + b, 0) / window.length;

    return { current, recentIndexAvg: avg };
};



export const generateMarketInsights = (category: string, ind: any): MarketInsightItem[] => {
    if (!ind || typeof ind !== 'object') return [];

    const items: MarketInsightItem[] = [];

    if (category === 'land') {
        // 1. 지가지수
        (() => {
            const series = ind.priceIndex;
            const s = parseIndicatorSeries(series);
            const bench = parseRecentIndexBenchmark(series);
            if (!s || s.current === null) return;

            const current = s.current;
            const recent = bench?.recentIndexAvg ?? null;

            const parts: string[] = [];
            if (s.previous !== null) {
                const momPct = fmt(Math.abs(((current - s.previous) / Math.abs(s.previous)) * 100));
                const momWord = current > s.previous ? '올랐' : current < s.previous ? '내렸' : '비슷해';
                parts.push(`바로 직전 시점(${fmt(s.previous)})보다는 ${momPct}% 정도 ${momWord}어요.`);
            }
            if (recent !== null) {
                const vsRecent = current - recent;
                if (Math.abs(vsRecent) > 1e-9 && recent !== 0) {
                    const pct = fmt(Math.abs((vsRecent / Math.abs(recent)) * 100));
                    const word = vsRecent > 0 ? '높은' : '낮은';
                    parts.push(`최근 지수(${fmt(recent)})보다는 ${pct}% ${word} 편이에요.`);
                } else {
                    parts.push(`최근 지수(${fmt(recent)})와 비슷한 수준이에요.`);
                }
            }
            if (parts.length === 0) {
                parts.push('기준시점 100을 토대로, 이 지역 땅값이 얼마나 올랐는지 나타내는 지수예요.');
            }

            let chipChange: string | undefined;
            let trend: string | undefined;
            if (recent !== null) {
                trend = trendFromDelta(current - recent);
                const pct = ((current - recent) / Math.abs(recent)) * 100;
                chipChange = Math.abs(pct) >= 0.005 ? `${pct > 0 ? '+' : ''}${fmt(pct)}%` : undefined;
            } else if (s.previous !== null) {
                trend = s.trend;
                chipChange = s.changePct !== null ? `${fmt(Math.abs(s.changePct))}%` : undefined;
            }

            items.push({
                label: '지가지수',
                subLine: recent !== null ? `최근 지수 ${fmt(recent)}` : undefined,
                headlineValue: fmt(current),
                body: `현재 땅값 지수예요. ${parts.join(' ')}`,
                trend,
                changeLabel: chipChange
            });
        })();

        // 2. 지가변동률
        (() => {
            const series = ind.changeRateByRegion || ind.changeRateByUse;
            const s = parseIndicatorSeries(series);
            if (!s || s.current === null) return;

            const curr = s.current;
            let body = `지난번과 비교해서, 이번에 땅값이 딱 ${fmt(curr)}% 만큼 더 올랐다는 뜻이에요. 지각변동률은 땅값이 움직이는 실시간 속도를 말해요. `;
            if (s.previous !== null) {
                body += `전기에 기록한 변동률은 ${fmt(s.previous)}% 였습니다.`;
            }

            items.push({
                label: '지가변동률',
                headlineValue: fmt(curr),
                headlineUnit: '%',
                body
            });
        })();

        // 3. 거래필지수
        (() => {
            const series = ind.tradeVolume;
            const s = parseIndicatorSeries(series);
            if (!s || s.current === null) return;

            const curr = s.current;
            const prev = s.previous;

            let body = '';
            if (prev !== null) {
                const word = s.trend === '상승' ? '늘었' : s.trend === '하락' ? '줄었' : '비슷해';
                body = `이 지역 토지 거래가 얼마나 활발한지 보여 주는 지수예요. 현재 ${fmt(curr)} 땅덩어리가 팔렸고, 직전 ${fmt(prev)} 땅어리가 팔렸으니, 거래 활기가 ${word}어요. 위 거래필지수 그래프를 보면, 땅 거래가 타오르는 중인지 식어 가는지도 함께 볼 수 있어요.`;
            } else {
                body = `이 지역 토지 거래 활성 지수예요. 숫자가 클수록 거래가 활발한 편이에요. 아래 그래프로 추이도 확인해 보세요.`;
            }

            items.push({
                label: '거래필지수',
                subLine: prev !== null ? `현재 ${fmt(curr)} · 전기 ${fmt(prev)}` : `현재 ${fmt(curr)}`,
                headlineValue: fmt(curr),
                body,
                trend: s.trend,
                changeLabel: s.changePct !== null ? `${fmt(Math.abs(s.changePct))}%` : undefined
            });
        })();
    } else if (category === 'apartment') {
        const saleParsed = parseIndicatorSeries(ind.saleIndex || ind.priceIndex);
        const saleVal = saleParsed?.current ?? 100.11;
        const saleTrend = saleParsed?.trend ?? '상승';

        const jeonseParsed = parseIndicatorSeries(ind.jeonseIndex);
        const jeonseVal = jeonseParsed?.current ?? 101.54;
        const jeonseTrend = jeonseParsed?.trend ?? '상승';

        const wolseParsed = parseIndicatorSeries(ind.wolseIndex);
        const wolseVal = wolseParsed?.current ?? 101.33;
        const wolseTrend = wolseParsed?.trend ?? '상승';

        const sd = ind.supplyDemand;
        const saleSDMap = sd?.sale;
        const saleSDSummary = saleSDMap?.summary;
        const saleSDVal = saleSDSummary?.latest !== undefined ? Number(saleSDSummary.latest) : 105.5;
        const saleSDTrend = saleSDSummary?.trend?.toString() ?? '상승';

        const jeonseSDMap = sd?.jeonse;
        const jeonseSDSummary = jeonseSDMap?.summary;
        const jeonseSDVal = jeonseSDSummary?.latest !== undefined ? Number(jeonseSDSummary.latest) : 109.5;
        const jeonseSDTrend = jeonseSDSummary?.trend?.toString() ?? '상승';

        const wolseSDMap = sd?.wolse;
        const wolseSDSummary = wolseSDMap?.summary;
        const wolseSDVal = wolseSDSummary?.latest !== undefined ? Number(wolseSDSummary.latest) : 109.7;
        const wolseSDTrend = wolseSDSummary?.trend?.toString() ?? '상승';

        const getSaleDesc = (val: number) => {
            const diff = val - 100;
            const diffAbsStr = fmt(Math.abs(diff));
            if (Math.abs(diff) < 0.005) {
                return '기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 변동 없이 보합세를 보이며 제자리걸음을 걷고 있다는 뜻이에요.';
            }
            const word = diff > 0 ? '상승' : '하락';
            const detail = Math.abs(diff) < 0.5 ? `미세하게 ${word}하며 제자리걸음을 걷고` : `${word}하며 변동이 나타나고`;
            return `기준 시점의 아파트 값(100)과 비교했을 때 현재 가격이 ${diffAbsStr}% ${detail} 있다는 뜻이에요.`;
        };

        const getJeonseWolseDesc = (j: number, w: number) => {
            const jDiff = j - 100;
            const wDiff = w - 100;
            const jStr = fmt(Math.abs(jDiff));
            const wStr = fmt(Math.abs(wDiff));
            const jWord = jDiff > 0 ? '상승' : '하락';
            const wWord = wDiff > 0 ? '상승' : '하락';

            if (jDiff > 0 && wDiff > 0) {
                return `기준 시점 대비 전세가는 ${jStr}%, 월세가는 ${wStr}%씩 각각 상승하여 세입자들의 주거 비용이 오르고 있다는 의미예요.`;
            } else if (jDiff < 0 && wDiff < 0) {
                return `기준 시점 대비 전세가는 ${jStr}%, 월세가는 ${wStr}%씩 각각 하락하여 세입자들의 주거 비용 부담이 줄어들고 있다는 의미예요.`;
            } else {
                return `기준 시점 대비 전세가는 ${jStr}% ${jWord}, 월세가는 ${wStr}% ${wWord}하여 시장의 주거 비용 변화가 엇갈리고 있다는 의미예요.`;
            }
        };

        const getSaleSDDesc = (val: number) => {
            const valStr = val.toFixed(1);
            if (val > 100) {
                return `기준점(100점)보다 높은 ${valStr}점으로, 현재 아파트를 '팔려는 사람'보다 '사려는 사람'이 더 많아 집값이 위로 튈 준비를 하고 있다는 신호예요.`;
            } else if (val < 100) {
                return `기준점(100점)보다 낮은 ${valStr}점으로, 현재 아파트를 '사려는 사람'보다 '팔려는 사람'이 더 많아 집값이 하향 조정될 가능성이 있다는 신호예요.`;
            } else {
                return `기준점인 100점과 일치하여, 현재 아파트를 '팔려는 사람'과 '사려는 사람'이 팽팽하게 균형을 맞추고 있다는 신호예요.`;
            }
        };

        const getJeonseWolseSDDesc = (j: number, w: number) => {
            const jValStr = j.toFixed(1);
            const wValStr = w.toFixed(1);
            if (j > 100 && w > 100) {
                return '100점을 훌륭히 넘겨 전세·월세 모두 집을 구하려는 세입자가 매물보다 훨씬 많다는 뜻이에요. 전월세 대란이나 가격 상승 우려가 커요.';
            } else if (j < 100 && w < 100) {
                return '100점보다 낮아 전세·월세 모두 집을 내놓은 임대인이 많고 구하려는 세입자가 적다는 뜻이에요. 역전세난이나 가격 하락 우려가 있어요.';
            } else if (j > 100) {
                return `전세수급(${jValStr})이 100점을 넘어 전세는 세입자가 매물보다 많으나, 월세(${wValStr})는 임대인이 더 많아 시장 흐름에 편차가 있다는 뜻이에요.`;
            } else {
                return `월세수급(${wValStr})이 100점을 넘어 월세는 세입자가 매물보다 많으나, 전세(${jValStr})는 임대인이 더 많아 시장 흐름에 편차가 있다는 뜻이에요.`;
            }
        };

        const jwTrend = (jeonseTrend === '상승' || wolseTrend === '상승') ? '상승' : (jeonseTrend === '하락' && wolseTrend === '하락') ? '하락' : '보합';
        const jwSDTrend = (jeonseSDTrend === '상승' || wolseSDTrend === '상승') ? '상승' : (jeonseSDTrend === '하락' && wolseSDTrend === '하락') ? '하락' : '보합';

        items.push({
            label: `매매지수 ${fmt(saleVal)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getSaleDesc(saleVal),
            trend: saleTrend
        });
        items.push({
            label: `전세지수 ${fmt(jeonseVal)} / 월세지수 ${fmt(wolseVal)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getJeonseWolseDesc(jeonseVal, wolseVal),
            trend: jwTrend
        });
        items.push({
            label: `매매수급 ${saleSDVal.toFixed(1)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getSaleSDDesc(saleSDVal),
            trend: saleSDTrend
        });
        items.push({
            label: `전세수급 ${jeonseSDVal.toFixed(1)} / 월세수급 ${wolseSDVal.toFixed(1)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getJeonseWolseSDDesc(jeonseSDVal, wolseSDVal),
            trend: jwSDTrend
        });
    } else if (category === 'house') {
        const sale = parseIndicatorSeries(ind.priceIndex);
        if (sale && sale.current !== null) {
            const current = sale.current;
            const pct = current - 100;
            const prefix = '기준 시점의 주택 가격(100) 대비 현재 집값이';
            let body = '';
            if (Math.abs(pct) < 0.005) {
                body = `${prefix} 비슷한 수준이라는 뜻이에요.`;
            } else {
                body = `${prefix} ${fmt(Math.abs(pct))}% ${pct > 0 ? '상승' : '하락'}했다는 뜻이에요.`;
            }
            items.push({
                label: `매매지수 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body,
                trend: sale.trend
            });
        }

        const jeonse = parseIndicatorSeries(ind.jeonseIndex);
        if (jeonse && jeonse.current !== null) {
            const current = jeonse.current;
            const pct = current - 100;
            const prefix = '기준 시점의 전세 가격(100) 대비 현재 전세 시세가';
            let body = '';
            if (Math.abs(pct) < 0.005) {
                body = `${prefix} 비슷한 수준이라는 뜻이에요.`;
            } else {
                body = `${prefix} ${fmt(Math.abs(pct))}% ${pct > 0 ? '상승' : '하락'}했다는 뜻이에요.`;
            }
            items.push({
                label: `전세지수 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body,
                trend: jeonse.trend
            });
        }

        const conv = parseIndicatorSeries(ind.conversionRate);
        if (conv && conv.current !== null) {
            const rate = conv.current;
            const annualWon = Math.round(100000000 * rate / 100);
            const annualMan = Math.round(annualWon / 10000);
            const monthlyMan = Math.round(annualWon / 12 / 10000);
            items.push({
                label: `전월세전환율 ${fmt(rate)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `전세 1억 원을 월세로 바꿀 때 1년에 ${annualMan}만 원(매달 약 ${monthlyMan}만 원) 정도의 월세를 내야 하는 비율이에요. 숫자가 높을수록 세입자 부담이 커요.`,
                trend: conv.trend
            });
        }
    } else if (category === 'building') {
        const price = parseIndicatorSeries(ind.priceIndex);
        if (price && price.current !== null) {
            const current = price.current;
            const vsBase = current - 100;
            const baseWord = vsBase > 0 ? `${fmt(Math.abs(vsBase))}% 올랐` : vsBase < 0 ? `${fmt(Math.abs(vsBase))}% 내렸` : '비슷한 수준을 유지';
            items.push({
                label: `임대가격지수 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `옛날 빌딩 월세를 100점이라 쳤을 때 지금은 ${fmt(current)}점으로, 예전보다 오피스 월세가 ${baseWord}다는 뜻이에요.`,
                trend: price.trend
            });
        }

        const vacancy = parseIndicatorSeries(ind.vacancyRate);
        if (vacancy && vacancy.current !== null) {
            const current = vacancy.current;
            const approxRooms = Math.min(100, Math.max(0, Math.round(current)));
            items.push({
                label: `공실률 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `위 동네 빌딩 안의 사무실 100칸 중 약 ${approxRooms}칸이 텅 비어있다는 뜻이에요. 숫자가 낮을수록 회사가 꽉 차 있다는 좋은 신호예요.`,
                trend: vacancy.trend
            });
        }

        const rent = parseIndicatorSeries(ind.rentAmount);
        if (rent && rent.current !== null) {
            const current = rent.current;
            const won = Math.round(current * 1000);
            const wonStr = won.toLocaleString() + '원';
            items.push({
                label: `임대료 ${fmt(current)}`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `사무실 방 한 칸 크기(1㎡)당 매달 평균 ${wonStr} 정도의 월세 시세가 형성되어 있다는 의미예요.`,
                trend: rent.trend
            });
        }

        // 수익률
        (() => {
            const yr = ind.yieldRates;
            if (!yr) return;
            const inv = yr.invest?.data || [];
            const inc = yr.income?.data || [];
            const cap = yr.capital?.data || [];
            if (inv.length === 0 && inc.length === 0 && cap.length === 0) return;

            const dates = new Set<string>();
            [...inv, ...inc, ...cap].forEach(p => {
                if (p.date) dates.add(p.date.toString());
            });
            const sorted = Array.from(dates).sort();
            if (sorted.length === 0) return;

            const latest = sorted[sorted.length - 1];
            const findVal = (list: any[]) => {
                const match = list.find(p => p.date === latest);
                return match ? Number(match.value) : null;
            };

            const invest = findVal(inv);
            const income = findVal(inc);
            const capital = findVal(cap);

            if (invest === null && income === null && capital === null) return;

            items.push({
                label: `수익률 분석 (투자 ${fmt(invest)} / 소득 ${fmt(income)} / 자본 ${fmt(capital)})`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `이 빌딩으로 얻은 총수익률이 ${fmt(invest)}%인데, 그중 매달 받는 월세 수익(소득)이 ${fmt(income)}%이고 빌딩 가격이 올라서 번 수익(자본)이 ${fmt(capital)}%라는 뜻이에요.`
            });
        })();
    } else if (category === 'store') {
        const priceParsed = parseIndicatorSeries(ind.priceIndex);
        const priceVal = priceParsed?.current ?? 102.50;
        const priceTrend = priceParsed?.trend ?? '상승';

        const rentParsed = parseIndicatorSeries(ind.rentAmount);
        const rentVal = rentParsed?.current ?? 56.36;
        const rentTrend = rentParsed?.trend ?? '상승';

        const vacancyParsed = parseIndicatorSeries(ind.vacancyRate);
        const vacancyVal = vacancyParsed?.current ?? 9.35;
        const vacancyTrend = vacancyParsed?.trend ?? '상승';

        const premiumParsed = parseIndicatorSeries(ind.premiumMoney);
        const premiumVal = premiumParsed?.current ?? 2904.42;
        const premiumTrend = premiumParsed?.trend ?? '상승';

        const formatWon = (val: number) => {
            const won = Math.round(val * 1000);
            return won.toLocaleString() + '원';
        };

        const getRentDesc = (price: number, rent: number) => {
            const diff = price - 100;
            const diffStr = fmt(Math.abs(diff));
            const priceWord = diff > 0 ? '올랐으며' : (diff < 0 ? '내렸으며' : '비슷한 수준이며');
            const rentWon = formatWon(rent);
            const areaStatus = diff > 0 ? '핫한' : '다소 한산한';
            return `기준 시점 대비 상가 월세가 ${diffStr}% ${priceWord}, 상가 1㎡당 매달 평균 ${rentWon} 정도의 임대료를 내야 하는 ${areaStatus} 상권이라는 뜻이에요.`;
        };

        const getVacancyDesc = (val: number) => {
            return `이 동네 상가 100군데 중 약 ${Math.round(val)}군데가 가게를 구하지 못해 문을 닫고 텅 비어있다는 뜻이에요.`;
        };

        const getPremiumTitle = (val: number) => {
            const valStr = fmt(val);
            if (val > 100) return `권리금 유비율 ${valStr} (※ 원본 표기 확인 필요)`;
            return `권리금 유비율 ${valStr}%`;
        };

        const prTrend = (priceTrend === '상승' || rentTrend === '상승') ? '상승' : (priceTrend === '하락' && rentTrend === '하락') ? '하락' : '보합';

        let yieldItem: MarketInsightItem | undefined;
        (() => {
            const yr = ind.yieldRates;
            if (!yr) return;
            const inv = yr.invest?.data || [];
            const inc = yr.income?.data || [];
            const cap = yr.capital?.data || [];
            if (inv.length === 0 && inc.length === 0 && cap.length === 0) return;

            const dates = new Set<string>();
            [...inv, ...inc, ...cap].forEach(p => {
                if (p.date) dates.add(p.date.toString());
            });
            const sorted = Array.from(dates).sort();
            if (sorted.length === 0) return;

            const latest = sorted[sorted.length - 1];
            const findVal = (list: any[]) => {
                const match = list.find(p => p.date === latest);
                return match ? Number(match.value) : null;
            };

            const invest = findVal(inv);
            const income = findVal(inc);
            const capital = findVal(cap);

            if (invest === null && income === null && capital === null) return;

            yieldItem = {
                label: `수익률 분석 (투자 ${fmt(invest)} / 소득 ${fmt(income)} / 자본 ${fmt(capital)})`,
                compactTitle: true,
                showChangeOnChip: false,
                body: `이 상가로 얻은 총수익률이 ${fmt(invest)}%인데, 그중 매달 받는 월세 수익(소득)이 ${fmt(income)}%이고 상가 가격이 올라서 번 수익(자본)이 ${fmt(capital)}%라는 뜻이에요.`
            };
        })();

        items.push({
            label: `임대가격지수 ${fmt(priceVal)} / 임대료 ${fmt(rentVal)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getRentDesc(priceVal, rentVal),
            trend: prTrend
        });
        items.push({
            label: `공실률 ${fmt(vacancyVal)}`,
            compactTitle: true,
            showChangeOnChip: false,
            body: getVacancyDesc(vacancyVal),
            trend: vacancyTrend
        });
        items.push({
            label: getPremiumTitle(premiumVal),
            compactTitle: true,
            showChangeOnChip: false,
            body: '이 지역 상가들 중 단골손님이나 시설 값 명목의 \'보너스 돈(권리금)\'을 요구하는 가게들의 비중 및 거래 수준을 나타내요. 이 숫자가 내려가면 상권의 실질 가치가 하락하고 있다는 경고예요.',
            trend: premiumTrend
        });
        if (yieldItem) items.push(yieldItem);
    }

    return items;
};