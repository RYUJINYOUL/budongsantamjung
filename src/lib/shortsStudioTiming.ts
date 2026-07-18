import type { TenYearStorySummary } from './shortsSceneData';
import {
    formatStudioComplexLabel,
    pickStudioTitleRegionLabel,
} from './shortsStudioDescription';
import type { TenYearStudioSlideMeta, TenYearStudioYearMeta } from './shortsTenYearQuarters';

/** 스튜디오 쇼츠 최종 영상 길이 (초) */
export const STUDIO_VIDEO_DURATION_SEC = 50;

/** 배경음악 (public) — 영상 길이에 맞게 잘림 */
export const STUDIO_BGM_PATH = '/tomtommusic.mp3';

/** BGM 페이드아웃 시작 (끝에서 3초 전) */
export const STUDIO_BGM_FADE_OUT_SEC = 3;

function baseDurationForSlide(slide: TenYearStudioSlideMeta): number {
    switch (slide.kind) {
        case 'intro':
            return 3;
        case 'year':
            return 5;
        case 'outlook':
            return slide.keywords.length <= 2 ? 5 : 6;
        case 'closing':
            return 5;
        default:
            return 3;
    }
}

export function allocateStudioSlideDurations(slides: TenYearStudioSlideMeta[]): number[] {
    if (!slides.length) return [];

    const durations = slides.map(baseDurationForSlide);
    const baseSum = durations.reduce((sum, sec) => sum + sec, 0);
    const remainder = STUDIO_VIDEO_DURATION_SEC - baseSum;

    const closingIdx = slides.findIndex((slide) => slide.kind === 'closing');
    const adjustIdx = closingIdx >= 0 ? closingIdx : durations.length - 1;
    durations[adjustIdx] = Math.max(1, durations[adjustIdx]! + remainder);

    return durations;
}

export type StudioSlideTimelineItem = {
    sceneId: number;
    label: string;
    durationSec: number;
    startSec: number;
    endSec: number;
};

export function buildStudioSlideTimeline(
    slides: TenYearStudioSlideMeta[],
): StudioSlideTimelineItem[] {
    const durations = allocateStudioSlideDurations(slides);
    let cursor = 0;

    return slides.map((slide, index) => {
        const durationSec = durations[index]!;
        const startSec = cursor;
        const endSec = startSec + durationSec;
        cursor = endSec;

        return {
            sceneId: slide.sceneId,
            label: slide.label,
            durationSec,
            startSec,
            endSec,
        };
    });
}

export function formatTimelineSec(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function getTimelineTotalSec(timeline: StudioSlideTimelineItem[]): number {
    if (!timeline.length) return 0;
    return timeline[timeline.length - 1]!.endSec;
}

function extractEokLabels(text: string | null | undefined): string[] {
    if (!text?.trim()) return [];
    const matches = [...text.matchAll(/([\d.]+)\s*억/g)];
    return matches.map((match) => {
        const raw = match[1]!;
        const value = parseFloat(raw);
        if (Number.isNaN(value)) return `${raw}억`;
        return Number.isInteger(value) ? `${value}억` : `${raw}억`;
    });
}

function pickYearSlides(slides: TenYearStudioSlideMeta[]): TenYearStudioYearMeta[] {
    return slides.filter((slide): slide is TenYearStudioYearMeta => slide.kind === 'year');
}

/** MP4 표시·파일 제목 (확장자 제외) */
export function buildStudioVideoTitle(
    story: TenYearStorySummary | null | undefined,
    slides: TenYearStudioSlideMeta[],
    locationLabel?: string | null,
): string {
    const yearSlides = pickYearSlides(slides);
    const firstPrices = extractEokLabels(yearSlides[0]?.period.priceHighlight);
    const lastPrices = extractEokLabels(yearSlides[yearSlides.length - 1]?.period.priceHighlight);

    const startPrice = firstPrices[0] ?? '가격미상';
    const endPrice = lastPrices[lastPrices.length - 1] ?? startPrice;
    const regionLabel = pickStudioTitleRegionLabel(locationLabel, story?.regionLabel);
    const complexLabel = formatStudioComplexLabel(story?.complexName?.trim() || '아파트');

    return `${startPrice}에서 ${endPrice}까지, ${regionLabel} ${complexLabel} 5년 변동률 & 전망`;
}

function sanitizeFilenameBase(name: string): string {
    return name
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

export function buildStudioVideoFilename(
    story: TenYearStorySummary | null | undefined,
    slides: TenYearStudioSlideMeta[],
    locationLabel?: string | null,
): string {
    const title = sanitizeFilenameBase(buildStudioVideoTitle(story, slides, locationLabel));
    return `${title}.mp4`;
}
