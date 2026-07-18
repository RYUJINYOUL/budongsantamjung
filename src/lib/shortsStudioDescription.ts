import type { TenYearStorySummary } from './shortsSceneData';
import type { TenYearStudioSlideMeta, TenYearStudioYearMeta } from './shortsTenYearQuarters';

const STUDIO_WEB_URL = 'https://tamjung.me';
const STUDIO_GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.yongcar.app';
const STUDIO_APP_STORE_URL =
    'https://apps.apple.com/kr/app/%EB%B6%80%EB%8F%99%EC%82%B0%ED%83%90%EC%A0%95/id6762132537';

const STUDIO_SHORTS_HASHTAGS = new Set(['부동산쇼츠', 'Shorts', 'shorts']);

function extractEokValues(text: string | null | undefined): number[] {
    if (!text?.trim()) return [];
    return [...text.matchAll(/([\d.]+)\s*억/g)]
        .map((match) => parseFloat(match[1]!))
        .filter((value) => !Number.isNaN(value));
}

function formatEokAmount(value: number | null | undefined, fallback = '가격미상'): string {
    if (value == null || Number.isNaN(value)) return fallback;
    return value % 1 === 0 ? `${value}억` : `${value.toFixed(1)}억`;
}

function pickYearSlides(slides: TenYearStudioSlideMeta[]): TenYearStudioYearMeta[] {
    return slides.filter((slide): slide is TenYearStudioYearMeta => slide.kind === 'year');
}

function buildStudioPriceHistoryLines(slides: TenYearStudioSlideMeta[]): string[] {
    return pickYearSlides(slides)
        .map((slide) => slide.period.priceComment?.trim())
        .filter((line): line is string => !!line);
}

/** 단지명 정규화 — (아파트) 괄호 표기 제거 */
export function formatStudioComplexLabel(complexName: string): string {
    const trimmed = complexName.trim().replace(/\s+/g, '');
    if (!trimmed || trimmed === '아파트') return '아파트';
    return trimmed.replace(/\(아파트\)$/i, '');
}

/** 태그·본문용 도시/구군 — 예: 시흥시, 마포구 */
export function pickStudioCityLabel(
    locationLabel?: string | null,
    regionLabel?: string | null,
): string {
    const text = (locationLabel || regionLabel || '').trim();
    if (!text) return '';

    const parts = text.split(/\s+/);
    const city = parts.find((part) => /[시군구]$/.test(part) && !/특별시|광역시/.test(part));
    if (city) return city.replace(/\s+/g, '');

    const gu = parts.find((part) => /[구군]$/.test(part));
    if (gu) return gu.replace(/\s+/g, '');

    return parts[1]?.replace(/\s+/g, '') || parts[0]?.replace(/\s+/g, '') || '';
}

/** 제목용 지역 — 예: 경기도 시흥시, 서울특별시 마포구 */
export function pickStudioTitleRegionLabel(
    locationLabel?: string | null,
    regionLabel?: string | null,
): string {
    const text = (locationLabel || '').trim();
    if (!text) return regionLabel?.trim() || '지역';

    const parts = text.split(/\s+/);
    const sido = parts[0] || '';
    const city = parts.find(
        (part, index) => index > 0 && /시$/.test(part) && !/특별|광역/.test(part),
    );
    if (sido && city) return `${sido} ${city}`;

    if (/특별|광역/.test(sido)) {
        const gu = parts.find((part) => /[구군]$/.test(part));
        if (gu) return `${sido} ${gu}`;
        return sido;
    }

    const gun = parts.find((part, index) => index > 0 && /군$/.test(part));
    if (sido && gun) return `${sido} ${gun}`;

    return regionLabel?.trim() || parts.slice(0, 2).join(' ') || '지역';
}

function resolveStartEndPrices(slides: TenYearStudioSlideMeta[]): { start: string; end: string } {
    const yearSlides = pickYearSlides(slides);
    const firstValues = extractEokValues(yearSlides[0]?.period.priceHighlight);
    const lastValues = extractEokValues(yearSlides[yearSlides.length - 1]?.period.priceHighlight);

    const startValue = firstValues[0] ?? null;
    const endValue = lastValues[lastValues.length - 1] ?? startValue;

    return {
        start: formatEokAmount(startValue),
        end: formatEokAmount(endValue),
    };
}

export function buildStudioHashtags(
    story: TenYearStorySummary | null | undefined,
    locationLabel?: string | null,
): string {
    const tags: string[] = [];
    const seen = new Set<string>();
    const add = (tag: string) => {
        const normalized = tag.replace(/^#/, '').replace(/\s+/g, '');
        if (!normalized || seen.has(normalized) || STUDIO_SHORTS_HASHTAGS.has(normalized)) return;
        seen.add(normalized);
        tags.push(`#${normalized}`);
    };

    const complexName = story?.complexName?.trim() || '';
    const complexLabel = formatStudioComplexLabel(complexName || '아파트');
    const cityLabel = pickStudioCityLabel(locationLabel, story?.regionLabel);

    add(complexLabel);
    if (cityLabel) add(`${cityLabel}아파트`);
    if (cityLabel) add(`${cityLabel}부동산`);

    add('아파트가격변동');
    add('부동산전망');
    add('아파트실거래가');
    add('부동산탐정');

    return tags.join(' ');
}

export function buildStudioUploadDescription(
    story: TenYearStorySummary | null | undefined,
    slides: TenYearStudioSlideMeta[],
    locationLabel?: string | null,
): string {
    const complexName = formatStudioComplexLabel(story?.complexName?.trim() || '아파트');
    const cityLabel = pickStudioCityLabel(locationLabel, story?.regionLabel);
    const { start, end } = resolveStartEndPrices(slides);
    const priceHistory = buildStudioPriceHistoryLines(slides);
    const hashtags = buildStudioHashtags(story, locationLabel);

    return [
        '',
        `■ ${cityLabel} ${complexName} ${start}에서 ${end}까지`,
        '',
        '',
        ...priceHistory,
        '',
        '',
        '■ 5년 가격 변동률 자세한 사항은 아래 부동산탐정에서 확인하세요.',
        '',
        '',
        `□ 웹 : ${STUDIO_WEB_URL}`,
        `□ 구글 앱 : ${STUDIO_GOOGLE_PLAY_URL}`,
        `□ 애플 앱 : ${STUDIO_APP_STORE_URL}`,
        '',
        '',
        '■ 부동산탐정 앱과 웹 기능소개',
        '',
        '1. 오류 정보 있으시면 답글 부탁 드립니다',
        '2. 부동산탐정 앱과 웹에서 희망 매물 무료분석 해보세요.',
        '3. 앱과 웹에서는 공공데이터 35종을 한눈에 볼 수 있습니다',
        '4. 관심 리포트를 즐겨찾기 하고 검토하세요',
        '',
        '',
        '',
        hashtags,
    ].join('\n');
}

export function buildStudioUploadDescriptionFilename(
    story: TenYearStorySummary | null | undefined,
): string {
    const complexName = story?.complexName?.trim().replace(/[<>:"/\\|?*]/g, '') || 'shorts';
    return `${complexName}_upload.txt`;
}

export async function copyStudioUploadDescription(text: string): Promise<void> {
    if (!navigator.clipboard?.writeText) {
        throw new Error('클립보드 복사를 지원하지 않는 브라우저입니다.');
    }
    await navigator.clipboard.writeText(text);
}

export function downloadStudioUploadDescription(text: string, filename: string): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
