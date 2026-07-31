import { makeAnalyzeSlug } from './slug';

/** 아파트 report → AI 상세 URL (MiniHub 제거) */
export function buildApartmentPageUrl(report: {
    id?: string | number;
    apt_seq?: string | number | null;
    pnu?: string | null;
    category?: string | null;
} | null | undefined, reportIdFallback?: string): string | null {
    if (!report || report.category !== 'apartment') return null;

    const reportId = String(report.id ?? reportIdFallback ?? '');
    if (!reportId) return null;

    return `/analyze/${makeAnalyzeSlug(reportId)}`;
}

export function shouldRedirectToApartmentPage(
    _report: { category?: string | null; ai_analysis_status?: string | null } | null | undefined,
    _hasRawData: boolean,
    _embeddedInApartment: boolean,
): boolean {
    return false;
}
