import { makeAnalyzeSlug } from './slug';

export function buildAnalyzeHrefFromReportId(
  reportId: string | null | undefined,
  complexName?: string | null,
): string | null {
  const id = String(reportId || '').trim();
  if (!id) return null;
  return `/analyze/${makeAnalyzeSlug(id, complexName)}`;
}

/** compare 항목 → AI 리포트 URL (없으면 null) */
export async function resolveCompareReportHref(input: {
  pnu?: string | null;
  complexName?: string | null;
  latestReportId?: string | null;
  latestCompletedReportId?: string | null;
}, init?: RequestInit): Promise<string | null> {
  const directId = input.latestCompletedReportId || input.latestReportId;
  const direct = buildAnalyzeHrefFromReportId(directId, input.complexName);
  if (direct) return direct;

  const pnu = String(input.pnu || '').trim();
  if (!pnu) return null;

  const params = new URLSearchParams({ pnu });
  const name = String(input.complexName || '').trim();
  if (name) params.set('bldNm', name);

  const res = await fetch(`/api/land/detective/apartment/resolve?${params.toString()}`, init);
  if (!res.ok) return null;

  const hub = await res.json().catch(() => null);
  if (!hub || Number(hub.reportCount) <= 0) return null;

  const reportId = hub.latestCompletedReportId || hub.latestReportId;
  return buildAnalyzeHrefFromReportId(reportId != null ? String(reportId) : null, input.complexName);
}
