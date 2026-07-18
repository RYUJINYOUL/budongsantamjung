'use client';

import type { ReactNode } from 'react';
import { Black_Han_Sans, Noto_Sans_KR } from 'next/font/google';
import { SHORTS_BG, SHORTS_HEIGHT, SHORTS_WIDTH } from '../../lib/shortsSceneData';
import { STUDIO_CLOSING_BACKGROUND } from '../../lib/shortsStudioHero';
import { TEN_YEAR_STUDIO_CLOSING_SCENE } from '../../lib/shortsTenYearQuarters';

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

function ClosingCanvas({
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
            data-shorts-scene={TEN_YEAR_STUDIO_CLOSING_SCENE}
            data-shorts-label="ten-year-studio-closing"
            className={className}
            style={style}
        >
            {children}
        </section>
    );
}

function ClosingBackground() {
    const encodedUrl = encodeURI(STUDIO_CLOSING_BACKGROUND);

    return (
        <>
            <div
                className="absolute inset-0 pointer-events-none bg-cover bg-center"
                style={{ backgroundImage: `url("${encodedUrl}")` }}
                aria-hidden
            />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.2) 100%)',
                }}
                aria-hidden
            />
        </>
    );
}

export function ShortsTenYearStudioClosingCard({ preview = false }: { preview?: boolean }) {
    return (
        <ClosingCanvas preview={preview}>
            <ClosingBackground />

            <div className="relative z-10 flex flex-col h-full px-14">
                <div
                    className="flex flex-col items-center text-center"
                    style={{ paddingTop: Math.round(SHORTS_HEIGHT * 0.12) }}
                >
                    <p className={`text-[72px] leading-none tracking-tight text-sky-400 ${STUDIO_DISPLAY_FONT.className}`}>
                        부동산탐정 APP
                    </p>
                    <p className="text-[34px] font-bold text-white/55 mt-5 tracking-wide break-keep" style={{ wordBreak: 'keep-all' }}>
                        앱과 웹에서 10년 동향 스토리를 만나보세요.
                    </p>
                </div>

                <div
                    className="flex-1 flex flex-col items-center justify-start text-center px-6"
                    style={{ paddingTop: Math.round(SHORTS_HEIGHT * 0.08) }}
                >
                    <div className="w-full max-w-[880px] rounded-[28px] border border-white/15 bg-black/35 backdrop-blur-[2px] px-10 py-12">
                        <div className="flex flex-col gap-12">
                            <div>
                                <p className="text-[32px] font-black text-sky-400/90 tracking-widest mb-4">APP</p>
                                <p className={`text-[52px] leading-[1.2] text-white break-keep ${STUDIO_DISPLAY_FONT.className}`} style={{ wordBreak: 'keep-all' }}>
                                    부동산탐정 앱
                                </p>
                                <p className="text-[36px] font-bold text-white/70 mt-3 break-keep" style={{ wordBreak: 'keep-all' }}>
                                    구글 · 애플 지원
                                </p>
                            </div>

                            <div className="h-px w-full bg-white/12" aria-hidden />

                            <div>
                                <p className="text-[32px] font-black text-emerald-400/90 tracking-widest mb-4">WEB</p>
                                <p className="text-[36px] font-bold text-white/70 break-keep" style={{ wordBreak: 'keep-all' }}>
                                    네이버 · 구글
                                </p>
                                <p className={`text-[48px] leading-[1.25] text-white break-keep mt-2 ${STUDIO_DISPLAY_FONT.className}`} style={{ wordBreak: 'keep-all' }}>
                                    부동산탐정 검색
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ClosingCanvas>
    );
}
