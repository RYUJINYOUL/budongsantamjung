'use client';

import type { ReactNode } from 'react';
import { Black_Han_Sans, Noto_Sans_KR } from 'next/font/google';
import type { ShortsSceneData } from '../../lib/shortsSceneData';
import { SHORTS_BG, SHORTS_HEIGHT, SHORTS_WIDTH } from '../../lib/shortsSceneData';
import type { TenYearStudioOutlookKeywordRow } from '../../lib/shortsTenYearQuarters';
import { TEN_YEAR_STUDIO_OUTLOOK_SCENE_BASE } from '../../lib/shortsTenYearQuarters';
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

function getOutlookItemSizing(count: number) {
    if (count <= 2) {
        return {
            label: 'text-[42px]',
            line: 'text-[36px] leading-[1.4]',
            badge: 'h-[72px] w-[72px] text-[30px]',
            rowGap: 'gap-8',
        };
    }
    return {
        label: 'text-[36px]',
        line: 'text-[30px] leading-[1.4]',
        badge: 'h-14 w-14 text-[26px]',
        rowGap: 'gap-5',
    };
}

function OutlookCardCanvas({
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
            data-shorts-label={`ten-year-studio-outlook-${sceneId}`}
            className={className}
            style={style}
        >
            {children}
        </section>
    );
}

export function ShortsTenYearStudioOutlookCard({
    data,
    cardIndex,
    keywords,
    heroImageUrl,
    preview = false,
}: {
    data: ShortsSceneData;
    cardIndex: number;
    keywords: TenYearStudioOutlookKeywordRow[];
    heroImageUrl: string;
    preview?: boolean;
}) {
    const story = data.tenYearStory;
    if (!story || !keywords.length) return null;

    const sceneId = TEN_YEAR_STUDIO_OUTLOOK_SCENE_BASE + cardIndex;
    const sizing = getOutlookItemSizing(keywords.length);
    const headerZoneTop = 10;
    const aptBoxTop = headerZoneTop + Math.round(SHORTS_HEIGHT * 0.1);
    const footerOffset = Math.round(SHORTS_HEIGHT * 0.1);

    return (
        <OutlookCardCanvas sceneId={sceneId} preview={preview}>
            <StudioHeroBackground heroImageUrl={heroImageUrl} />

            <div className="relative z-10 flex flex-col h-full px-14">
                <div className="shrink-0 mb-6" style={{ paddingTop: aptBoxTop }}>
                    <div
                        className="rounded-xl border-2 border-emerald-400/35 bg-emerald-950/40 backdrop-blur-[2px] px-8 py-5"
                        style={{ boxShadow: '0 0 24px rgba(52,211,153,0.08), inset 0 0 0 1px rgba(255,255,255,0.06)' }}
                    >
                        <p className="text-[30px] font-bold text-left leading-snug break-keep" style={{ wordBreak: 'keep-all' }}>
                            <span className="text-emerald-400/95">{story.regionLabel}</span>
                            <span className="text-white/30 mx-3">|</span>
                            <span className="text-white/90">{story.complexName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    <p
                        className={`shrink-0 text-center text-[56px] leading-none tracking-tight text-emerald-300/90 mb-8 ${STUDIO_DISPLAY_FONT.className}`}
                    >
                        현재 전망 키워드
                    </p>

                    <div className="w-full shrink-0 rounded-[28px] border border-emerald-500/25 bg-emerald-950/25 px-8 py-6">
                        <div className={`flex flex-col justify-center ${sizing.rowGap}`}>
                            {keywords.map((row) => (
                                <div
                                    key={`${row.item.label}-${row.globalIndex}`}
                                    className="flex items-center gap-6 w-full border-b border-emerald-500/15 last:border-0 pb-6 last:pb-0"
                                >
                                    <span
                                        className={`flex ${sizing.badge} shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 font-black text-emerald-400`}
                                    >
                                        {row.globalIndex + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={`${sizing.label} font-black text-emerald-300/95 text-left leading-tight break-keep`} style={{ wordBreak: 'keep-all' }}>
                                            {row.item.label}
                                        </p>
                                        <p
                                            className={`${sizing.line} text-white/80 font-medium mt-2 text-left break-keep`}
                                            style={{ wordBreak: 'keep-all' }}
                                        >
                                            {row.item.line}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 text-center mt-8" style={{ paddingBottom: footerOffset }}>
                    <p className="text-[30px] font-medium text-white/28 tracking-wide mb-2">
                        대한민국 모든 부동산을 분석합니다
                    </p>
                    <p className={`text-[44px] text-sky-400 tracking-tight ${STUDIO_DISPLAY_FONT.className}`}>
                        부동산탐정 APP
                    </p>
                </div>
            </div>
        </OutlookCardCanvas>
    );
}
