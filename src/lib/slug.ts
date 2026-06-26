/**
 * /analyze/[id] → /analyze/[id]-[bldNm] SEO 슬러그 유틸
 */

export function makeAnalyzeSlug(id: string | number, bldNm?: string | null): string {
    if (!bldNm) return String(id);
    const clean = bldNm
        .replace(/\s+/g, '-')
        .replace(/[^\uAC00-\uD7A3a-zA-Z0-9-]/g, '')
        .slice(0, 40);
    return `${id}-${clean}`;
}

export function parseAnalyzeSlug(slug: string[]): string {
    // slug[0] = "4576" or "4576-아담프라임빌아파트"
    return slug[0].split('-')[0];
}
