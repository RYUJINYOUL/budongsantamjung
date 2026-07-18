'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, MapPin, Sparkles, Loader2 } from 'lucide-react';
import {
  buildYearlySaleStats,
  extractAptRegionLabel,
  filterTimelineByYears,
  sanitizeAptName,
  formatTimelinePeriodPriceComment,
  getMarketRegionLabel,
  getMarketTimeline,
  getMarketTop10Events,
  normalizeAiTenYearKeywords,
  normalizeAiTenYearTimeline,
  resolveMarketRegion,
  type ChartQuarterPoint,
} from '@/lib/apartmentTenYearStory';
import {
  buildApartmentOutlookKeywords,
  type ApartmentOutlookContext,
} from '@/lib/apartmentOutlookKeywords';

interface ApartmentTenYearTimelineProps {
  chartData?: ChartQuarterPoint[];
  complexName?: string | null;
  address?: string | null;
  sido?: string | null;
  /** 전용면적 선택 (차트·핵심 시세 흐름과 동기화) */
  uniqueAreas?: number[];
  activeArea?: number | null;
  onAreaChange?: (area: number) => void;
  /** 현재 전망 키워드용 시장·인구·거래 데이터 */
  outlookContext?: ApartmentOutlookContext;
  /** 저장된 AI 리포트 */
  aiTimeline?: unknown;
  aiTopKeywords?: unknown;
  /** Pro 테스트용 */
  reportId?: string | number;
  showProTestButton?: boolean;
  getAuthToken?: () => Promise<string | null>;
  onTenYearSaved?: () => void;
}

export default function ApartmentTenYearTimeline({
  chartData = [],
  complexName = null,
  address = null,
  sido = null,
  uniqueAreas = [],
  activeArea = null,
  onAreaChange,
  outlookContext,
  aiTimeline,
  aiTopKeywords,
  reportId,
  showProTestButton = false,
  getAuthToken,
  onTenYearSaved,
}: ApartmentTenYearTimelineProps) {
  const [previewTimeline, setPreviewTimeline] = useState<unknown>(null);
  const [previewKeywords, setPreviewKeywords] = useState<unknown>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const effectiveTimeline = previewTimeline ?? aiTimeline;
  const effectiveKeywords = previewKeywords ?? aiTopKeywords;

  const marketRegion = useMemo(() => resolveMarketRegion(address, sido), [address, sido]);
  const regionLabel = getMarketRegionLabel(marketRegion);
  const marketTimeline = getMarketTimeline(marketRegion);
  const staticTop10Events = getMarketTop10Events(marketRegion);

  const aiTimelineEntries = useMemo(() => normalizeAiTenYearTimeline(effectiveTimeline), [effectiveTimeline]);
  const aiKeywords = useMemo(() => normalizeAiTenYearKeywords(effectiveKeywords), [effectiveKeywords]);
  const useAiContent = aiTimelineEntries != null;

  const chartYears = [...new Set(chartData.map((d) => d.year))].sort((a, b) => a - b);
  const timeline = useMemo(() => {
    const base = useAiContent ? aiTimelineEntries! : marketTimeline;
    return filterTimelineByYears(base, chartYears);
  }, [useAiContent, aiTimelineEntries, marketTimeline, chartYears]);
  const top10Events = useAiContent && aiKeywords ? aiKeywords : staticTop10Events;
  const yearlyStats = buildYearlySaleStats(chartData);
  const aptRegionLabel = useMemo(() => extractAptRegionLabel(address), [address]);
  const aptDisplayName = sanitizeAptName(complexName) || '해당 단지';
  const outlookKeywords = useMemo(
    () => (outlookContext ? buildApartmentOutlookKeywords(outlookContext) : []),
    [outlookContext],
  );

  const subtitle = aptRegionLabel
    ? `${aptRegionLabel} ${aptDisplayName}의 주요 국면입니다. 차트와 함께 읽어보세요.`
    : `${aptDisplayName}의 주요 국면입니다. 차트와 함께 읽어보세요.`;

  const runProTest = async (save: boolean) => {
    if (!reportId || !getAuthToken) return;
    setIsGenerating(true);
    setTestError(null);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('로그인이 필요합니다.');

      const response = await fetch('/api/land/detective/ten-year-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reportId, save }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || '생성 실패');
      }

      setPreviewTimeline(data.tenYearMarketTimeline);
      setPreviewKeywords(data.tenYearMarketKeywords);

      if (save) {
        setPreviewTimeline(null);
        setPreviewKeywords(null);
        onTenYearSaved?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="w-full py-4 sm:p-6 bg-gradient-to-br from-sky-950/30 to-slate-900/50 border border-sky-500/20 rounded-[24px] sm:rounded-[32px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all duration-300 hover:border-sky-500/30 space-y-5 sm:space-y-6">
      <div className="text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
          <h3 className="text-white text-base font-bold tracking-tight">
            10년 부동산 시장 흐름
            <span className="text-sky-400/90 font-black ml-1.5">· {regionLabel}</span>
          </h3>
        </div>
        <p className="text-sm text-white/50 leading-relaxed pl-0 sm:pl-7">{subtitle}</p>
        {chartYears.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-sky-400/90">
              이 단지 데이터: {chartYears[0]}년 ~ {chartYears[chartYears.length - 1]}년
              {activeArea != null && (
                <span className="text-white/45 font-medium"> · 전용 {activeArea}㎡</span>
              )}
            </p>
            {uniqueAreas.length > 1 && onAreaChange && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-full sm:w-fit mx-auto sm:mx-0">
                {uniqueAreas.map((area) => {
                  const isSelected = activeArea === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => onAreaChange(area)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-300 ${isSelected
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      전용 {area}㎡
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {timeline.map((entry) => {
          const complexNote = formatTimelinePeriodPriceComment(
            entry.periodLabel,
            entry.yearFrom,
            entry.yearTo,
            yearlyStats,
            complexName,
          );

          return (
            <article
              key={entry.id}
              className="relative sm:ml-2 sm:pl-5 p-4 sm:p-5 bg-white/[0.03] border border-white/[0.05] sm:border-l-2 sm:border-l-white/10 hover:border-white/[0.10] rounded-2xl transition-all duration-300 hover:bg-white/[0.05]"
            >
              <span className="hidden sm:block absolute -left-[7px] top-6 h-2.5 w-2.5 rounded-full border-2 border-[#0f1419] bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-sky-400 uppercase">
                  {entry.periodLabel}
                </span>
                <h4 className="text-[15px] font-black text-white/90 tracking-tight">{entry.title}</h4>
              </div>
              <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-white/60">
                {entry.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {entry.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {complexNote && (
                <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-3 py-2.5 text-xs font-medium text-amber-300/90 flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400/80" />
                  <span>{complexNote}</span>
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="p-4 sm:p-5 bg-white/[0.02] border border-white/[0.05] rounded-[20px] sm:rounded-[24px]">
        <h4 className="text-sm font-bold text-white/90 tracking-tight">
          10년 핵심 키워드 TOP 10
          <span className="text-white/40 font-semibold text-xs ml-1">({regionLabel})</span>
        </h4>
        <ol className="mt-3 sm:mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {top10Events.map((item, idx) => (
            <li key={item} className="flex items-start gap-2 text-[12px] sm:text-[13px] text-white/60 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10px] font-black text-sky-400">
                {idx + 1}
              </span>
              <span className="min-w-0 break-keep leading-snug">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      {outlookKeywords.length > 0 && (
        <div className="p-4 sm:p-5 bg-white/[0.02] border border-emerald-500/15 rounded-[20px] sm:rounded-[24px]">
          <h4 className="text-sm font-bold text-white/90 tracking-tight">
            현재 전망 키워드
            <span className="text-white/40 font-semibold text-xs ml-1">(실시간 지표 요약)</span>
          </h4>
          <ol className="mt-3 sm:mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
            {outlookKeywords.map((item, idx) => (
              <li key={item.label} className="flex items-start gap-2 text-[12px] sm:text-[13px] text-white/60 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-emerald-300/90">{item.label}</span>
                  <p className="mt-0.5 text-white/55 leading-snug">{item.line}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {showProTestButton && reportId && (
        <div className="pt-2 border-t border-white/[0.06] space-y-3">
          {testError && (
            <p className="text-xs text-rose-400/90 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              {testError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isGenerating || chartYears.length === 0}
              onClick={() => runProTest(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500/15 border border-violet-500/30 px-4 py-2.5 text-sm font-bold text-violet-300 hover:bg-violet-500/25 disabled:opacity-40 transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Flash로 10년스토리 생성 (미리보기)
            </button>
            {previewTimeline && (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => runProTest(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500/15 border border-sky-500/30 px-4 py-2.5 text-sm font-bold text-sky-300 hover:bg-sky-500/25 disabled:opacity-40 transition-colors"
              >
                미리보기 저장하기
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
