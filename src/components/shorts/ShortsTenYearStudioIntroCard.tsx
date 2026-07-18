'use client';

import type { ReactNode } from 'react';
import { Black_Han_Sans, Noto_Sans_KR } from 'next/font/google';
import type { ShortsSceneData } from '../../lib/shortsSceneData';
import { SHORTS_BG, SHORTS_HEIGHT, SHORTS_WIDTH } from '../../lib/shortsSceneData';
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

const INTRO_SCENE_ID = 91;

function IntroCanvas({
    preview = false,
    children,
}: {
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
            data-shorts-scene={INTRO_SCENE_ID}
            data-shorts-label="ten-year-studio-intro"
            className={className}
            style={style}
        >
            {children}
        </section>
    );
}

export function ShortsTenYearStudioIntroCard({
    data,
    heroImageUrl,
    priceRangeLine,
    taglineLine,
    preview = false,
}: {
    data: ShortsSceneData;
    heroImageUrl: string;
    priceRangeLine: string;
    taglineLine: string;
    preview?: boolean;
}) {
    const story = data.tenYearStory;
    if (!story) return null;

    const footerOffset = Math.round(SHORTS_HEIGHT * 0.1);
    const regionLen = story.regionLabel.length;
    const nameLen = story.complexName.length;
    const regionSize =
        regionLen > 12 ? 'text-[64px]' :
        regionLen > 8 ? 'text-[76px]' :
        'text-[88px]';
    const nameSize =
        nameLen > 16 ? 'text-[56px]' :
        nameLen > 10 ? 'text-[68px]' :
        'text-[80px]';
    const priceLen = priceRangeLine.length;
    const priceSize =
        priceLen > 18 ? 'text-[52px]' :
        priceLen > 14 ? 'text-[60px]' :
        'text-[68px]';

    return (
        <IntroCanvas preview={preview}>
            <StudioHeroBackground heroImageUrl={heroImageUrl} />

            <div className="relative z-10 flex flex-col h-full px-12">
                <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0 px-4">
                    <p
                        className={`${regionSize} leading-[1.1] tracking-tight text-sky-400/95 break-keep max-w-full ${STUDIO_DISPLAY_FONT.className}`}
                        style={{ wordBreak: 'keep-all' }}
                    >
                        {story.regionLabel}
                    </p>
                    <p
                        className={`${nameSize} leading-[1.12] tracking-tight text-white mt-6 break-keep max-w-full ${STUDIO_DISPLAY_FONT.className}`}
                        style={{ wordBreak: 'keep-all' }}
                    >
                        {story.complexName}
                    </p>
                    <p
                        className={`${priceSize} font-black leading-[1.15] tracking-tight text-emerald-300/95 break-keep max-w-full mt-14 px-2 ${STUDIO_DISPLAY_FONT.className}`}
                        style={{ wordBreak: 'keep-all' }}
                    >
                        {priceRangeLine}
                    </p>
                    <p
                        className="text-[38px] font-bold text-white/75 leading-[1.4] break-keep max-w-full mt-5 px-2"
                        style={{ wordBreak: 'keep-all' }}
                    >
                        {taglineLine}
                    </p>
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
        </IntroCanvas>
    );
}
