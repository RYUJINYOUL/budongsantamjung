import { parseAnalyzeSlug } from './slug';

/** /analyze/[...slug] 또는 /apartment/[aptSeq]?reportId= 에서 보고 있는 reportId */
export function getViewingReportId(pathname: string, reportIdParam: string | null): string | null {
    const analyzeMatch = pathname.match(/^\/analyze\/(.+)/);
    if (analyzeMatch) {
        const segments = analyzeMatch[1].split('/').filter(Boolean);
        if (segments[0] === 'apartment' && segments[1]) {
            return parseAnalyzeSlug([segments[1]]);
        }
        if (segments[0]) {
            return parseAnalyzeSlug([segments[0]]);
        }
    }
    if (reportIdParam && pathname.startsWith('/apartment/')) {
        return reportIdParam;
    }
    return null;
}

/** 수집·AI 완료 후 리포트 페이지 경로 */
export function buildAnalyzeReportHref(reportId: string | number): string {
    return `/analyze/${reportId}`;
}
