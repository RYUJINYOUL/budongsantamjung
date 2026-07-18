import { formatKoreanCurrency } from './shortsSceneData';

export type RiskItemFactsContext = {
    mergedData?: Record<string, unknown>;
    analysisMetadata?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

/** mergedData / rawData / report.rawData 중 첫 번째 유효 값 */
function pickMerged(md: Record<string, unknown>, key: string): unknown {
    const raw = asRecord(md.rawData);
    const report = asRecord(md.report);
    const reportRaw = asRecord(report.rawData);
    if (md[key] !== undefined && md[key] !== null) return md[key];
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
    if (reportRaw[key] !== undefined && reportRaw[key] !== null) return reportRaw[key];
    return undefined;
}

function resolveAnalysisMetadata(ctx: RiskItemFactsContext): Record<string, unknown> {
    const md = ctx.mergedData || {};
    let meta = asRecord(ctx.analysisMetadata || pickMerged(md, 'analysisMetadata'));

    const comparables = asArray(meta.comparables);
    const complexGroups = asArray(meta.complexGroups);

    if (!comparables.length && complexGroups.length) {
        const txType = String(md.transactionType || md.transaction_type || '매매');
        const areaRaw = meta.targetArea
            ?? asRecord(meta.target).area_sqm
            ?? asRecord(asRecord(meta.apartmentTarget).target).exclusiveArea_sqm
            ?? md.area
            ?? md.exclusiveArea_sqm;
        const areaKey = Math.round(Number(areaRaw) || 0);
        const targetKey = `${areaKey}_${txType}`;
        const activeGroup = complexGroups.find((g) => g.groupKey === targetKey) || complexGroups[0];
        const groupMeta = asRecord(activeGroup?.metadata);
        if (Object.keys(groupMeta).length) {
            meta = { ...meta, ...groupMeta };
        }
    }

    if (!meta.userPriceWon) {
        const priceRaw = md.price ?? md.sale_price ?? md.salePrice;
        const priceNum = Number(priceRaw) || 0;
        if (priceNum > 0) {
            meta = { ...meta, userPriceWon: priceNum > 1_000_000 ? priceNum : priceNum * 10000 };
        }
    }

    return meta;
}

function normalizeSidoToken(text: string): string | null {
    const t = text.trim();
    if (!t) return null;
    if (t.includes('서울')) return '서울';
    if (t.includes('부산')) return '부산';
    if (t.includes('대구')) return '대구';
    if (t.includes('인천')) return '인천';
    if (t.includes('광주')) return '광주';
    if (t.includes('대전')) return '대전';
    if (t.includes('울산')) return '울산';
    if (t.includes('세종')) return '세종';
    if (t.includes('경기')) return '경기';
    if (t.includes('강원')) return '강원';
    if (t.includes('충북') || t.includes('충청북')) return '충북';
    if (t.includes('충남') || t.includes('충청남')) return '충남';
    if (t.includes('전북') || t.includes('전라북')) return '전북';
    if (t.includes('전남') || t.includes('전라남')) return '전남';
    if (t.includes('경북') || t.includes('경상북')) return '경북';
    if (t.includes('경남') || t.includes('경상남')) return '경남';
    if (t.includes('제주')) return '제주';
    return null;
}

function extractSigungu(address: string): string | null {
    const match = address.match(/\S+[구군시]/);
    return match?.[0] ?? null;
}

/** 동일 시·구 공급만 (부산 강서구 ↔ 서울 강서구 혼선 방지) */
export function filterSupplyByRegion(
    details: Array<Record<string, unknown>>,
    targetAddress: string,
): Array<Record<string, unknown>> {
    if (!targetAddress || !details.length) return [];
    const targetSido = normalizeSidoToken(targetAddress);
    const targetGu = extractSigungu(targetAddress);
    return details.filter((detail) => {
        const addr = String(detail.address || detail.name || '');
        if (!addr) return false;
        const detailSido = normalizeSidoToken(addr);
        if (targetSido && detailSido && targetSido !== detailSido) return false;
        if (targetGu && !addr.includes(targetGu)) return false;
        return true;
    });
}

function resolveAddress(ctx: RiskItemFactsContext): string {
    const md = ctx.mergedData || {};
    const meta = resolveAnalysisMetadata(ctx);
    const target = asRecord(meta.target);
    const complexInfo = asRecord(pickMerged(md, 'targetComplexInfo'));
    return String(
        target.address
        || md.address
        || complexInfo.address
        || '',
    );
}

function resolveBuilding(ctx: RiskItemFactsContext) {
    const md = ctx.mergedData || {};
    const raw = asRecord(md.rawData);
    const reportRaw = asRecord(asRecord(md.report).rawData);
    const vitals = asRecord(pickMerged(md, 'vitals') || raw.vitals || reportRaw.vitals);
    const building = asRecord(vitals.building || md.building || raw.building);
    const titles = asArray(building.title);
    const title = titles[0] || {};
    const useAprDay = String(
        title.useAprDay
        || md.useAprDay
        || pickMerged(md, 'useAprDay')
        || '',
    );
    let ageYears: number | null = null;
    if (useAprDay.length >= 4) {
        const year = parseInt(useAprDay.slice(0, 4), 10);
        if (Number.isFinite(year)) ageYears = new Date().getFullYear() - year;
    } else if (md.completionYear) {
        ageYears = new Date().getFullYear() - Number(md.completionYear);
    }
    const households = Number(building.totalHouseholds || title.totalHouseholds || 0);
    const parking = Number(building.totalParking || title.totalParking || 0);
    return { useAprDay, ageYears, households, parking, title };
}

function normalizeDealAmountWon(value: unknown): number {
    const num = Number(value) || 0;
    if (num <= 0) return 0;
    return num > 1000000 ? num : num * 10000;
}

function factsNearbySales(ctx: RiskItemFactsContext): string[] {
    const meta = resolveAnalysisMetadata(ctx);
    const comparables = asArray(meta.comparables);
    const facts: string[] = [];

    if (comparables.length) {
        const sameComplex = comparables.filter((c) => Number(c.similarityScore ?? c.score ?? 0) >= 90).length;
        const label = sameComplex === comparables.length
            ? `동일단지 ${comparables.length}건`
            : `비교사례 ${comparables.length}건 (동일단지 ${sameComplex}건)`;
        facts.push(label);
    }

    const estimated = Number(meta.estimatedTotalPrice || meta.weightedTotalPrice || 0);
    const userPrice = Number(meta.userPriceWon || 0);
    const gap = Number(meta.priceGapPercent);

    if (estimated > 0) facts.push(`추정 ${formatKoreanCurrency(estimated)}`);
    if (userPrice > 0) facts.push(`제시 ${formatKoreanCurrency(userPrice)}`);
    if (Number.isFinite(gap) && gap !== 0) {
        facts.push(`${gap > 0 ? '+' : ''}${gap.toFixed(1)}%`);
    }

    const latest = [...comparables].sort((a, b) => {
        const ay = Number(a.dealYear || 0) * 100 + Number(a.dealMonth || 0);
        const by = Number(b.dealYear || 0) * 100 + Number(b.dealMonth || 0);
        return by - ay;
    })[0];

    if (latest) {
        const amount = normalizeDealAmountWon(latest.dealAmount);
        const y = latest.dealYear;
        const m = latest.dealMonth;
        const floor = latest.floor != null ? `${latest.floor}층` : '';
        const area = latest.excluUseAr ?? latest.area;
        const parts = [
            y && m ? `최근 ${y}.${String(m).padStart(2, '0')}` : null,
            amount > 0 ? formatKoreanCurrency(amount) : null,
            floor,
            area ? `${area}㎡` : null,
        ].filter(Boolean);
        if (parts.length) facts.push(parts.join(' · '));
    }

    return facts.slice(0, 4);
}

function factsTradeVolume(ctx: RiskItemFactsContext): string[] {
    const md = ctx.mergedData || {};
    const nearby = asRecord(pickMerged(md, 'nearbyData'));
    const stats = asArray(
        pickMerged(md, 'dealVolumeStats')
        || nearby.volumeStats,
    );

    const monthly: Record<string, number> = {};
    for (const item of stats) {
        const month = String(item.month || '');
        if (!month) continue;
        monthly[month] = (monthly[month] || 0) + (Number(item.count) || 0);
    }

    const sorted = Object.entries(monthly)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

    const facts: string[] = [];
    if (sorted.length >= 2) {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        facts.push(`${first.month} ${first.count.toLocaleString()}건 → ${last.month} ${last.count.toLocaleString()}건`);
        const diff = last.count - first.count;
        facts.push(diff >= 0 ? '거래량 증가 추세' : '거래량 감소 추세');
    } else if (sorted.length === 1) {
        facts.push(`${sorted[0].month} ${sorted[0].count.toLocaleString()}건`);
    }

    const recent6 = sorted.slice(-6).reduce((s, x) => s + x.count, 0);
    if (recent6 > 0) facts.push(`최근 6개월 ${recent6.toLocaleString()}건`);

    const targetTrades = asArray(
        pickMerged(md, 'targetTrades')
        || nearby.targetTrades,
    );
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    const unitSales = targetTrades.filter((t) => {
        if (t._isRent === true) return false;
        const y = Number(t.dealYear);
        const m = Number(t.dealMonth);
        if (!y || !m) return false;
        return new Date(y, m - 1, 1) >= cutoff;
    }).length;
    if (unitSales > 0) facts.push(`동일단지 6개월 매매 ${unitSales}건`);

    if (facts.length === 0) {
        const mi = asRecord(pickMerged(md, 'marketIndicators'));
        const aptMi = asRecord(mi.apartment || mi);
        const tradeVol = asRecord(aptMi.tradeVolume || mi.tradeVolume);
        const summary = asRecord(tradeVol.summary);
        const dataPoints = asArray(tradeVol.data);
        if (dataPoints.length >= 2) {
            const sorted = [...dataPoints].sort((a, b) =>
                String(a.date || '').localeCompare(String(b.date || '')),
            );
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            facts.push(
                `${first.date} ${Number(first.value || 0).toLocaleString()}건 → ${last.date} ${Number(last.value || 0).toLocaleString()}건`,
            );
        }
        const prev = Number(summary.prev || 0);
        const latest = Number(summary.latest || 0);
        if (prev > 0 && latest > 0 && facts.length === 0) {
            facts.push(`${prev.toLocaleString()}건 → ${latest.toLocaleString()}건`);
        }
        const trend = String(summary.trend || '');
        const changeRate = Number(summary.changeRate);
        if (trend) {
            const rateStr = Number.isFinite(changeRate) ? ` (${changeRate > 0 ? '+' : ''}${changeRate.toFixed(1)}%)` : '';
            facts.push(`거래량 ${trend}${rateStr}`);
        }
    }

    return facts.slice(0, 3);
}

function parseDistanceM(value: unknown): number {
    if (value == null) return 99999;
    const n = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 99999;
}

function formatDistance(m: number): string {
    if (m >= 99999) return '';
    if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
    return `${m}m`;
}

function factsAmenities(ctx: RiskItemFactsContext): string[] {
    const md = ctx.mergedData || {};
    const nearby = asRecord(pickMerged(md, 'nearbyData'));
    const amenities = asRecord(nearby.amenities || pickMerged(md, 'amenities'));

    const picks: { dist: number; text: string }[] = [];
    const categories: Array<{ key: string; prefix: string }> = [
        { key: '교통', prefix: '' },
        { key: '공원', prefix: '' },
        { key: '쇼핑', prefix: '' },
        { key: '의료', prefix: '' },
        { key: '학교', prefix: '' },
    ];

    for (const { key } of categories) {
        const items = asArray(amenities[key]);
        if (!items.length) continue;
        const nearest = [...items].sort(
            (a, b) => parseDistanceM(a.distance) - parseDistanceM(b.distance),
        )[0];
        const name = String(nearest.name || key);
        const dist = formatDistance(parseDistanceM(nearest.distance));
        picks.push({
            dist: parseDistanceM(nearest.distance),
            text: dist ? `${name} ${dist}` : name,
        });
    }

    picks.sort((a, b) => a.dist - b.dist);
    return picks.slice(0, 3).map((p) => p.text);
}

function factsRegulatoryOutlook(ctx: RiskItemFactsContext): string[] {
    const md = ctx.mergedData || {};
    const { ageYears } = resolveBuilding(ctx);
    const facts: string[] = [];

    if (ageYears != null) {
        const yearsLeft = Math.max(0, 30 - ageYears);
        facts.push(`준공 ${ageYears}년 · 재건축 연한까지 ${yearsLeft}년`);
    }

    const hs = asRecord(pickMerged(md, 'housingSupply'));
    const unsold = Number(asRecord(hs.unsold).current || 0);
    if (unsold > 0) facts.push(`미분양 ${unsold.toLocaleString()}세대`);

    const address = resolveAddress(ctx);
    const plannedDetails = filterSupplyByRegion(asArray(hs.plannedDetails), address);
    if (plannedDetails.length) {
        const total = plannedDetails.reduce((s, d) => s + (Number(d.count) || 0), 0);
        facts.push(`${extractSigungu(address) || '인근'} 분양·입주 예정 ${total.toLocaleString()}세대 (${plannedDetails.length}곳)`);
    } else {
        const planned = Number(asRecord(asRecord(hs.nextYears).planned).count || 0);
        const moveIn = Number(asRecord(asRecord(hs.nextYears).moveIn).count || 0);
        if (planned > 0) facts.push(`분양 예정 ${planned.toLocaleString()}세대`);
        if (moveIn > 0) facts.push(`입주 예정 ${moveIn.toLocaleString()}세대`);
    }

    const glutScore = Number(hs.glutScore || 0);
    if (glutScore > 0) facts.push(`공급과잉 지수 ${glutScore}/100`);

    const classified = asRecord(pickMerged(md, 'classifiedFactors'));
    const found = Object.values(classified).filter(
        (v) => asRecord(v).found === true,
    ).length;
    if (found > 0) facts.push(`개발·교통 호재 ${found}건 확인`);

    return facts.slice(0, 4);
}

function factsPopulation(ctx: RiskItemFactsContext): string[] {
    const md = ctx.mergedData || {};
    const pop = asRecord(pickMerged(md, 'population'));
    const umd = asRecord(pop.umdComparison);
    const movement = asRecord(pop.movement);
    const summary = asRecord(movement.summary);
    const facts: string[] = [];

    const dongNm = String(umd.dongNm || '인근 동');
    const change = parseInt(String(umd.change ?? summary.populationChange ?? ''), 10);
    const changeRate = parseFloat(String(umd.changeRate ?? ''));

    if (Number.isFinite(change) && change !== 0) {
        const rateStr = Number.isFinite(changeRate) ? ` (${changeRate > 0 ? '+' : ''}${changeRate.toFixed(1)}%)` : '';
        facts.push(`${dongNm} ${change > 0 ? '+' : ''}${change.toLocaleString()}명${rateStr}`);
    } else {
        const recent = parseInt(String(umd.recentPop ?? summary.currentPopulation ?? ''), 10);
        if (recent > 0) facts.push(`${dongNm} 인구 ${recent.toLocaleString()}명`);
    }

    const householdChange = parseInt(String(summary.householdChange ?? ''), 10);
    if (Number.isFinite(householdChange) && householdChange !== 0) {
        facts.push(`세대수 ${householdChange > 0 ? '+' : ''}${householdChange.toLocaleString()}`);
    }

    return facts.slice(0, 2);
}

function factsBuildingAgeRegister(ctx: RiskItemFactsContext): string[] {
    const { useAprDay, ageYears, households, parking } = resolveBuilding(ctx);
    const facts: string[] = [];

    if (useAprDay.length >= 4) {
        const y = useAprDay.slice(0, 4);
        facts.push(ageYears != null ? `${y}년 준공 (${ageYears}년차)` : `${y}년 준공`);
    } else if (ageYears != null) {
        facts.push(`준공 ${ageYears}년차`);
    }

    if (households > 0) facts.push(`${households.toLocaleString()}세대`);
    if (households > 0 && parking > 0) {
        facts.push(`세대당 주차 ${(parking / households).toFixed(2)}대`);
    }

    return facts.slice(0, 3);
}

const KOREAN_RISK_KEY_MAP: Record<string, string> = {
    '인근 실거래가': 'nearbySales',
    '거래량': 'tradeVolume',
    '생활 편의시설': 'amenities',
    '규제 전망': 'regulatoryOutlook',
    '인구 현황': 'population',
    '건물 노후도(대장)': 'buildingAgeRegister',
    '건물 노후도(사진)': 'buildingAgePhoto',
    '토지 이용 규제': 'landRegulation',
    '토지 형상': 'landShape',
    '임대 수익성': 'rentProfitability',
};

/** scoreItems 키가 한글·영문 어느 쪽이든 FACT_BUILDERS 키로 통일 */
export function normalizeRiskItemKey(key: string): string {
    const trimmed = key.trim();
    return KOREAN_RISK_KEY_MAP[trimmed] || trimmed;
}

const FACT_BUILDERS: Record<string, (ctx: RiskItemFactsContext) => string[]> = {
    nearbySales: factsNearbySales,
    tradeVolume: factsTradeVolume,
    amenities: factsAmenities,
    regulatoryOutlook: factsRegulatoryOutlook,
    population: factsPopulation,
    buildingAgeRegister: factsBuildingAgeRegister,
};

/** 세부 리스크 항목별 공공데이터 팩트 (UI 칩용) */
export function buildRiskItemFacts(
    key: string,
    ctx: RiskItemFactsContext,
): string[] {
    const normalizedKey = normalizeRiskItemKey(key);
    const builder = FACT_BUILDERS[normalizedKey];
    if (!builder) return [];
    try {
        return builder(ctx).filter(Boolean);
    } catch {
        return [];
    }
}
