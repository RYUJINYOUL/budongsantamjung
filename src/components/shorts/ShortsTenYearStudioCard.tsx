'use client';

import type { ReactNode } from 'react';
import { Black_Han_Sans, Noto_Sans_KR } from 'next/font/google';
import type { ShortsSceneData } from '../../lib/shortsSceneData';
import { SHORTS_BG, SHORTS_HEIGHT, SHORTS_WIDTH } from '../../lib/shortsSceneData';
import type { TenYearStudioCardDisplay } from '../../lib/shortsTenYearQuarters';
import { TEN_YEAR_STUDIO_YEAR_SCENE_BASE } from '../../lib/shortsTenYearQuarters';
import StudioHeroBackground from './StudioHeroBackground';

const STUDIO_BODY_FONT = Noto_Sans_KR({
    subsets: ['latin'],
    weight: ['500', '700', '900'],
    display: 'swap',
});

const STUDIO_DISPLAY_FONT = Black_Han_Sans({
    subsets: ['latin'],
    weight: '400',
    display: 'swap',
});

function StudioCardCanvas({
    sceneId,
    preview = false,
    children,
}: {
    sceneId: number;
    preview?: boolean;
    children: ReactNode;
}) {
    const className = `relative flex flex-col overflow-hidden text-white select-none ${STUDIO_BODY_FONT.className}`;
    const style = {
        width: SHORTS_WIDTH,
        height: SHORTS_HEIGHT,
        backgroundColor: SHORTS_BG,
        flexShrink: 0,
    } as const;

    if (preview) {
        return <div className={className} style={style}>{children}</div>;
    }

    return (
        <section
            data-shorts-scene={sceneId}
            data-shorts-label={`ten-year-studio-${sceneId}`}
            className={className}
            style={style}
        >
            {children}
        </section>
    );
}

function isRecentAverageYear(yearLabel: string): boolean {
    const years = yearLabel.match(/\d{4}/g)?.map(Number) ?? [];
    return years.some((y) => y === 2025 || y === 2026);
}

export function Scene9TenYearStudioCard({
    data,
    cardIndex,
    display,
    heroImageUrl,
    preview = false,
}: {
    data: ShortsSceneData;
    cardIndex: number;
    display: TenYearStudioCardDisplay;
    heroImageUrl: string;
    preview?: boolean;
}) {
    const story = data.tenYearStory;
    if (!story) return null;

    const sceneId = TEN_YEAR_STUDIO_YEAR_SCENE_BASE + cardIndex;
    const changeColor = display.isRise
        ? 'text-emerald-400'
        : display.isFall
            ? 'text-sky-400'
            : 'text-white/70';

    const headerZoneTop = 10;
    const aptBoxTop = headerZoneTop + Math.round(SHORTS_HEIGHT * 0.1);
    const footerOffset = Math.round(SHORTS_HEIGHT * 0.1);
    const showAverageSuffix = isRecentAverageYear(display.yearLabel);

    return (
        <StudioCardCanvas sceneId={sceneId} preview={preview}>
            <StudioHeroBackground heroImageUrl={heroImageUrl} />

            <div className="relative z-10 flex flex-col h-full px-16">
                <div className="shrink-0 mb-8" style={{ paddingTop: aptBoxTop }}>
                    <div
                        className="rounded-xl border-2 border-sky-400/35 bg-sky-950/40 backdrop-blur-[2px] px-8 py-5"
                        style={{ boxShadow: '0 0 24px rgba(14,165,233,0.08), inset 0 0 0 1px rgba(255,255,255,0.06)' }}
                    >
                        <p className="text-[30px] font-bold text-left leading-snug break-keep" style={{ wordBreak: 'keep-all' }}>
                            <span className="text-sky-400/95">{story.regionLabel}</span>
                            <span className="text-white/30 mx-3">|</span>
                            <span className="text-white/90">{story.complexName}</span>
                        </p>
                    </div>
                </div>

                <p
                    className={`shrink-0 text-center text-[60px] leading-none tracking-tight text-white/65 mt-6 mb-8 ${STUDIO_DISPLAY_FONT.className}`}
                >
                    {display.yearLabel}
                </p>

                <p
                    className="shrink-0 text-center text-[48px] font-bold text-white/80 leading-[1.35] break-keep px-4 mb-16 max-w-full"
                    style={{ wordBreak: 'keep-all' }}
                >
                    {display.headline}
                </p>

                {/* 금액 강조 본문 */}
                <div className="flex-1 flex flex-col justify-center items-center text-center min-h-0">
                    {display.changeLine && (
                        <p
                            className={`text-[64px] font-black leading-tight break-keep mb-8 max-w-full ${changeColor}`}
                            style={{ wordBreak: 'keep-all' }}
                        >
                            {display.changeLine}
                        </p>
                    )}

                    {display.priceLine && (
                        <p
                            className={`text-[96px] leading-[1.05] break-keep tracking-tight text-white max-w-full ${STUDIO_DISPLAY_FONT.className}`}
                            style={{ wordBreak: 'keep-all', textShadow: '0 0 60px rgba(52,211,153,0.15)' }}
                        >
                            {display.priceLine}
                            {showAverageSuffix && (
                                <span className="text-[34px] font-bold text-white/40 ml-4 align-middle">
                                    (평균)
                                </span>
                            )}
                        </p>
                    )}

                    {!display.changeLine && !display.priceLine && (
                        <p className="text-[40px] text-white/40 font-medium">가격 데이터 없음</p>
                    )}
                </div>

                <div className="shrink-0 text-center" style={{ paddingBottom: footerOffset }}>
                    <p className="text-[30px] font-medium text-white/28 tracking-wide mb-2">
                        대한민국 모든 부동산을 분석합니다
                    </p>
                    <p className={`text-[44px] text-sky-400 tracking-tight ${STUDIO_DISPLAY_FONT.className}`}>
                        부동산탐정 APP
                    </p>
                </div>
            </div>
        </StudioCardCanvas>
    );
}
