'use client';

import type { ReactNode } from 'react';
import { MapPin, Search, CheckSquare, Layers, Building2, Users } from 'lucide-react';
import PremiumRiskGauge from '../PremiumRiskGauge';
import {
    SHORTS_WIDTH,
    SHORTS_HEIGHT,
    SHORTS_BG,
    type ShortsSceneData,
    type MarketInsightItem,
    formatTradeManwon,
    formatKoreanCurrency,
} from '../../lib/shortsSceneData';
import { landBadgeColors } from '../../lib/landLocationSummary';

function ShortsCanvas({
    sceneId,
    label,
    children,
}: {
    sceneId: number;
    label: string;
    children: ReactNode;
}) {
    return (
        <section
            data-shorts-scene={sceneId}
            data-shorts-label={label}
            className="shorts-native-canvas relative flex flex-col overflow-hidden text-white select-none"
            style={{
                width: SHORTS_WIDTH,
                height: SHORTS_HEIGHT,
                backgroundColor: SHORTS_BG,
                flexShrink: 0,
            }}
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
                    <p className="text-[40px] font-black tracking-tight leading-none">부동산탐정</p>
                    <p className="text-[24px] text-white/45 font-semibold mt-2 truncate">{sceneLabel}</p>
                </div>
            </div>
            <span className="shrink-0 ml-4 text-[15px] font-bold text-white/30 text-right leading-snug max-w-[240px]">
                부동산탐정 앱 다운로드
            </span>
        </div>
    );
}

function ShortsFooter() {
    return (
        <div className="shrink-0 mt-auto px-14 py-10 border-t border-white/[0.08] flex justify-between items-center gap-6">
            <span className="text-[22px] text-white/35 font-medium leading-snug">투자 판단 참고용 · AI 분석 리포트</span>
            <span className="text-[20px] text-white/25 font-semibold shrink-0">tamjung.me</span>
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

function Scene2_2Valuation({ data }: { data: ShortsSceneData }) {
    const v = data.valuation;
    if (!v) return null;

    const tradeGroups = v.groups.filter((g) => g.transactionType === '매매');
    const jeonseGroups = v.groups.filter((g) => g.transactionType === '전세');
    const rentGroups = v.groups.filter((g) => g.transactionType === '월세');

    const formatWon = (val: number) => {
        if (!val) return '-';
        return formatKoreanCurrency(val).replace(' 원', '').replace('원', '');
    };

    return (
        <ShortsCanvas sceneId={8} label="valuation-ledger">
            <ShortsBrandBar sceneLabel="아파트 가치 분석" />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className="flex flex-col items-start w-full max-w-[980px] gap-8">
                    {/* 1. 산출 범위 및 제시가 */}
                    <div className="w-full rounded-[32px] border border-emerald-500/25 bg-emerald-950/20 p-8 space-y-5">
                        <h3 className="text-[34px] font-black text-emerald-300 text-left">검증 대상 및 추정 범위</h3>
                        <div className="space-y-4 text-[28px]">
                            {v.minRange > 0 && v.maxRange > 0 && (
                                <div className="flex justify-between items-center gap-6">
                                    <span className="text-white/50 font-semibold shrink-0">적정 산출 범위</span>
                                    <span className="font-black text-right text-white">
                                        {formatWon(v.minRange)} ~ {formatWon(v.maxRange)}
                                    </span>
                                </div>
                            )}
                            {v.userPrice > 0 && (
                                <div className="flex justify-between items-center gap-6">
                                    <span className="text-white/50 font-semibold shrink-0">제시 {v.txType}가</span>
                                    <span className="font-black text-right text-emerald-400">
                                        {formatWon(v.userPrice)} <span className="text-[22px] text-white/40 font-bold">{v.priceSuffix}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. 거래유형별 / 면적별 추정가 원장 */}
                    <div className="w-full space-y-5">
                        <h3 className="text-[38px] font-black text-left tracking-tight w-full">타입별 추정가 원장</h3>
                        <div className="grid grid-cols-3 gap-5 w-full">
                            {/* 매매 Column */}
                            <div className="rounded-[28px] border border-sky-500/20 bg-sky-950/15 p-6 flex flex-col gap-4">
                                <p className="text-[28px] font-black text-sky-300 text-center border-b border-sky-500/20 pb-2">매매</p>
                                <div className="flex flex-col gap-4">
                                    {tradeGroups.length === 0 ? (
                                        <p className="text-white/30 text-[20px] text-center py-4">데이터 없음</p>
                                    ) : (
                                        tradeGroups.map((g, idx) => (
                                            <div key={idx} className="flex flex-col items-center">
                                                <span className="text-white/40 text-[18px] font-bold">{g.area.toFixed(1)}㎡</span>
                                                <span className="text-white text-[23px] font-black mt-0.5">{formatWon(g.estimatedTotalPrice)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 전세 Column */}
                            <div className="rounded-[28px] border border-purple-500/20 bg-purple-950/15 p-6 flex flex-col gap-4">
                                <p className="text-[28px] font-black text-purple-300 text-center border-b border-purple-500/20 pb-2">전세</p>
                                <div className="flex flex-col gap-4">
                                    {jeonseGroups.length === 0 ? (
                                        <p className="text-white/30 text-[20px] text-center py-4">데이터 없음</p>
                                    ) : (
                                        jeonseGroups.map((g, idx) => (
                                            <div key={idx} className="flex flex-col items-center">
                                                <span className="text-white/40 text-[18px] font-bold">{g.area.toFixed(1)}㎡</span>
                                                <span className="text-white text-[23px] font-black mt-0.5">{formatWon(g.estimatedTotalPrice)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 월세 Column */}
                            <div className="rounded-[28px] border border-amber-500/20 bg-amber-950/15 p-6 flex flex-col gap-4">
                                <p className="text-[28px] font-black text-amber-300 text-center border-b border-amber-500/20 pb-2">월세</p>
                                <div className="flex flex-col gap-4">
                                    {rentGroups.length === 0 ? (
                                        <p className="text-white/30 text-[20px] text-center py-4">데이터 없음</p>
                                    ) : (
                                        rentGroups.map((g, idx) => (
                                            <div key={idx} className="flex flex-col items-center">
                                                <span className="text-white/40 text-[18px] font-bold">{g.area.toFixed(1)}㎡</span>
                                                <span className="text-white text-[21px] font-black mt-0.5 text-center leading-tight">
                                                    {formatWon(g.estimatedWolseDeposit)}<br />
                                                    <span className="text-amber-400 text-[18px]">/ {formatWon(g.estimatedWolseMonthly)}</span>
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ShortsFooter />
        </ShortsCanvas>
    );
}

function Scene3ApartmentTrades({ data }: { data: ShortsSceneData }) {
    const count = data.pyungTrades.length;
    const compact = count >= 3;
    const pyungClass = compact ? 'text-[34px]' : 'text-[42px]';
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
                                    key={row.pyung}
                                    className={`rounded-[32px] border border-sky-500/25 bg-sky-950/35 ${cardPad} space-y-5 w-full`}
                                >
                                    <p className={`${pyungClass} font-black text-sky-300 text-left`}>{row.pyung}평형</p>
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
                    <h2 className="text-[38px] font-black text-left tracking-tight w-full">아파트 시장 동향 요약</h2>
                    {blocks.length === 0 ? (
                        <p className="text-white/40 text-[30px] font-medium text-left">시장 지표 데이터 없음</p>
                    ) : (
                        blocks.map((block) => (
                            <div
                                key={block.key}
                                className="w-full rounded-[28px] border border-white/10 bg-white/[0.03] p-7 space-y-4"
                            >
                                <p className="text-[28px] font-black text-white leading-tight">{block.title}</p>
                                <p className="text-[24px] font-bold text-white/80">{block.flowLine}</p>
                                <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 space-y-2">
                                    <p className="text-[20px] font-black text-white/45">설명</p>
                                    <p className="text-[22px] font-bold" style={{ color: block.accent }}>
                                        {block.trendLine}
                                    </p>
                                    <p
                                        className="text-[22px] leading-[1.55] text-white/80 font-medium break-keep"
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

function Scene5HousingSupply({ data }: { data: ShortsSceneData }) {
    const hs = data.housingSupply;
    const fmt = (v: string) => Number(v || 0).toLocaleString();

    const rows: { label: string; value: string; accent: string }[] = [
        { label: '향후 분양 예정', value: `${fmt(hs.planned)} 세대`, accent: '#38bdf8' },
        { label: '입주 예정 물량', value: `${fmt(hs.moveIn)} 세대`, accent: '#c084fc' },
        { label: '미분양 현황', value: `${fmt(hs.unsold)} 세대 (${hs.unsoldTrend})`, accent: '#34d399' },
        { label: '최근 1년 인허가 실적', value: `${fmt(hs.permits)} 건`, accent: '#94a3b8' },
        { label: '공급 과잉 지수 (Glut Score)', value: `${hs.glutScore} / 100`, accent: '#38bdf8' },
    ];

    return (
        <ShortsCanvas sceneId={5} label="housing-supply">
            <ShortsBrandBar sceneLabel="주택 공급 현황" />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className="flex flex-col items-start w-full max-w-[980px] gap-8">
                    <h2 className="text-[38px] font-black text-left tracking-tight w-full flex items-center gap-4">
                        <Building2 className="w-10 h-10 text-sky-400 shrink-0" />
                        해당 지역 주택 공급 현황 (Housing Supply)
                    </h2>
                    {!hs.hasData ? (
                        <p className="text-white/40 text-[30px] font-medium text-left">주택 공급 데이터 부족</p>
                    ) : (
                        <div className="flex flex-col w-full gap-6">
                            {rows.map((row) => (
                                <div
                                    key={row.label}
                                    className="w-full rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-left"
                                >
                                    <p className="text-[24px] font-semibold text-white/45 mb-3">{row.label}</p>
                                    <p className="text-[36px] font-black leading-tight" style={{ color: row.accent }}>
                                        {row.value}
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

function Scene6Population({ data }: { data: ShortsSceneData }) {
    const pop = data.populationUmd;
    const fmt = (v: string) => Number(v || 0).toLocaleString();
    const changeVal = parseInt(pop.change, 10) || 0;
    const changeRateVal = parseFloat(pop.changeRate) || 0;
    const isGrowing = changeVal >= 0;
    const changeAccent = isGrowing ? '#34d399' : '#fb7185';
    const recentLabel = pop.recentMonthLabel
        ? `최근 인구 (${pop.recentMonthLabel})`
        : '최근 인구';

    return (
        <ShortsCanvas sceneId={6} label="population-umd">
            <ShortsBrandBar sceneLabel="세부 인구 변동" />
            <div className="flex-1 flex flex-col justify-center px-14 min-h-0">
                <div className="flex flex-col items-start w-full max-w-[980px] gap-8">
                    <div>
                        <h2 className="text-[38px] font-black text-left tracking-tight w-full flex items-center gap-4">
                            <Users className="w-10 h-10 text-teal-400 shrink-0" />
                            {pop.dongNm} 세부 인구 변동
                        </h2>
                        <p className="text-[24px] text-white/45 font-medium mt-4 text-left">
                            2022년 10월 대비 상세 주민등록 인구 분석입니다.
                        </p>
                    </div>
                    {!pop.hasData ? (
                        <p className="text-white/40 text-[30px] font-medium text-left">인구 데이터 부족</p>
                    ) : (
                        <div className="flex flex-col w-full gap-6">
                            <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-left">
                                <p className="text-[24px] font-semibold text-white/45 mb-3">2022년 10월 인구</p>
                                <p className="text-[36px] font-black text-white leading-tight">{fmt(pop.pastPop)}명</p>
                            </div>
                            <div className="w-full rounded-[28px] border border-teal-500/20 bg-teal-500/[0.06] p-8 text-left">
                                <p className="text-[24px] font-semibold text-white/45 mb-3">{recentLabel}</p>
                                <p className="text-[36px] font-black text-teal-300 leading-tight">{fmt(pop.recentPop)}명</p>
                            </div>
                            <div
                                className="w-full rounded-[28px] border p-8 text-left flex items-center justify-between gap-6"
                                style={{
                                    borderColor: isGrowing ? '#34d39933' : '#fb718533',
                                    backgroundColor: isGrowing ? '#34d39912' : '#fb718512',
                                }}
                            >
                                <p className="text-[24px] font-semibold text-white/45 shrink-0">변동 내역</p>
                                <p className="text-[32px] font-black text-right leading-tight" style={{ color: changeAccent }}>
                                    {changeVal >= 0 ? '+' : ''}{changeVal.toLocaleString()}명 ({changeVal >= 0 ? '+' : ''}{changeRateVal.toFixed(2)}%)
                                </p>
                            </div>
                        </div>
                    )}
                </div>
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

interface ShortsNativeFramesProps {
    data: ShortsSceneData;
}

export {
    Scene1Map,
    Scene2AiSummary,
    Scene2_2Valuation,
    Scene3Content,
    Scene4Market,
    Scene5HousingSupply,
    Scene6Population,
    Scene7MustCheck,
};

export default function ShortsNativeFrames({ data }: ShortsNativeFramesProps) {
    return (
        <>
            <Scene1Map data={data} />
            <Scene2AiSummary data={data} />
            {data.isApartment && <Scene2_2Valuation data={data} />}
            <Scene3Content data={data} />
            <Scene4Market data={data} />
            <Scene5HousingSupply data={data} />
            <Scene6Population data={data} />
            <Scene7MustCheck data={data} />
        </>
    );
}

export { SHORTS_WIDTH, SHORTS_HEIGHT };
