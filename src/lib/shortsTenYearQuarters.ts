import type { TenYearStoryOutlookItem, TenYearStoryPeriodItem, TenYearStorySummary } from './shortsSceneData';
import {
    STUDIO_INTRO_TAGLINE,
    buildStudioIntroPriceRangeLine,
    buildStudioYearRangeShort,
    resolveStudioHeroImageUrl,
    STUDIO_CLOSING_BACKGROUND,
} from './shortsStudioHero';

export const TEN_YEAR_STUDIO_CARD_COUNT = 5;
export const TEN_YEAR_STUDIO_OUTLOOK_CARD_COUNT = 3;
export const TEN_YEAR_STUDIO_INTRO_SCENE = 91;
export const TEN_YEAR_STUDIO_YEAR_SCENE_BASE = 92;
export const TEN_YEAR_STUDIO_OUTLOOK_SCENE_BASE = 97;
export const TEN_YEAR_STUDIO_CLOSING_SCENE = 100;
/** @deprecated TEN_YEAR_STUDIO_YEAR_SCENE_BASE 사용 */
export const TEN_YEAR_STUDIO_SCENE_BASE = TEN_YEAR_STUDIO_YEAR_SCENE_BASE;
export const TEN_YEAR_STUDIO_SLIDE_COUNT =
    1 + TEN_YEAR_STUDIO_CARD_COUNT + TEN_YEAR_STUDIO_OUTLOOK_CARD_COUNT + 1;
/** 카페 슬라이드 캡처 순서 (intro → 5년 → 전망 3 → closing) */
export const STUDIO_CAFE_SCENE_ORDER: readonly number[] = [
    TEN_YEAR_STUDIO_INTRO_SCENE,
    TEN_YEAR_STUDIO_YEAR_SCENE_BASE,
    TEN_YEAR_STUDIO_YEAR_SCENE_BASE + 1,
    TEN_YEAR_STUDIO_YEAR_SCENE_BASE + 2,
    TEN_YEAR_STUDIO_YEAR_SCENE_BASE + 3,
    TEN_YEAR_STUDIO_YEAR_SCENE_BASE + 4,
    TEN_YEAR_STUDIO_OUTLOOK_SCENE_BASE,
    TEN_YEAR_STUDIO_OUTLOOK_SCENE_BASE + 1,
    TEN_YEAR_STUDIO_OUTLOOK_SCENE_BASE + 2,
    TEN_YEAR_STUDIO_CLOSING_SCENE,
];
export const TEN_YEAR_IMAGE_MAX_PERIODS = 8;

/** 2-3-2 전망 키워드 분할: 1~2번 / 3~4번 / 5~7번 */
const OUTLOOK_KEYWORD_RANGES: ReadonlyArray<readonly [number, number]> = [
    [0, 2],
    [2, 4],
    [4, 7],
];

export type TenYearStudioCardDisplay = {
    yearLabel: string;
    headline: string;
    description: string;
    changeLine: string | null;
    priceLine: string | null;
    isRise: boolean;
    isFall: boolean;
};

/** 2-3 원본과 동일: card1~3 병합 후 표시용 기간 선별 */
export function collectTenYearHistoryPeriods(
    story: TenYearStorySummary | null | undefined,
): TenYearStoryPeriodItem[] {
    if (!story) return [];
    const all = [...story.card1, ...story.card2, ...story.card3];
    return selectTenYearPeriodsForImage(all);
}

/** 2-3 이미지용: 금액 변동 항목 우선, 최대 8개, 부족 시 최근 기간으로 채움 */
export function selectTenYearPeriodsForImage(
    periods: TenYearStoryPeriodItem[],
): TenYearStoryPeriodItem[] {
    if (periods.length <= TEN_YEAR_IMAGE_MAX_PERIODS) return periods;

    const withPriceIdx = periods
        .map((p, i) => (p.priceHighlight ? i : -1))
        .filter((i) => i >= 0);
    const selected = new Set<number>();

    const pricePick = withPriceIdx.length > TEN_YEAR_IMAGE_MAX_PERIODS
        ? withPriceIdx.slice(-TEN_YEAR_IMAGE_MAX_PERIODS)
        : withPriceIdx;
    pricePick.forEach((i) => selected.add(i));

    for (let i = periods.length - 1; i >= 0 && selected.size < TEN_YEAR_IMAGE_MAX_PERIODS; i--) {
        selected.add(i);
    }

    return [...selected].sort((a, b) => a - b).map((i) => periods[i]!);
}

/** 쇼츠 스튜디오: 최근 5개 기간 → 카드 5장 (1기간 = 1장) */
export function selectStudioYearCardPeriods(
    periods: TenYearStoryPeriodItem[],
): TenYearStoryPeriodItem[] {
    const selected = selectTenYearPeriodsForImage(periods);
    if (selected.length <= TEN_YEAR_STUDIO_CARD_COUNT) return selected;
    return selected.slice(-TEN_YEAR_STUDIO_CARD_COUNT);
}

function extractYearLabel(periodLabel: string): string {
    const years = periodLabel.match(/\d{4}/g);
    if (!years?.length) return periodLabel;
    if (years.length === 1) return `${years[0]}년`;
    return `${years[0]}~${years[years.length - 1]}년`;
}

function parsePriceHighlight(highlight: string | null): {
    changeLine: string | null;
    priceLine: string | null;
    isRise: boolean;
    isFall: boolean;
} {
    if (!highlight?.trim()) {
        return { changeLine: null, priceLine: null, isRise: false, isFall: false };
    }

    const text = highlight.trim();

    const yoY = text.match(/^전년\s+[\d.]+\s*억\s+([\d.]+)%\s+(상승|하락|보합)\s+([\d.]+\s*억)/);
    if (yoY) {
        const dir = yoY[2];
        return {
            changeLine: `전년 대비 ${yoY[1]}% ${dir}`,
            priceLine: `${yoY[3].replace(/\s+/g, '')} 기록`,
            isRise: dir === '상승',
            isFall: dir === '하락',
        };
    }

    const range = text.match(/→\s*\d{4}\s+([\d.]+\s*억)\s+\(([+-]?[\d.]+)%\)/);
    if (range) {
        const pct = parseFloat(range[2]);
        const dir = pct > 3 ? '상승' : pct < -3 ? '하락' : '보합';
        return {
            changeLine: `전년 대비 ${Math.abs(pct).toFixed(1)}% ${dir}`,
            priceLine: `${range[1].replace(/\s+/g, '')} 기록`,
            isRise: pct > 3,
            isFall: pct < -3,
        };
    }

    const pctOnly = text.match(/([+-]?[\d.]+)%/);
    const priceOnly = text.match(/([\d.]+\s*억)/);
    if (priceOnly) {
        const pctVal = pctOnly ? parseFloat(pctOnly[1]) : null;
        return {
            changeLine: pctVal != null
                ? `전년 대비 ${Math.abs(pctVal).toFixed(1)}% ${pctVal > 3 ? '상승' : pctVal < -3 ? '하락' : '보합'}`
                : null,
            priceLine: `${priceOnly[1].replace(/\s+/g, '')} 기록`,
            isRise: pctVal != null && pctVal > 3,
            isFall: pctVal != null && pctVal < -3,
        };
    }

    return { changeLine: null, priceLine: text, isRise: false, isFall: false };
}

export function buildStudioCardDisplay(item: TenYearStoryPeriodItem): TenYearStudioCardDisplay {
    const parsed = parsePriceHighlight(item.priceHighlight);
    return {
        yearLabel: extractYearLabel(item.periodLabel),
        headline: item.title,
        description: item.description?.trim() || item.title,
        changeLine: parsed.changeLine,
        priceLine: parsed.priceLine,
        isRise: parsed.isRise,
        isFall: parsed.isFall,
    };
}

export type TenYearStudioIntroMeta = {
    kind: 'intro';
    sceneId: typeof TEN_YEAR_STUDIO_INTRO_SCENE;
    label: string;
    filename: string;
    yearRange: string;
    priceRangeLine: string;
    taglineLine: string;
    heroImageUrl: string;
};

export type TenYearStudioYearMeta = {
    kind: 'year';
    cardIndex: number;
    sceneId: number;
    label: string;
    filename: string;
    period: TenYearStoryPeriodItem;
    display: TenYearStudioCardDisplay;
    heroImageUrl: string;
};

export type TenYearStudioOutlookKeywordRow = {
    item: TenYearStoryOutlookItem;
    globalIndex: number;
};

export type TenYearStudioOutlookMeta = {
    kind: 'outlook';
    cardIndex: number;
    sceneId: number;
    label: string;
    filename: string;
    keywords: TenYearStudioOutlookKeywordRow[];
    heroImageUrl: string;
};

export type TenYearStudioClosingMeta = {
    kind: 'closing';
    sceneId: typeof TEN_YEAR_STUDIO_CLOSING_SCENE;
    label: string;
    filename: string;
    backgroundImageUrl: string;
};

export type TenYearStudioSlideMeta =
    | TenYearStudioIntroMeta
    | TenYearStudioYearMeta
    | TenYearStudioOutlookMeta
    | TenYearStudioClosingMeta;

/** @deprecated TenYearStudioYearMeta 사용 */
export type TenYearStudioCardMeta = TenYearStudioYearMeta;

function buildTenYearStudioYearMetas(
    story: TenYearStorySummary,
    cardPeriods: TenYearStoryPeriodItem[],
    prefix: string,
    heroImageUrl: string,
): TenYearStudioYearMeta[] {
    return cardPeriods.map((period, cardIndex) => ({
        kind: 'year' as const,
        cardIndex,
        sceneId: TEN_YEAR_STUDIO_YEAR_SCENE_BASE + cardIndex,
        label: `2-3-${cardIndex + 1}. 5년 흐름 (${cardIndex + 1}/${TEN_YEAR_STUDIO_CARD_COUNT})`,
        filename: `${prefix}shorts_02_3_five_year_${cardIndex + 1}.png`,
        period,
        display: buildStudioCardDisplay(period),
        heroImageUrl,
    }));
}

export function splitOutlookKeywordsForStudio(
    keywords: TenYearStoryOutlookItem[],
): TenYearStudioOutlookKeywordRow[][] {
    return OUTLOOK_KEYWORD_RANGES
        .map(([start, end]) =>
            keywords.slice(start, end).map((item, offset) => ({
                item,
                globalIndex: start + offset,
            })),
        )
        .filter((chunk) => chunk.length > 0);
}

function buildTenYearStudioOutlookMetas(
    story: TenYearStorySummary,
    prefix: string,
    heroImageUrl: string,
): TenYearStudioOutlookMeta[] {
    const chunks = splitOutlookKeywordsForStudio(story.outlookKeywords);

    return chunks.map((keywords, cardIndex) => {
        const firstNo = keywords[0]!.globalIndex + 1;
        const lastNo = keywords[keywords.length - 1]!.globalIndex + 1;
        const rangeLabel = firstNo === lastNo ? `${firstNo}번` : `${firstNo}~${lastNo}번`;

        return {
            kind: 'outlook' as const,
            cardIndex,
            sceneId: TEN_YEAR_STUDIO_OUTLOOK_SCENE_BASE + cardIndex,
            label: `2-3-2. 현재 전망 키워드 (${rangeLabel})`,
            filename: `${prefix}shorts_02_3_outlook_${cardIndex + 1}.png`,
            keywords,
            heroImageUrl,
        };
    });
}

function buildTenYearStudioClosingMeta(prefix: string): TenYearStudioClosingMeta {
    return {
        kind: 'closing',
        sceneId: TEN_YEAR_STUDIO_CLOSING_SCENE,
        label: '마지막. 앱·웹 안내',
        filename: `${prefix}shorts_studio_closing.png`,
        backgroundImageUrl: STUDIO_CLOSING_BACKGROUND,
    };
}

export function buildTenYearStudioHistorySlideMetas(
    story: TenYearStorySummary | null | undefined,
    analyzeId?: string | number,
    locationLabel?: string | null,
): TenYearStudioSlideMeta[] {
    if (!story) return [];

    const prefix = analyzeId ? `${analyzeId}_` : '';
    const allPeriods = collectTenYearHistoryPeriods(story);
    const cardPeriods = selectStudioYearCardPeriods(allPeriods);
    if (!cardPeriods.length) return [];

    const heroImageUrl = resolveStudioHeroImageUrl(locationLabel, story.regionLabel);
    const yearRange = buildStudioYearRangeShort(cardPeriods);
    const firstPeriod = cardPeriods[0]!;
    const lastPeriod = cardPeriods[cardPeriods.length - 1]!;
    const priceRangeLine = buildStudioIntroPriceRangeLine(
        firstPeriod.priceHighlight,
        lastPeriod.priceHighlight,
    );

    const intro: TenYearStudioIntroMeta = {
        kind: 'intro',
        sceneId: TEN_YEAR_STUDIO_INTRO_SCENE,
        label: '2-3-0. 인트로',
        filename: `${prefix}shorts_02_3_intro.png`,
        yearRange,
        priceRangeLine,
        taglineLine: STUDIO_INTRO_TAGLINE,
        heroImageUrl,
    };

    return [intro, ...buildTenYearStudioYearMetas(story, cardPeriods, prefix, heroImageUrl)];
}

function padStudioSlideOrder(index: number): string {
    return String(index + 1).padStart(2, '0');
}

/** 카페·갤러리 업로드 시 파일명 정렬로 순서가 뒤집히지 않도록 01_, 02_ 접두사 부여 */
function applyStudioSlideOrderFilenames(
    slides: TenYearStudioSlideMeta[],
    prefix: string,
): TenYearStudioSlideMeta[] {
    return slides.map((slide, index) => {
        const base = prefix && slide.filename.startsWith(prefix)
            ? slide.filename.slice(prefix.length)
            : slide.filename;
        return {
            ...slide,
            filename: `${prefix}${padStudioSlideOrder(index)}_${base}`,
        };
    });
}

export function buildTenYearStudioSlideMetas(
    story: TenYearStorySummary | null | undefined,
    analyzeId?: string | number,
    locationLabel?: string | null,
): TenYearStudioSlideMeta[] {
    if (!story) return [];

    const prefix = analyzeId ? `${analyzeId}_` : '';
    const heroImageUrl = resolveStudioHeroImageUrl(locationLabel, story.regionLabel);
    const historySlides = buildTenYearStudioHistorySlideMetas(story, analyzeId, locationLabel);
    const outlookSlides = buildTenYearStudioOutlookMetas(story, prefix, heroImageUrl);
    const closingSlide = buildTenYearStudioClosingMeta(prefix);

    return applyStudioSlideOrderFilenames(
        [...historySlides, ...outlookSlides, closingSlide],
        prefix,
    );
}

export function buildTenYearStudioCardMetas(
    story: TenYearStorySummary | null | undefined,
    analyzeId?: string | number,
    locationLabel?: string | null,
): TenYearStudioYearMeta[] {
    return buildTenYearStudioSlideMetas(story, analyzeId, locationLabel).filter(
        (slide): slide is TenYearStudioYearMeta => slide.kind === 'year',
    );
}

export function hasTenYearStudioOutlookContent(
    story: TenYearStorySummary | null | undefined,
): boolean {
    return (story?.outlookKeywords.length ?? 0) > 0;
}

export function hasTenYearStudioContent(
    story: TenYearStorySummary | null | undefined,
): boolean {
    return selectStudioYearCardPeriods(collectTenYearHistoryPeriods(story)).length > 0;
}

/** @deprecated buildTenYearStudioCardMetas 사용 */
export const TEN_YEAR_QUARTER_COUNT = TEN_YEAR_STUDIO_CARD_COUNT;
export const TEN_YEAR_QUARTER_SCENE_BASE = TEN_YEAR_STUDIO_SCENE_BASE;
export const buildTenYearQuarterMetas = buildTenYearStudioCardMetas;
export const hasTenYearQuarterContent = hasTenYearStudioContent;
