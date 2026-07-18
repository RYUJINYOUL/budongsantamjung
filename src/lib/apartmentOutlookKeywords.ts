export interface OutlookKeyword {
    label: string;
    line: string;
}

export interface ApartmentOutlookContext {
    marketIndicators?: Record<string, unknown>;
    housingSupply?: Record<string, unknown>;
    population?: Record<string, unknown>;
    macroIndicators?: Record<string, unknown>;
    householdLoanRate?: number | null;
    dealVolumeStats?: Array<{ month?: string; count?: number; category?: string }>;
    targetTrades?: Array<{ dealYear?: number; dealMonth?: number; _isRent?: boolean }>;
    regulatoryData?: Record<string, unknown>;
    dynamicNews?: Record<string, unknown>;
    amenities?: Record<string, unknown>;
    spatialFacilities?: Array<Record<string, unknown>>;
}

function parseSeries(seriesData: unknown): { current: number } | null {
    if (!seriesData || typeof seriesData !== 'object') return null;

    let data: Array<{ value?: unknown }> | null = null;
    let summary: { latest?: unknown } | null = null;

    if (Array.isArray(seriesData)) {
        data = seriesData;
    } else {
        const obj = seriesData as Record<string, unknown>;
        data = Array.isArray(obj.data) ? obj.data : null;
        summary = (obj.summary as { latest?: unknown }) || null;
    }

    let current: number | null = null;
    if (summary?.latest != null) current = parseFloat(String(summary.latest));

    if (data?.length && current == null) {
        const vals = data.map((p) => parseFloat(String(p.value))).filter((v) => Number.isFinite(v));
        if (vals.length) current = vals[vals.length - 1]!;
    }

    if (current == null || !Number.isFinite(current)) return null;
    return { current };
}

function sdLatest(sd: Record<string, unknown> | undefined): number | null {
    const v = (sd?.summary as Record<string, unknown>)?.latest;
    if (v == null) return null;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
}

function priceChangePhrase(diff: number): string {
    const abs = Math.abs(diff).toFixed(2);
    if (Math.abs(diff) < 0.005) return '현재 가격 보합';
    return diff > 0 ? `현재 가격 ${abs}% 상승` : `현재 가격 ${abs}% 하락`;
}

function saleSdPhrase(sdVal: number | null): string {
    if (sdVal == null) return '';
    if (sdVal > 100) return '사려는 사람이 더 많음';
    if (sdVal < 100) return '팔려는 사람이 더 많음';
    return '수급 균형';
}

function rentSdPhrase(jSd: number | null, wSd: number | null): string {
    if (jSd != null && wSd != null) {
        if (jSd > 100 && wSd > 100) return '세입자가 더 많음';
        if (jSd < 100 && wSd < 100) return '임대인이 더 많음';
    }
    if (jSd != null && jSd > 100) return '전세 세입자가 더 많음';
    if (wSd != null && wSd > 100) return '월세 세입자가 더 많음';
    if (jSd != null && jSd < 100) return '전세 임대인이 더 많음';
    if (wSd != null && wSd < 100) return '월세 임대인이 더 많음';
    return '수급 균형';
}

function saleIndexLine(ind: Record<string, unknown>): OutlookKeyword | null {
    const parsed = parseSeries(ind.saleIndex || ind.priceIndex);
    if (!parsed) return null;

    const sd = (ind.supplyDemand as Record<string, unknown>) || {};
    const sdVal = sdLatest(sd.sale as Record<string, unknown>);
    const pricePart = priceChangePhrase(parsed.current - 100);
    const sdPart = saleSdPhrase(sdVal);

    return {
        label: '매매지수 · 수급',
        line: sdPart ? `${pricePart}, ${sdPart}` : pricePart,
    };
}

function rentIndexLine(ind: Record<string, unknown>): OutlookKeyword | null {
    const jeonse = parseSeries(ind.jeonseIndex);
    const wolse = parseSeries(ind.wolseIndex);
    if (!jeonse && !wolse) return null;

    const sd = (ind.supplyDemand as Record<string, unknown>) || {};
    const jSd = sdLatest(sd.jeonse as Record<string, unknown>);
    const wSd = sdLatest(sd.wolse as Record<string, unknown>);

    const jDiff = jeonse ? jeonse.current - 100 : null;
    const wDiff = wolse ? wolse.current - 100 : null;

    let indexPart = '';
    if (jDiff != null && wDiff != null) {
        const jAbs = Math.abs(jDiff).toFixed(2);
        const wAbs = Math.abs(wDiff).toFixed(2);
        if (jDiff > 0 && wDiff > 0) indexPart = `전세 ${jAbs}% · 월세 ${wAbs}% 상승`;
        else if (jDiff < 0 && wDiff < 0) indexPart = `전세 ${jAbs}% · 월세 ${wAbs}% 하락`;
        else indexPart = `전세 ${jAbs}% · 월세 ${wAbs}% 변동`;
    } else if (jDiff != null) {
        indexPart = priceChangePhrase(jDiff).replace('현재 가격', '전세 지수');
    } else if (wDiff != null) {
        indexPart = priceChangePhrase(wDiff).replace('현재 가격', '월세 지수');
    }

    const sdPart = rentSdPhrase(jSd, wSd);
    return {
        label: '전월세지수 · 수급',
        line: sdPart ? `${indexPart}, ${sdPart}` : indexPart,
    };
}

function housingSupplyLine(hs: Record<string, unknown>): OutlookKeyword | null {
    if (!hs || Object.keys(hs).length === 0) return null;

    const planned = Number(
        (hs.nextYears as Record<string, Record<string, unknown>>)?.planned?.count ?? 0,
    ) || 0;
    const moveIn = Number(
        (hs.nextYears as Record<string, Record<string, unknown>>)?.moveIn?.count ?? 0,
    ) || 0;
    const unsold = Number((hs.unsold as Record<string, unknown>)?.current ?? 0) || 0;

    if (!planned && !moveIn && !unsold) return null;

    const parts: string[] = [];
    if (planned) parts.push(`분양 ${planned.toLocaleString()}세대`);
    if (moveIn) parts.push(`입주 ${moveIn.toLocaleString()}세대`);
    if (unsold) parts.push(`미분양 ${unsold.toLocaleString()}세대`);

    return { label: '주택 공급 현황', line: parts.join(' · ') };
}

function loanRateLine(
    ind: Record<string, unknown>,
    macro: Record<string, unknown> | undefined,
    householdLoanRate?: number | null,
): OutlookKeyword | null {
    const loanRaw = householdLoanRate
        ?? (macro?.loanRate as Record<string, unknown>)?.value
        ?? macro?.householdLoanRate;
    const loanRate = parseFloat(String(loanRaw ?? ''));
    if (!Number.isFinite(loanRate) || loanRate <= 0) return null;

    const sale = parseSeries(ind.saleIndex || ind.priceIndex);
    const diff = sale ? sale.current - 100 : 0;
    const priceWord = Math.abs(diff) < 0.5 ? '집값 보합' : diff > 0 ? '집값 상승' : '집값 하락';

    return {
        label: '가격 · 대출금리',
        line: `대출금리 ${loanRate.toFixed(2)}%, ${priceWord} 구간`,
    };
}

function populationLine(pop: Record<string, unknown>): OutlookKeyword | null {
    const umd = (pop.umdComparison as Record<string, unknown>) || {};
    const movement = (pop.movement as Record<string, unknown>) || {};
    const summary = (movement.summary as Record<string, unknown>) || {};

    const change = parseInt(String(umd.change ?? summary.populationChange ?? ''), 10);
    const dong = String(umd.dongNm || '인근');

    if (Number.isFinite(change) && change !== 0) {
        return {
            label: '인구 현황',
            line: `${dong} 인구 ${change > 0 ? '+' : ''}${change.toLocaleString()}명`,
        };
    }

    const recent = parseInt(String(umd.recentPop ?? summary.currentPopulation ?? ''), 10);
    if (!recent) return null;
    return { label: '인구 현황', line: `${dong} 인구 ${recent.toLocaleString()}명` };
}

function sixMonthVolumeLine(
    targetTrades: ApartmentOutlookContext['targetTrades'],
    dealVolumeStats: ApartmentOutlookContext['dealVolumeStats'],
): OutlookKeyword | null {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    if (targetTrades?.length) {
        const sales = targetTrades.filter((t) => {
            if (t._isRent === true) return false;
            const y = Number(t.dealYear);
            const m = Number(t.dealMonth);
            if (!y || !m) return false;
            return new Date(y, m - 1, 1) >= cutoff;
        });
        if (sales.length > 0) {
            return { label: '6개월 거래량', line: `단지 매매 ${sales.length}건` };
        }
    }

    if (!dealVolumeStats?.length) return null;
    const monthly: Record<string, number> = {};
    for (const item of dealVolumeStats) {
        const month = String(item.month || '');
        if (!month) continue;
        monthly[month] = (monthly[month] || 0) + (Number(item.count) || 0);
    }
    const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    const recent = sorted.slice(-6).reduce((s, [, c]) => s + c, 0);
    if (!recent) return null;

    return { label: '6개월 거래량', line: `인근 거래 ${recent.toLocaleString()}건` };
}

function parseDistanceM(value: unknown): number {
    if (value == null) return 99999;
    const n = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 99999;
}

function developmentLine(
    reg: Record<string, unknown>,
    dynamicNews?: Record<string, unknown>,
): OutlookKeyword | null {
    const gosi = Array.isArray(reg.gosi) ? reg.gosi : [];
    const zoneChanges = Array.isArray(reg.zoneChanges) ? reg.zoneChanges : [];
    const execPlans = Array.isArray(reg.executionPlans) ? reg.executionPlans : [];

    const renewal = gosi.filter((g: Record<string, unknown>) =>
        /재개발|재건축|정비/.test(String(g.title || '')),
    ).length;
    const district = gosi.filter((g: Record<string, unknown>) =>
        /지구단위/.test(String(g.title || '')),
    ).length;
    const total = renewal + district + zoneChanges.length + execPlans.length;

    if (total > 0) {
        const parts: string[] = [];
        const renewalTotal = renewal + zoneChanges.length;
        if (renewalTotal) parts.push(`정비·재건축 ${renewalTotal}건`);
        if (district) parts.push(`지구단위 ${district}건`);
        if (execPlans.length) parts.push(`실시계획 ${execPlans.length}건`);
        return { label: '개발 호재', line: `인근 ${parts.join(' · ')}` };
    }

    const items = Array.isArray(dynamicNews?.items) ? dynamicNews.items : [];
    const devNews = items.filter((item: Record<string, unknown>) =>
        /GTX|지하철|재건축|개발|신도시|호재|철도|도로/.test(String(item.title || '')),
    );
    if (devNews.length) {
        return { label: '개발 호재', line: `인근 개발·교통 뉴스 ${devNews.length}건` };
    }

    return null;
}

function transportLine(
    amenities?: Record<string, unknown>,
    spatialFacilities?: Array<Record<string, unknown>>,
): OutlookKeyword | null {
    const traffic = Array.isArray(amenities?.['교통']) ? amenities['교통'] as Array<Record<string, unknown>> : [];
    const infraRe = /철도|지하철|GTX|도로|터널|역|고속|철도건설/;

    const spatial = (spatialFacilities || []).filter((f) =>
        infraRe.test(String(f.name || f.title || f.category || f.type || '')),
    );

    if (traffic.length) {
        const sorted = [...traffic].sort(
            (a, b) => parseDistanceM(a.distance) - parseDistanceM(b.distance),
        );
        const nearest = sorted[0]!;
        const name = String(nearest.name || nearest.place_name || '역').trim();
        const dist = parseDistanceM(nearest.distance);
        const distPart = dist < 99999 ? `${dist}m` : '';
        let line = distPart ? `가장 가까운 ${name} ${distPart}` : `인근 교통 ${traffic.length}곳`;
        if (spatial.length) line += ` · 개발호재 ${spatial.length}건`;
        return { label: '교통 · 인프라', line };
    }

    if (spatial.length) {
        return { label: '교통 · 인프라', line: `반경 내 철도·도로 관련 ${spatial.length}건` };
    }

    return null;
}

/** 10년 스토리 하단 — 현재 전망 키워드 (짧은 한 줄) */
export function buildApartmentOutlookKeywords(ctx: ApartmentOutlookContext): OutlookKeyword[] {
    const ind = (ctx.marketIndicators || {}) as Record<string, unknown>;
    const macro = ctx.macroIndicators as Record<string, unknown> | undefined;
    const reg = (ctx.regulatoryData || {}) as Record<string, unknown>;

    const items: (OutlookKeyword | null)[] = [
        saleIndexLine(ind),
        rentIndexLine(ind),
        housingSupplyLine((ctx.housingSupply || {}) as Record<string, unknown>),
        loanRateLine(ind, macro, ctx.householdLoanRate),
        populationLine((ctx.population || {}) as Record<string, unknown>),
        sixMonthVolumeLine(ctx.targetTrades, ctx.dealVolumeStats),
        developmentLine(reg, ctx.dynamicNews as Record<string, unknown> | undefined),
        transportLine(ctx.amenities, ctx.spatialFacilities),
    ];

    return items.filter((x): x is OutlookKeyword => x != null);
}