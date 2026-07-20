/** 아파트 report → 단지 페이지 URL (수집 완료 후 auto-redirect) */
export function buildApartmentPageUrl(report: {
    id?: string | number;
    apt_seq?: string | number | null;
    pnu?: string | null;
    category?: string | null;
} | null | undefined, reportIdFallback?: string): string | null {
    if (!report || report.category !== 'apartment') return null;

    const reportId = String(report.id ?? reportIdFallback ?? '');
    if (!reportId) return null;

    const qs = new URLSearchParams({ reportId });
    if (report.pnu) qs.set('pnu', report.pnu);

    if (report.apt_seq) {
        return `/apartment/${report.apt_seq}?${qs.toString()}`;
    }
    if (report.pnu) {
        return `/apartment/pnu?${qs.toString()}`;
    }
    return null;
}

export function shouldRedirectToApartmentPage(
    report: { category?: string | null; ai_analysis_status?: string | null } | null | undefined,
    hasRawData: boolean,
    embeddedInApartment: boolean,
): boolean {
    if (embeddedInApartment) return false;
    if (!report || report.category !== 'apartment') return false;
    if (!hasRawData) return false;
    if (report.ai_analysis_status === 'failed') return false;
    return true;
}
