'use client';

import type { ReactNode } from 'react';
import { MapPin, Search, CheckSquare, Layers, Building2, Users } from 'lucide-react';
import PremiumRiskGauge from '../PremiumRiskGauge';
import {
    SHORTS_WIDTH,
    SHORTS_HEIGHT,
    SHORTS_BG,
    type ShortsSceneData,
    type TenYearStoryPeriodItem,
    type TenYearStorySummary,
    type MarketInsightItem,
    formatTradeManwon,
    formatKoreanCurrency,
} from '../../lib/shortsSceneData';
import { selectTenYearPeriodsForImage } from '../../lib/shortsTenYearQuarters';
import { landBadgeColors } from '../../lib/landLocationSummary';

function ShortsCanvas({
    sceneId,
    label,
    children,
    preview = false,
}: {
    sceneId: number;
    label: string;
    children: ReactNode;
    preview?: boolean;
}) {
    const className = 'shorts-native-canvas relative flex flex-col overflow-hidden text-white select-none';
    const style = {
        width: SHORTS_WIDTH,
        height: SHORTS_HEIGHT,
        backgroundColor: SHORTS_BG,
        flexShrink: 0,
    } as const;

    if (preview) {
        return (
            <div className={className} style={style}>
                {children}
            </div>
        );
    }

    return (
        <section
            data-shorts-scene={sceneId}
            data-shorts-label={label}
            className={className}
            style={style}
        >
            {children}
        </section>
    );
}

function ShortsBrandBar({ sceneLabel }: { sceneLabel: string }) {
    return (
        <div className="shrink-0 flex items-center justify-between px-14 pt-14 pb-9 border-b border-white/[0.08]">
            <div className="flex items-center gap-5 min-w-0">
                <div className="w-[72px] h-[72px] shrink-0 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
                    <Search className="w-9 h-9 text-sky-300" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                    <p className="text-[40px] font-black tracking-tight leading-none">부동산탐정 APP</p>
                    <p className="text-[24px] text-white/45 font-semibold mt-2 truncate">{sceneLabel}</p>
                </div>
            </div>
            <span className="shrink-0 ml-4 text-[35px] font-bold text-white/60 text-right leading-snug max-w-[240px]">
                애플·구글 다운 
            </span>
        </div>
    );
}

function ShortsFooter() {
    return (
        <div className="shrink-0 mt-auto px-14 py-10 border-t border-white/[0.08] flex justify-between items-center gap-6">
            <span className="text-[33px] text-white font-medium leading-snug">구글 · 네이버 : 부동산탐정 검색</span>
            <span className="text-[33px] text-white font-semibold shrink-0">www.tamjung.me</span>
        </div>
    );
}

function Scene1Map({ data }: { data: ShortsSceneData }) {
    const titleLen = data.locationLabel.length;
    const titleClass =
        titleLen > 40 ? 'text-[28px] leading-[1.35]' :
        titleLen > 28 ? 'text-[32px] leading-[1.35]' :
        'text-[36px] leading-tight';

    return (
        <ShortsCanvas sceneId={1} label="map">
            <ShortsBrandBar sceneLabel="매물 위치" />
            <div className="flex-1 flex flex-col px-12 py-8 min-h-0">
                <div className="flex items-start gap-3 mb-6">
                    <MapPin className="w-7 h-7 text-sky-400 shrink-0 mt-1" />
                    <h2
                        className={`${titleClass} font-black tracking-tight text-left break-keep`}
                        style={{ wordBreak: 'keep-all' }}
                    >
                        {data.locationLabel}
                    </h2>
                </div>
                <div className="flex-1 min-h-0 rounded-[32px] overflow-hidden border border-white/10 bg-slate-900 shadow-inner">
                    {data.mapProxyUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={data.mapProxyUrl}
                            alt="매물 위치"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-xl">
                            위치 정보 없음
                        </div>
                    )}
                </div>
                <p className="text-right text-[11px] text-white/25 mt-4">© Kakao Corp.</p>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function Scene2AiSummary({ data }: { data: ShortsSceneData }) {
    const { aiSummary } = data;
    const badges = [
        { label: aiSummary.scoreTier.label, color: aiSummary.scoreTier.color },
        ...(aiSummary.priceLabel ? [{ label: aiSummary.priceLabel, color: '#94a3b8' }] : []),
        ...(aiSummary.grade !== '-' ? [{ label: `${aiSummary.grade}등급`, color: '#38bdf8' }] : []),
    ];
    const summaryLen = aiSummary.summaryText.length;
    const summarySizeClass =
        summaryLen > 320 ? 'text-[30px] leading-[1.55]' :
        summaryLen > 220 ? 'text-[34px] leading-[1.6]' :
        'text-[38px] leading-[1.65]';

    return (
        <ShortsCanvas sceneId={2} label="ai-summary">
            <ShortsBrandBar sceneLabel="AI 탐정 분석 결과" />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className="flex flex-col items-start w-full max-w-[980px] gap-12">
                    <div className="w-full flex justify-center">
                        <PremiumRiskGauge score={aiSummary.score} size="shorts" />
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 w-full">
                        {badges.map((b) => (
                            <span
                                key={b.label}
                                className="px-9 py-3.5 rounded-full border text-[30px] font-black leading-none"
                                style={{ color: b.color, borderColor: `${b.color}55`, backgroundColor: `${b.color}18` }}
                            >
                                {b.label}
                            </span>
                        ))}
                    </div>
                    <p
                        className={`${summarySizeClass} font-bold text-white/90 text-left w-full break-keep`}
                        style={{ wordBreak: 'keep-all' }}
                    >
                        {aiSummary.summaryText}
                    </p>
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function formatExclusiveAreaLabel(area: number): string {
    const label = area % 1 === 0 ? String(area) : area.toFixed(1);
    return `전용 ${label}㎡`;
}

function Scene3ApartmentTrades({ data }: { data: ShortsSceneData }) {
    const count = data.pyungTrades.length;
    const compact = count >= 3;
    const areaClass = compact ? 'text-[34px]' : 'text-[42px]';
    const rowClass = compact ? 'text-[26px]' : 'text-[30px]';
    const cardGap = compact ? 'gap-6' : 'gap-8';
    const cardPad = compact ? 'p-9' : 'p-10';
    const blockGap = compact ? 'gap-8' : 'gap-10';

    return (
        <ShortsCanvas sceneId={3} label="pyung-trades">
            <ShortsBrandBar sceneLabel={`${data.targetComplexName} 실거래`} />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className={`flex flex-col items-start w-full max-w-[980px] ${blockGap}`}>
                    <h2 className="text-[42px] font-black text-left tracking-tight w-full">6개월 실거래가</h2>
                    {count === 0 ? (
                        <p className="text-white/40 text-[32px] font-medium text-left">실거래 데이터 없음</p>
                    ) : (
                        <div className={`flex flex-col w-full ${cardGap}`}>
                            {data.pyungTrades.map((row) => (
                                <div
                                    key={row.exclusiveArea}
                                    className={`rounded-[32px] border border-sky-500/25 bg-sky-950/35 ${cardPad} space-y-5 w-full`}
                                >
                                    <p className={`${areaClass} font-black text-sky-300 text-left`}>{formatExclusiveAreaLabel(row.exclusiveArea)}</p>
                                    <div className={`space-y-4 ${rowClass}`}>
                                        <div className="flex justify-between items-center gap-6">
                                            <span className="text-white/50 font-semibold shrink-0">직전 거래</span>
                                            <span className="font-black text-right">{formatTradeManwon(row.recentPrice)} · {row.recentFloor}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-6">
                                            <span className="text-white/50 font-semibold shrink-0">6개월 최고</span>
                                            <span className="font-black text-rose-400 text-right">{formatTradeManwon(row.maxPrice)}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-6">
                                            <span className="text-white/50 font-semibold shrink-0">6개월 최저</span>
                                            <span className="font-black text-emerald-400 text-right">{formatTradeManwon(row.minPrice)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function Scene3LandLocation({ data }: { data: ShortsSceneData }) {
    const rows = data.landLocationRows;
    const count = rows.length;
    const compact = count >= 4;
    const titleClass = 'text-[38px] font-black text-left tracking-tight w-full';
    const labelClass = compact ? 'text-[20px]' : 'text-[22px]';
    const badgeClass = compact ? 'text-[18px] px-3 py-1' : 'text-[20px] px-3.5 py-1.5';
    const rowTitleClass = compact ? 'text-[26px]' : 'text-[28px]';
    const rowDescClass = compact ? 'text-[22px] leading-[1.5]' : 'text-[24px] leading-[1.55]';
    const rowGap = compact ? 'gap-5' : 'gap-6';
    const rowPad = compact ? 'py-5' : 'py-6';
    const disclaimerClass = compact ? 'text-[18px] leading-[1.5]' : 'text-[20px] leading-[1.55]';

    return (
        <ShortsCanvas sceneId={3} label="land-summary">
            <ShortsBrandBar sceneLabel="토지 입지 및 형상 분석" />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className={`flex flex-col items-start w-full max-w-[980px] ${compact ? 'gap-7' : 'gap-8'}`}>
                    <h2 className={`${titleClass} flex items-center gap-4`}>
                        <Layers className="w-10 h-10 text-sky-400 shrink-0" />
                        토지 입지 및 형상 분석 요약
                    </h2>
                    {count === 0 ? (
                        <p className="text-white/40 text-[30px] font-medium text-left">토지 분석 데이터 없음</p>
                    ) : (
                        <div className="w-full rounded-[32px] border border-white/10 bg-white/[0.03] overflow-hidden">
                            {rows.map((row, i) => {
                                const colors = landBadgeColors(row.type);
                                return (
                                    <div
                                        key={`${row.label}-${i}`}
                                        className={`flex flex-col gap-3 ${rowPad} px-7 border-b border-white/[0.06] last:border-0 text-left ${rowGap}`}
                                    >
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`${labelClass} font-semibold text-white/45`}>{row.label}</span>
                                            <span
                                                className={`${badgeClass} rounded-lg border font-bold`}
                                                style={{ color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }}
                                            >
                                                {row.badge}
                                            </span>
                                        </div>
                                        <p className={`${rowTitleClass} font-bold text-white`}>{row.title}</p>
                                        <p
                                            className={`${rowDescClass} text-white/55 font-medium break-keep`}
                                            style={{ wordBreak: 'keep-all' }}
                                        >
                                            {row.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <p className={`${disclaimerClass} text-white/35 font-medium text-left break-keep`} style={{ wordBreak: 'keep-all' }}>
                        {data.landLocationDisclaimer}
                    </p>
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function Scene3Content({ data }: { data: ShortsSceneData }) {
    if (data.isApartment) {
        return <Scene3ApartmentTrades data={data} />;
    }

    return <Scene3LandLocation data={data} />;
}

function Scene4ApartmentMarket({ data }: { data: ShortsSceneData }) {
    const blocks = data.apartmentMarketBlocks;

    return (
        <ShortsCanvas sceneId={4} label="market-trend">
            <ShortsBrandBar sceneLabel={data.marketTitle} />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className="flex flex-col items-start w-full max-w-[980px] gap-7">
                    <h2 className="text-[42px] font-black text-left tracking-tight w-full">아파트 시장 동향 - 부동산원 출처</h2>
                    {blocks.length === 0 ? (
                        <p className="text-white/40 text-[30px] font-medium text-left">시장 지표 데이터 없음</p>
                    ) : (
                        blocks.map((block) => (
                            <div
                                key={block.key}
                                className="w-full rounded-[35px] border border-white/10 bg-white/[0.03] p-7 space-y-4"
                            >
                                <p className="text-[35px] font-black text-white leading-tight">{block.title}</p>
                                
                                <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                                    
                                    <p className="text-[35px] font-bold" style={{ color: block.accent }}>
                                        {block.trendLine}
                                    </p>
                                    <p
                                        className="text-[30px] leading-[1.55] text-white/80 font-medium break-keep"
                                        style={{ wordBreak: 'keep-all' }}
                                    >
                                        {block.body}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function trendChipStyle(trend?: string) {
    if (trend === '상승') return { text: '#fb7185', border: '#fb718533', bg: '#fb718518' };
    if (trend === '하락') return { text: '#38bdf8', border: '#38bdf833', bg: '#38bdf818' };
    return { text: '#94a3b8', border: '#94a3b833', bg: '#94a3b818' };
}

function formatTrendChip(item: MarketInsightItem) {
    if (!item.trend) return null;
    const arrow = item.trend === '상승' ? '▲' : item.trend === '하락' ? '▼' : '─';
    const suffix = item.changeLabel ? `${item.trend} ${item.changeLabel}` : item.trend;
    return `${arrow} ${suffix}`;
}

function Scene4RoneMarket({ data }: { data: ShortsSceneData }) {
    const items = data.marketInsightItems;
    const count = items.length;
    const compact = count >= 4;
    const titleClass = 'text-[38px] font-black text-left tracking-tight w-full';
    const labelClass = compact ? 'text-[24px]' : 'text-[26px]';
    const chipClass = compact ? 'text-[18px] px-3 py-1' : 'text-[20px] px-3.5 py-1.5';
    const subLineClass = compact ? 'text-[20px]' : 'text-[22px]';
    const valueClass = compact ? 'text-[40px]' : 'text-[44px]';
    const unitClass = compact ? 'text-[22px]' : 'text-[24px]';
    const bodyClass = compact ? 'text-[22px] leading-[1.5]' : 'text-[24px] leading-[1.55]';
    const cardGap = compact ? 'gap-5' : 'gap-6';
    const cardPad = compact ? 'p-6' : 'p-7';

    return (
        <ShortsCanvas sceneId={4} label="market-trend">
            <ShortsBrandBar sceneLabel={data.marketTitle} />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className={`flex flex-col items-start w-full max-w-[980px] ${compact ? 'gap-7' : 'gap-8'}`}>
                    <h2 className={`${titleClass} flex items-center gap-4`}>
                        <span className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: data.marketAccentColor }} />
                        {data.marketReportTitle}
                    </h2>
                    {count === 0 ? (
                        <p className="text-white/40 text-[30px] font-medium text-left">시장 지표 데이터 없음</p>
                    ) : (
                        <div className={`flex flex-col w-full ${cardGap}`}>
                            {items.map((item, i) => {
                                const chip = formatTrendChip(item);
                                const chipColors = trendChipStyle(item.trend);
                                return (
                                    <div
                                        key={`${item.label}-${i}`}
                                        className={`w-full rounded-[28px] border border-white/10 bg-white/[0.03] ${cardPad} space-y-4 text-left`}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <p className={`${labelClass} font-black text-white/90`}>{item.label}</p>
                                            {chip && (
                                                <span
                                                    className={`${chipClass} rounded-lg border font-bold shrink-0`}
                                                    style={{ color: chipColors.text, borderColor: chipColors.border, backgroundColor: chipColors.bg }}
                                                >
                                                    {chip}
                                                </span>
                                            )}
                                        </div>
                                        {item.subLine && (
                                            <p className={`${subLineClass} font-semibold text-white/45`}>{item.subLine}</p>
                                        )}
                                        {item.headlineValue && (
                                            <div className="flex items-baseline gap-1">
                                                <span className={`${valueClass} font-black leading-none`} style={{ color: data.marketAccentColor }}>
                                                    {item.headlineValue}
                                                </span>
                                                {item.headlineUnit && (
                                                    <span className={`${unitClass} font-black text-white/45`}>{item.headlineUnit}</span>
                                                )}
                                            </div>
                                        )}
                                        <p
                                            className={`${bodyClass} text-white/75 font-medium break-keep`}
                                            style={{ wordBreak: 'keep-all' }}
                                        >
                                            {item.body}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function Scene4Market({ data }: { data: ShortsSceneData }) {
    if (data.isApartment) {
        return <Scene4ApartmentMarket data={data} />;
    }

    return <Scene4RoneMarket data={data} />;
}

function Scene5SupplyPopulation({ data }: { data: ShortsSceneData }) {
    const hs = data.housingSupply;
    const pop = data.populationUmd;
    const fmt = (v: string) => Number(v || 0).toLocaleString();
    const changeVal = parseInt(pop.change, 10) || 0;
    const changeRateVal = parseFloat(pop.changeRate) || 0;
    const isGrowing = changeVal >= 0;
    const changeAccent = isGrowing ? '#34d399' : '#fb7185';
    const recentLabel = pop.recentMonthLabel
        ? `최근 인구 (${pop.recentMonthLabel})`
        : '최근 인구';

    const supplyRows: { label: string; value: string; accent: string }[] = [
        { label: '향후 분양 예정', value: `${fmt(hs.planned)} 세대`, accent: '#38bdf8' },
        { label: '입주 예정 물량', value: `${fmt(hs.moveIn)} 세대`, accent: '#c084fc' },
        { label: '미분양 현황', value: `${fmt(hs.unsold)} 세대 (${hs.unsoldTrend})`, accent: '#34d399' },
    ];

    return (
        <ShortsCanvas sceneId={5} label="supply-population">
            <ShortsBrandBar sceneLabel="주택 공급 · 인구 변동" />
            <div className="flex-1 flex flex-col px-14 pt-10 pb-10 min-h-0 w-full">
                <h2 className="shrink-0 text-[38px] font-black text-left tracking-tight w-full flex items-center gap-4 mb-10">
                    <Building2 className="w-10 h-10 text-sky-400 shrink-0" />
                    주택 공급 · 세부 인구 변동
                </h2>

                {!hs.hasData && !pop.hasData ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-white/40 text-[32px] font-medium">공급·인구 데이터 부족</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col justify-center w-full min-h-0 gap-10">
                        {hs.hasData && (
                            <div className="flex flex-col w-full gap-5 shrink-0">
                                <h3 className="text-[32px] font-black text-left flex items-center gap-3 shrink-0 text-white/90">
                                    <Building2 className="w-9 h-9 text-sky-400 shrink-0" />
                                    주택 공급 현황
                                </h3>
                                <div className="flex flex-col w-full gap-4">
                                    {supplyRows.map((row) => (
                                        <div
                                            key={row.label}
                                            className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] px-8 py-6 text-left flex items-center justify-between shadow-lg"
                                        >
                                            <p className="text-[24px] font-bold text-white/50">{row.label}</p>
                                            <p className="text-[36px] font-black leading-none tracking-tight" style={{ color: row.accent }}>
                                                {row.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 min-h-[40px] max-h-[80px]" />

                        {pop.hasData && (
                            <div className="flex flex-col w-full gap-5 shrink-0">
                                <h3 className="text-[32px] font-black text-left flex items-center gap-3 shrink-0 text-white/90">
                                    <Users className="w-9 h-9 text-teal-400 shrink-0" />
                                    {pop.dongNm} 인구 변동
                                </h3>
                                <div className="flex flex-col w-full gap-4">
                                    <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] px-8 py-5 text-left flex items-center justify-between shadow-lg">
                                        <p className="text-[24px] font-bold text-white/50">2022년 10월 인구</p>
                                        <p className="text-[34px] font-black text-white leading-none tracking-tight">{fmt(pop.pastPop)}명</p>
                                    </div>
                                    <div className="w-full rounded-[28px] border border-teal-500/20 bg-teal-500/[0.07] px-8 py-5 text-left flex items-center justify-between shadow-lg">
                                        <p className="text-[24px] font-bold text-white/50">{recentLabel}</p>
                                        <p className="text-[34px] font-black text-teal-300 leading-none tracking-tight">{fmt(pop.recentPop)}명</p>
                                    </div>
                                    <div
                                        className="w-full rounded-[28px] border px-8 py-5 text-left flex items-center justify-between gap-6 shadow-lg"
                                        style={{
                                            borderColor: isGrowing ? '#34d39933' : '#fb718533',
                                            backgroundColor: isGrowing ? '#34d39915' : '#fb718515',
                                        }}
                                    >
                                        <p className="text-[24px] font-bold text-white/50 shrink-0">변동 내역</p>
                                        <p className="text-[34px] font-black text-right leading-none tracking-tight" style={{ color: changeAccent }}>
                                            {changeVal >= 0 ? '+' : ''}{changeVal.toLocaleString()}명 ({changeVal >= 0 ? '+' : ''}{changeRateVal.toFixed(2)}%)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function Scene7MustCheck({ data }: { data: ShortsSceneData }) {
    const count = data.mustCheck.length;
    const compact = count >= 4;
    const titleClass = 'text-[42px] font-black text-left tracking-tight w-full';
    const itemTextClass = compact ? 'text-[28px] leading-[1.55]' : 'text-[32px] leading-[1.6]';
    const iconClass = compact ? 'w-9 h-9' : 'w-10 h-10';
    const itemPad = compact ? 'p-8' : 'p-9';
    const itemGap = compact ? 'gap-6' : 'gap-7';
    const blockGap = compact ? 'gap-8' : 'gap-10';

    return (
        <ShortsCanvas sceneId={7} label="must-check">
            <ShortsBrandBar sceneLabel="중요 체크리스트" />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className={`flex flex-col items-start w-full max-w-[980px] ${blockGap}`}>
                    <h2 className={titleClass}>꼭 확인하세요</h2>
                    {count === 0 ? (
                        <p className="text-white/40 text-[32px] font-medium text-left">체크리스트 없음</p>
                    ) : (
                        <div className={`flex flex-col w-full ${itemGap}`}>
                            {data.mustCheck.map((item, i) => (
                                <div
                                    key={i}
                                    className={`flex gap-5 items-start ${itemPad} rounded-[28px] border border-[#fde2e4]/25 bg-[#fde2e4]/[0.06] w-full`}
                                >
                                    <CheckSquare className={`${iconClass} text-[#fde2e4] shrink-0 mt-1`} />
                                    <p className={`${itemTextClass} text-white/85 font-medium text-left break-keep`} style={{ wordBreak: 'keep-all' }}>
                                        {item}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function getTenYearPeriodSizing(count: number) {
    if (count <= 2) {
        return {
            period: 'text-[30px]',
            title: 'text-[32px]',
            price: 'text-[42px]',
            badge: 'h-14 w-14 text-[26px]',
            rowPad: 'py-5 px-5',
            itemGap: 'gap-8',
        };
    }
    if (count <= 4) {
        return {
            period: 'text-[30px]',
            title: 'text-[34px]',
            price: 'text-[40px]',
            badge: 'h-14 w-14 text-[26px]',
            rowPad: 'py-4 px-5',
            itemGap: 'gap-6',
        };
    }
    if (count <= 6) {
        return {
            period: 'text-[28px]',
            title: 'text-[32px]',
            price: 'text-[38px]',
            badge: 'h-13 w-13 text-[25px]',
            rowPad: 'py-3 px-4',
            itemGap: 'gap-5',
        };
    }
    return {
        period: 'text-[24px]',
        title: 'text-[28px]',
        price: 'text-[34px]',
        badge: 'h-11 w-11 text-[22px]',
        rowPad: 'py-2.5 px-4',
        itemGap: 'gap-3',
    };
}

function getOutlookSizing(count: number) {
    if (count <= 4) return { label: 'text-[40px]', line: 'text-[34px] leading-[1.4]', badge: 'h-16 w-16 text-[28px]', itemGap: 'gap-5' };
    if (count <= 6) return { label: 'text-[36px]', line: 'text-[30px] leading-[1.4]', badge: 'h-14 w-14 text-[26px]', itemGap: 'gap-4' };
    return { label: 'text-[32px]', line: 'text-[28px] leading-[1.35]', badge: 'h-12 w-12 text-[24px]', itemGap: 'gap-3' };
}

function TenYearPeriodRowCompact({
    item,
    index,
    sizing,
}: {
    item: TenYearStoryPeriodItem;
    index: number;
    sizing: ReturnType<typeof getTenYearPeriodSizing>;
}) {
    return (
        <div
            className={`flex items-start gap-5 w-full shrink-0 rounded-[24px] border border-violet-500/20 bg-violet-950/30 ${sizing.rowPad}`}
        >
            <span
                className={`flex ${sizing.badge} shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 font-black text-emerald-400`}
            >
                {index + 1}
            </span>
            <div className="min-w-0 flex-1 flex flex-col text-left">
                <p className={`${sizing.period} font-black text-violet-300 leading-tight`}>{item.periodLabel}</p>
                {item.priceHighlight && (
                    <p
                        className={`${sizing.price} font-black text-amber-300 leading-snug my-3 break-keep`}
                        style={{ wordBreak: 'keep-all' }}
                    >
                        {item.priceHighlight}
                    </p>
                )}
                <p
                    className={`${sizing.title} font-bold text-white/90 leading-snug break-keep ${item.priceHighlight ? '' : 'mt-2'}`}
                    style={{ wordBreak: 'keep-all' }}
                >
                    {item.title}
                </p>
            </div>
        </div>
    );
}

function TenYearHistoryHeader({ story }: { story: TenYearStorySummary }) {
    return (
        <div className="shrink-0 w-full pb-3 border-b border-violet-500/25">
            <h2 className="text-[36px] font-black text-left tracking-tight leading-[1.2]">
                <span className="text-violet-300">{story.regionLabel}</span>
                {' '}
                <span className="text-white">{story.complexName}</span>
                <span className="text-emerald-300"> · 10년 동향</span>
            </h2>
            <p className="text-[22px] font-semibold text-white/40 mt-2">기간별 흐름 + 단지 매매 가격 변동</p>
        </div>
    );
}

function TenYearOutlookHeader({ story }: { story: TenYearStorySummary }) {
    return (
        <div className="shrink-0 w-full pb-5 border-b-2 border-emerald-500/25">
            <h2 className="text-[48px] font-black text-left tracking-tight leading-[1.25]">
                <span className="text-emerald-300">{story.regionLabel}</span>
                {' '}
                <span className="text-white">{story.complexName}</span>
                <span className="text-white/80"> 아파트 현재 전망</span>
            </h2>
        </div>
    );
}

function Scene9TenYearCombined({ data }: { data: ShortsSceneData }) {
    const story = data.tenYearStory;
    const allPeriods = [
        ...(story?.card1 || []),
        ...(story?.card2 || []),
        ...(story?.card3 || []),
    ];
    if (!allPeriods.length) return null;

    const displayPeriods = selectTenYearPeriodsForImage(allPeriods);
    const sizing = getTenYearPeriodSizing(displayPeriods.length);

    return (
        <ShortsCanvas sceneId={9} label="ten-year-combined">
            <ShortsBrandBar sceneLabel="10년 시장 흐름" />
            <div className="flex-1 flex flex-col px-14 pt-2 pb-2 min-h-0 w-full">
                <div className="flex flex-col h-full w-full min-h-0">
                    <TenYearHistoryHeader story={story!} />
                    <div className="flex-1 flex flex-col justify-center min-h-0 w-full rounded-[28px] border border-violet-500/25 bg-violet-950/20 px-6 py-4 mt-2">
                        <div className={`flex flex-col w-full ${sizing.itemGap}`}>
                            {displayPeriods.map((item, i) => (
                                <TenYearPeriodRowCompact
                                    key={`${item.periodLabel}-${i}`}
                                    item={item}
                                    index={i}
                                    sizing={sizing}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function Scene11TenYearOutlook({ data }: { data: ShortsSceneData }) {
    const story = data.tenYearStory;
    if (!story?.outlookKeywords.length) return null;

    const count = story.outlookKeywords.length;
    const sizing = getOutlookSizing(count);

    return (
        <ShortsCanvas sceneId={11} label="ten-year-outlook">
            <ShortsBrandBar sceneLabel="현재 전망 키워드" />
            <div className="flex-1 flex flex-col px-14 pt-4 pb-2 min-h-0 w-full">
                <div className="flex flex-col h-full w-full min-h-0">
                    <TenYearOutlookHeader story={story} />
                    <div className="flex-1 flex flex-col min-h-0 w-full rounded-[28px] border border-emerald-500/25 bg-emerald-950/20 px-8 py-5 mt-3">
                        {story.outlookKeywords.map((item, idx) => (
                            <div
                                key={`${item.label}-${idx}`}
                                className={`flex-1 flex items-center ${sizing.itemGap} w-full min-h-0 border-b border-emerald-500/15 last:border-0`}
                            >
                                <span className={`flex ${sizing.badge} shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 font-black text-emerald-400`}>
                                    {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className={`${sizing.label} font-black text-emerald-300/95 text-left leading-tight`}>{item.label}</p>
                                    <p
                                        className={`${sizing.line} text-white/80 font-medium mt-1.5 text-left break-keep`}
                                        style={{ wordBreak: 'keep-all' }}
                                    >
                                        {item.line}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

interface ShortsNativeFramesProps {
    data: ShortsSceneData;
}

export {
    Scene1Map,
    Scene2AiSummary,
    Scene9TenYearCombined,
    Scene11TenYearOutlook,
    Scene3Content,
    Scene4Market,
    Scene5SupplyPopulation,
    Scene7MustCheck,
};

export default function ShortsNativeFrames({ data }: ShortsNativeFramesProps) {
    return (
        <>
            <Scene1Map data={data} />
            <Scene2AiSummary data={data} />
            <Scene3Content data={data} />
            <Scene4Market data={data} />
            <Scene5SupplyPopulation data={data} />
            <Scene7MustCheck data={data} />
            {data.isApartment && data.tenYearStory?.hasContent && (
                <>
                    <Scene9TenYearCombined data={data} />
                    <Scene11TenYearOutlook data={data} />
                </>
            )}
        </>
    );
}

export { SHORTS_WIDTH, SHORTS_HEIGHT };
