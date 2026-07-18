'use client';

import { useEffect, useMemo } from 'react';
import { Scene9TenYearStudioCard } from './ShortsTenYearStudioCard';
import { ShortsTenYearStudioClosingCard } from './ShortsTenYearStudioClosingCard';
import { ShortsTenYearStudioIntroCard } from './ShortsTenYearStudioIntroCard';
import { ShortsTenYearStudioOutlookCard } from './ShortsTenYearStudioOutlookCard';
import type { ShortsSceneData } from '../../lib/shortsSceneData';
import { buildStudioUploadDescription } from '../../lib/shortsStudioDescription';
import { STUDIO_CLOSING_BACKGROUND } from '../../lib/shortsStudioHero';
import {
    buildTenYearStudioSlideMetas,
    STUDIO_CAFE_SCENE_ORDER,
    type TenYearStudioSlideMeta,
} from '../../lib/shortsTenYearQuarters';

interface ShortsStudioCaptureProps {
    analyzeId?: string | number;
    sceneData: ShortsSceneData;
}

function StudioSlideCapture({
    slide,
    sceneData,
}: {
    slide: TenYearStudioSlideMeta;
    sceneData: ShortsSceneData;
}) {
    if (slide.kind === 'intro') {
        return (
            <ShortsTenYearStudioIntroCard
                data={sceneData}
                heroImageUrl={slide.heroImageUrl}
                priceRangeLine={slide.priceRangeLine}
                taglineLine={slide.taglineLine}
            />
        );
    }

    if (slide.kind === 'outlook') {
        return (
            <ShortsTenYearStudioOutlookCard
                data={sceneData}
                cardIndex={slide.cardIndex}
                keywords={slide.keywords}
                heroImageUrl={slide.heroImageUrl}
            />
        );
    }

    if (slide.kind === 'closing') {
        return <ShortsTenYearStudioClosingCard />;
    }

    return (
        <Scene9TenYearStudioCard
            data={sceneData}
            cardIndex={slide.cardIndex}
            display={slide.display}
            heroImageUrl={slide.heroImageUrl}
        />
    );
}

function collectStudioHeroUrls(slides: TenYearStudioSlideMeta[]): string[] {
    const urls = new Set<string>([STUDIO_CLOSING_BACKGROUND]);
    for (const slide of slides) {
        if ('heroImageUrl' in slide && slide.heroImageUrl) {
            urls.add(slide.heroImageUrl);
        }
    }
    return [...urls];
}

async function preloadStudioImages(urls: string[]): Promise<void> {
    await Promise.all(
        urls.map(
            (url) =>
                new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = url;
                }),
        ),
    );
}

async function markStudioCaptureReady(
    slides: TenYearStudioSlideMeta[],
    sceneOrder: readonly number[],
): Promise<void> {
    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    await preloadStudioImages(collectStudioHeroUrls(slides));

    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    for (const sceneId of sceneOrder) {
        const el = document.querySelector(`[data-shorts-scene="${sceneId}"]`) as HTMLElement | null;
        if (!el) {
            document.documentElement.setAttribute('data-shorts-capture-error', 'missing-studio-scenes');
            document.documentElement.removeAttribute('data-shorts-capture-ready');
            return;
        }
        void el.getBoundingClientRect();
    }

    document.documentElement.setAttribute('data-shorts-capture-ready', 'true');
    document.documentElement.removeAttribute('data-shorts-capture-error');
}

/** Playwright 카페 캡처 전용 — Studio 10장 뷰포트 내 세로 배치 */
export default function ShortsStudioCapture({ analyzeId, sceneData }: ShortsStudioCaptureProps) {
    const story = sceneData.tenYearStory;

    const slideMetas = useMemo(
        () => buildTenYearStudioSlideMetas(story, analyzeId, sceneData.locationLabel),
        [story, analyzeId, sceneData.locationLabel],
    );

    const uploadDescription = useMemo(
        () => buildStudioUploadDescription(story, slideMetas, sceneData.locationLabel),
        [story, slideMetas, sceneData.locationLabel],
    );

    const hasFullSlides = slideMetas.length >= STUDIO_CAFE_SCENE_ORDER.length;

    useEffect(() => {
        document.documentElement.removeAttribute('data-shorts-capture-ready');
        document.documentElement.removeAttribute('data-shorts-capture-error');

        if (!hasFullSlides) {
            let cancelled = false;
            const timer = setTimeout(() => {
                if (cancelled) return;
                document.documentElement.setAttribute(
                    'data-shorts-capture-error',
                    slideMetas.length === 0 ? 'no-studio-content' : 'incomplete-studio-slides',
                );
            }, 2000);
            return () => {
                cancelled = true;
                clearTimeout(timer);
            };
        }

        let cancelled = false;

        const run = async () => {
            await new Promise((resolve) => setTimeout(resolve, 400));
            if (cancelled) return;
            try {
                await markStudioCaptureReady(slideMetas, STUDIO_CAFE_SCENE_ORDER);
            } catch {
                if (!cancelled) {
                    document.documentElement.setAttribute('data-shorts-capture-error', 'studio-ready-failed');
                    document.documentElement.removeAttribute('data-shorts-capture-ready');
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [hasFullSlides, slideMetas]);

    if (!hasFullSlides) {
        return (
            <div
                data-shorts-capture-error={slideMetas.length === 0 ? 'no-studio-content' : 'incomplete-studio-slides'}
                className="hidden"
                aria-hidden="true"
            >
                Studio 슬라이드 {slideMetas.length}/{STUDIO_CAFE_SCENE_ORDER.length}장
            </div>
        );
    }

    return (
        <div className="shorts-capture-root flex flex-col items-center gap-0" data-shorts-capture-root="true">
            <div data-shorts-preview-wrap className="flex flex-col items-center gap-0 w-[1080px]">
                {slideMetas.map((slide) => (
                    <StudioSlideCapture
                        key={`capture-${slide.sceneId}`}
                        slide={slide}
                        sceneData={sceneData}
                    />
                ))}
            </div>
            <pre data-studio-upload-description className="hidden">{uploadDescription}</pre>
        </div>
    );
}
