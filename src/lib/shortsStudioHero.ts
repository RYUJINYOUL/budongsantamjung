import type { TenYearStoryPeriodItem } from './shortsSceneData';

export type StudioHeroRegion =
    | 'seoul'
    | 'gyeonggi'
    | 'incheon'
    | 'busan'
    | 'daegu'
    | 'daejeon'
    | 'ulsan'
    | 'gwangju'
    | 'etc';

const HERO_IMAGE_BY_REGION: Record<StudioHeroRegion, string> = {
    seoul: '/서울.jpg',
    gyeonggi: '/경기도.jpg',
    incheon: '/인천.jpg',
    busan: '/부산.jpg',
    daegu: '/대구.jpg',
    daejeon: '/대전.jpg',
    ulsan: '/울산.jpg',
    gwangju: '/광주.jpg',
    etc: '/기타.jpg',
};

/** 주소·지역 라벨 → 배경 이미지 지역 (public/*.jpg) */
export function resolveStudioHeroRegion(
    locationLabel?: string | null,
    regionLabel?: string | null,
): StudioHeroRegion {
    const text = `${locationLabel || ''} ${regionLabel || ''}`;

    if (/서울/.test(text)) return 'seoul';
    if (/인천/.test(text)) return 'incheon';
    if (/경기/.test(text)) return 'gyeonggi';
    if (/부산/.test(text)) return 'busan';
    if (/대구/.test(text)) return 'daegu';
    if (/대전/.test(text)) return 'daejeon';
    if (/울산/.test(text)) return 'ulsan';
    if (/광주광역시/.test(text) || (/광주/.test(text) && !/경기/.test(text))) return 'gwangju';

    return 'etc';
}

export function getStudioHeroImageUrl(region: StudioHeroRegion): string {
    return HERO_IMAGE_BY_REGION[region];
}

export function resolveStudioHeroImageUrl(
    locationLabel?: string | null,
    regionLabel?: string | null,
): string {
    return getStudioHeroImageUrl(resolveStudioHeroRegion(locationLabel, regionLabel));
}

/** 5개 기간에서 "21~26년" 형식 범위 */
export function buildStudioYearRangeShort(periods: TenYearStoryPeriodItem[]): string {
    const years: number[] = [];
    for (const p of periods) {
        const matched = p.periodLabel.match(/\d{4}/g);
        if (matched) years.push(...matched.map((y) => parseInt(y, 10)));
    }
    if (!years.length) return '21~26년';

    const min = Math.min(...years);
    const max = Math.max(...years);
    const shortMin = String(min).slice(-2);
    const shortMax = String(max).slice(-2);
    return `${shortMin}~${shortMax}년`;
}

export function buildStudioIntroPriceRangeLine(
    firstHighlight: string | null | undefined,
    lastHighlight: string | null | undefined,
): string {
    const extract = (text: string | null | undefined): string | null => {
        if (!text?.trim()) return null;
        const match = text.match(/([\d.]+)\s*억/);
        if (!match) return null;
        const value = parseFloat(match[1]!);
        if (Number.isNaN(value)) return null;
        return value % 1 === 0 ? `${value}억` : `${value.toFixed(1)}억`;
    };

    const firstAll = [...(firstHighlight || '').matchAll(/([\d.]+)\s*억/g)].map((m) => parseFloat(m[1]!));
    const lastAll = [...(lastHighlight || '').matchAll(/([\d.]+)\s*억/g)].map((m) => parseFloat(m[1]!));

    const format = (value: number | undefined) => {
        if (value == null || Number.isNaN(value)) return null;
        return value % 1 === 0 ? `${value}억` : `${value.toFixed(1)}억`;
    };

    const start = format(firstAll[0]) ?? extract(firstHighlight) ?? '가격미상';
    const end = format(lastAll[lastAll.length - 1]) ?? start;

    return `${start}에서 ${end}까지`;
}

export const STUDIO_INTRO_TAGLINE = '5년 변동률 & 전망';

/** @deprecated STUDIO_INTRO_TAGLINE 사용 */
export function buildStudioIntroSubtitle(yearRange: string): string {
    return `${yearRange} 연도별 변동률 & 전망`;
}

/** 스튜디오 마지막 장 — 앱·웹 안내 배경 */
export const STUDIO_CLOSING_BACKGROUND = '/main.png';
