'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, GraduationCap, Loader2, MapPin, Sparkles, BookOpen } from 'lucide-react';
import type { R114LiteContextState } from '../hooks/useR114LiteContext';
import type { R114LiteContextDetails, R114LiteContextRow } from '../lib/r114LiteTypes';
import { buildLiteRegionMetrics, formatAcademySummary, type LiteRegionMetric } from '../lib/r114LiteContextMetrics';
import NearbyInfrastructurePanel, { type NearbyInfrastructureData } from './NearbyInfrastructurePanel';

type Theme = 'light' | 'dark';

const SCHOOL_PREVIEW = 6;
const DISTRICT_TABS = ['전체', '초등학교', '중학교', '고등학교', '학원'] as const;
type DistrictTab = (typeof DISTRICT_TABS)[number];

function litePanelTheme(theme: Theme) {
  if (theme === 'light') {
    return {
      text: 'text-slate-900',
      muted: 'text-slate-500',
      section: 'bg-white border border-slate-200',
      statsGrid: 'bg-slate-50 border-slate-200',
      subBlock: 'bg-slate-50 border-slate-200',
      subHead: 'bg-emerald-50/90 border-emerald-100 text-emerald-800',
      subHeadIdle: 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-200',
      empty: 'border-dashed border-slate-200 text-slate-400',
      link: 'text-emerald-600 hover:text-emerald-500',
      tabActive: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20',
      tabIdle: 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50',
      tabBg: 'bg-slate-100',
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      valueAccent: 'text-emerald-600',
    };
  }
  return {
    text: 'text-white',
    muted: 'text-zinc-500',
    section: 'bg-white/[0.02] border border-white/10',
    statsGrid: 'bg-white/[0.03] border-white/10',
    subBlock: 'bg-white/[0.03] border-white/10',
    subHead: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
    subHeadIdle: 'bg-white/[0.03] border-white/10 text-zinc-300 hover:border-emerald-500/30',
    empty: 'border-dashed border-white/10 text-zinc-500',
    link: 'text-emerald-400 hover:text-emerald-300',
    tabActive: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25',
    tabIdle: 'text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/10',
    tabBg: 'bg-white/5',
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    valueAccent: 'text-emerald-400',
  };
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  loading,
}: {
  icon: typeof GraduationCap;
  title: string;
  subtitle?: string | null;
  loading?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex items-start gap-2 min-w-0">
        <Icon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1">
              {title === '지역·입지' && <MapPin className="w-3 h-3 shrink-0 text-emerald-500/80" />}
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {loading && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />}
    </div>
  );
}

function formatDistanceM(m: number | null | undefined) {
  if (m == null || !Number.isFinite(m)) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${Math.round(m)}m`;
}

function devEventsToInfraData(details: R114LiteContextDetails | undefined): NearbyInfrastructureData | null {
  const mapItem = (
    item: {
      id?: number;
      name: string;
      category?: string;
      distanceM?: number | null;
      walkMin?: number | null;
      progress_score?: number | null;
      displayTitle?: string;
    },
    idx: number,
  ) => ({
    id: item.id ?? idx,
    name: item.name,
    category: (item.category === 'railway' || item.category === 'road' || item.category === 'construction'
      ? item.category
      : 'construction') as 'railway' | 'road' | 'construction',
    distanceM: item.distanceM != null ? item.distanceM : 0,
    walkMin: item.walkMin ?? null,
    distanceMode: item.walkMin != null ? ('walk' as const) : ('straight' as const),
    progress_score: item.progress_score ?? null,
    displayTitle: item.displayTitle || item.name,
  });

  const raw = details?.nearbyInfrastructure;
  if (raw?.items?.length) {
    return {
      radiusKm: raw.radiusKm,
      items: raw.items.map(mapItem),
    };
  }
  const dev = details?.developmentEvents?.items;
  if (!dev?.length) return null;
  return {
    radiusKm: details?.developmentEvents?.radiusKm ?? 1.5,
    items: dev.map((item, idx) => mapItem({
      ...item,
      displayTitle: item.ui_label && item.name !== item.ui_label
        ? `${item.name} · ${item.ui_label}`
        : item.name,
    }, idx)),
  };
}

function ContextSubBlock({
  title,
  theme,
  defaultOpen = false,
  children,
}: {
  title: string;
  theme: Theme;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const t = litePanelTheme(theme);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border overflow-hidden ${t.subBlock}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left border-b transition-colors ${
          open ? t.subHead : t.subHeadIdle
        }`}
      >
        <span className="text-xs font-bold">{title}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3 py-3">{children}</div>}
    </div>
  );
}

function LiteExpandableMetricRow({
  metric,
  theme,
  isExpanded,
  onToggle,
}: {
  metric: LiteRegionMetric;
  theme: Theme;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const t = litePanelTheme(theme);
  const Icon = metric.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${metric.iconBgClass}`}>
          <Icon className={`w-4 h-4 ${metric.colorClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={`text-[11px] font-medium block leading-none mb-1 ${t.muted}`}>
              {metric.label}
            </span>
            {metric.insight && (
              <button
                type="button"
                onClick={onToggle}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold shrink-0 transition-colors flex items-center gap-0.5 ${
                  theme === 'light'
                    ? `${metric.colorClass} border-slate-200 bg-white hover:bg-slate-50`
                    : `${metric.colorClass} border-white/10 bg-white/5 hover:bg-white/10`
                }`}
              >
                <span>설명</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <span className={`font-extrabold text-[13px] leading-tight block ${t.text}`}>{metric.value}</span>
        </div>
      </div>

      {isExpanded && metric.insight && (
        <div className={`ml-11 p-3 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
          <span className={`text-[10px] font-bold block mb-1 ${metric.colorClass}`}>
            {metric.insight.trend}
          </span>
          <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-white/75'}`}>
            {metric.insight.body}
          </p>
        </div>
      )}
    </div>
  );
}

function RegionMetricsList({ rows, theme }: { rows: R114LiteContextRow[]; theme: Theme }) {
  const t = litePanelTheme(theme);
  const metrics = useMemo(() => buildLiteRegionMetrics(rows), [rows]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (metrics.length === 0) {
    return (
      <p className={`text-xs py-4 text-center rounded-xl border ${t.empty}`}>
        시군구 지표가 없습니다.
      </p>
    );
  }

  return (
    <div className={`space-y-5 p-3.5 rounded-xl border ${t.statsGrid}`}>
      {metrics.map((m) => (
        <LiteExpandableMetricRow
          key={m.key}
          metric={m}
          theme={theme}
          isExpanded={!!expanded[m.key]}
          onToggle={() => setExpanded((prev) => ({ ...prev, [m.key]: !prev[m.key] }))}
        />
      ))}
    </div>
  );
}

function DistrictTabs({
  active,
  onChange,
  theme,
}: {
  active: DistrictTab;
  onChange: (v: DistrictTab) => void;
  theme: Theme;
}) {
  const t = litePanelTheme(theme);
  return (
    <div className={`flex gap-1 p-1 rounded-xl mb-3 overflow-x-auto ${t.tabBg}`}>
      {DISTRICT_TABS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`flex-1 min-w-[2.75rem] py-1.5 px-1 text-[10px] rounded-lg font-bold transition-colors whitespace-nowrap ${
            active === level ? t.tabActive : t.tabIdle
          }`}
        >
          {level === '전체'
            ? level
            : level === '학원'
              ? level
              : level.replace('학교', '')}
        </button>
      ))}
    </div>
  );
}

function AcademyPanel({
  ctx,
  theme,
}: {
  ctx: R114LiteContextState;
  theme: Theme;
}) {
  const t = litePanelTheme(theme);
  const academyRow = ctx.rows.find((r) => r.id === 'academy_near');
  const summary = formatAcademySummary(ctx.details, academyRow);

  if (!summary) {
    return (
      <p className={`text-xs py-4 text-center rounded-xl border ${t.empty}`}>
        주변 학원 정보가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`rounded-xl border px-3 py-3 ${t.statsGrid}`}>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className={`text-xs font-bold ${t.text}`}>주변 학원 밀도</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-lg border px-2.5 py-2 ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-white/[0.02] border-white/5'}`}>
            <p className={`text-[10px] font-bold ${t.muted}`}>1km 이내</p>
            <p className={`text-sm font-black mt-0.5 ${t.text}`}>
              {summary.within1km != null ? `${summary.within1km.toLocaleString()}개` : '-'}
            </p>
          </div>
          <div className={`rounded-lg border px-2.5 py-2 ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-white/[0.02] border-white/5'}`}>
            <p className={`text-[10px] font-bold ${t.muted}`}>2km 이내</p>
            <p className={`text-sm font-black mt-0.5 ${t.text}`}>
              {summary.within2km != null ? `${summary.within2km.toLocaleString()}개` : '-'}
            </p>
          </div>
        </div>
        {summary.label && (
          <p className={`text-[11px] mt-2 ${t.muted}`}>{summary.label}</p>
        )}
      </div>
      <p className={`text-[11px] leading-relaxed px-1 ${t.muted}`}>
        학원이 많을수록 학부모 수요·교육 인프라가 풍부한 지역일 수 있어요. 통학 거리와 함께 참고하세요.
      </p>
    </div>
  );
}

export function R114LiteSchoolCard({
  ctx,
  theme = 'light',
}: {
  ctx: R114LiteContextState;
  theme?: Theme;
}) {
  const t = litePanelTheme(theme);
  const [activeTab, setActiveTab] = useState<DistrictTab>('전체');
  const [showAll, setShowAll] = useState(false);

  const schools = ctx.details?.schoolDistrict?.schools ?? [];
  const academyRow = ctx.rows.find((r) => r.id === 'academy_near');
  const hasAcademy = !!formatAcademySummary(ctx.details, academyRow);
  const hasSchools = schools.length > 0;
  const hasAny = hasSchools || hasAcademy;

  const filtered = useMemo(() => {
    const sorted = [...schools].sort((a, b) => (a.distance ?? 9e9) - (b.distance ?? 9e9));
    if (activeTab === '전체') return sorted;
    if (activeTab === '학원') return [];
    return sorted.filter((s) => s.school_level === activeTab);
  }, [schools, activeTab]);

  const visible = showAll ? filtered : filtered.slice(0, SCHOOL_PREVIEW);

  if (!ctx.hasCoords) {
    return (
      <section className={`rounded-2xl p-3.5 ${t.section}`}>
        <SectionHeader icon={GraduationCap} title="학군" />
        <p className={`text-xs py-4 text-center rounded-xl border ${t.empty}`}>
          좌표 없어 학군 정보를 불러올 수 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className={`rounded-2xl p-3.5 ${t.section}`}>
      <SectionHeader icon={GraduationCap} title="학군" loading={ctx.loading} />

      {ctx.loading && (
        <div className="space-y-2 animate-pulse">
          <div className={`h-8 rounded-xl ${t.statsGrid}`} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`h-12 rounded-xl border ${t.statsGrid}`} />
          ))}
        </div>
      )}

      {!ctx.loading && ctx.error && (
        <p className={`text-xs py-4 text-center rounded-xl border text-amber-500/90 ${t.empty}`}>
          {ctx.error}
        </p>
      )}

      {!ctx.loading && !ctx.error && (
        <>
          {!hasAny ? (
            <p className={`text-xs py-4 text-center rounded-xl border ${t.empty}`}>
              배정 학교·학원 정보가 없습니다.
            </p>
          ) : (
            <>
              <DistrictTabs
                active={activeTab}
                onChange={(v) => {
                  setActiveTab(v);
                  setShowAll(false);
                }}
                theme={theme}
              />

              {activeTab === '학원' ? (
                <AcademyPanel ctx={ctx} theme={theme} />
              ) : !hasSchools ? (
                <p className={`text-xs py-4 text-center rounded-xl border ${t.empty}`}>
                  배정 학교 정보가 없습니다.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {visible.map((s) => (
                      <li
                        key={s.school_id ?? s.school_name}
                        className={`rounded-xl border px-3 py-2.5 ${t.statsGrid}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className={`text-xs font-bold min-w-0 ${t.text}`}>
                            {s.school_name}
                          </div>
                          {s.distance != null && (
                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${t.chip}`}>
                              {formatDistanceM(s.distance)}
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] ${t.muted} mt-1`}>
                          {[s.school_level, s.total_students != null ? `${s.total_students.toLocaleString()}명` : null]
                            .filter(Boolean)
                            .join(' · ')}
                          {s.student_growth_rate != null && (
                            <span className={s.student_growth_rate >= 0 ? ' text-red-500' : ' text-blue-500'}>
                              {` · ${s.student_growth_rate > 0 ? '+' : ''}${s.student_growth_rate.toFixed(1)}%`}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {filtered.length > SCHOOL_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setShowAll((v) => !v)}
                      className={`mt-2 w-full py-2 text-[11px] font-bold rounded-xl border border-slate-200 ${t.link}`}
                    >
                      {showAll ? '접기' : `더보기 (${filtered.length - SCHOOL_PREVIEW}곳)`}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function NewsList({ details, theme }: { details?: R114LiteContextDetails; theme: Theme }) {
  const t = litePanelTheme(theme);
  const items = details?.dynamicNews?.items ?? [];
  if (items.length === 0) {
    return <p className={`text-xs ${t.muted}`}>최근 뉴스 호재가 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.slice(0, 8).map((item, i) => (
        <li key={`${item.title}-${i}`} className="text-xs">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className={`font-semibold ${t.link}`}>
              {item.title}
            </a>
          ) : (
            <span className={`font-semibold ${t.text}`}>{item.title}</span>
          )}
          {item.date ? <span className={`ml-1 ${t.muted}`}>{item.date}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function RedevList({ details, theme }: { details?: R114LiteContextDetails; theme: Theme }) {
  const t = litePanelTheme(theme);
  const redev = details?.redevelopment;
  const projects = redev?.projects ?? [];
  if (projects.length === 0) {
    return <p className={`text-xs ${t.muted}`}>재건축·정비 정보가 없습니다.</p>;
  }
  return (
    <>
      {redev?.isInZone && (
        <span className={`inline-block mb-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.chip}`}>
          정비구역 포함
        </span>
      )}
      <ul className="space-y-2">
        {projects.map((p, i) => (
          <li key={`${p.title}-${i}`} className={`rounded-lg border px-2.5 py-2 ${t.statsGrid}`}>
            <div className={`text-xs font-bold ${t.text}`}>{p.title}</div>
            <div className={`${t.muted} mt-0.5 text-[11px]`}>
              {[p.stage, p.gosiDate].filter(Boolean).join(' · ') || '-'}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function R114LiteRegionSection({
  ctx,
  theme = 'light',
}: {
  ctx: R114LiteContextState;
  theme?: Theme;
}) {
  const t = litePanelTheme(theme);
  const devRow = ctx.rows.find((r) => r.id === 'development_events');
  const newsRow = ctx.rows.find((r) => r.id === 'dynamic_news');
  const infraData = useMemo(() => devEventsToInfraData(ctx.details), [ctx.details]);

  if (!ctx.hasCoords) {
    return (
      <section className={`rounded-2xl p-3.5 ${t.section}`}>
        <SectionHeader icon={Sparkles} title="지역·입지" />
        <p className={`text-xs py-4 text-center rounded-xl border ${t.empty}`}>
          좌표 없어 지역 정보를 불러올 수 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className={`rounded-2xl p-3.5 ${t.section}`}>
      <SectionHeader
        icon={Sparkles}
        title="지역·입지"
        subtitle={ctx.sigunguName ?? undefined}
        loading={ctx.loading}
      />

      {ctx.loading && (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-14 rounded-xl border ${t.statsGrid}`} />
          ))}
        </div>
      )}

      {!ctx.loading && ctx.error && (
        <p className={`text-xs py-4 text-center rounded-xl border text-amber-500/90 ${t.empty}`}>
          {ctx.error}
        </p>
      )}

      {!ctx.loading && !ctx.error && ctx.data?.data && (
        <div className="space-y-3">
          <RegionMetricsList rows={ctx.rows} theme={theme} />

          {devRow && !devRow.empty && (
            <ContextSubBlock title={devRow.label || '주변 개발호재 (GTX·철도·건설)'} theme={theme}>
              {infraData ? (
                <NearbyInfrastructurePanel
                  data={infraData}
                  variant={theme === 'light' ? 'light' : 'dark'}
                  layout="compact"
                />
              ) : (
                <p className={`text-xs font-bold ${t.valueAccent}`}>{devRow.value}</p>
              )}
            </ContextSubBlock>
          )}

          {(newsRow || (ctx.details?.dynamicNews?.items?.length ?? 0) > 0) && (
            <ContextSubBlock title="호재 (뉴스)" theme={theme}>
              {newsRow && !newsRow.empty && (
                <p className={`text-xs font-bold mb-2 ${t.valueAccent}`}>{newsRow.value}</p>
              )}
              <NewsList details={ctx.details} theme={theme} />
            </ContextSubBlock>
          )}

          {ctx.rows.some((r) => r.id === 'redevelopment' && !r.empty) && (
            <ContextSubBlock title="재건축·정비" theme={theme}>
              <RedevList details={ctx.details} theme={theme} />
            </ContextSubBlock>
          )}

          {ctx.rows.some((r) => r.id === 'population' && !r.empty) && ctx.details?.population?.summary && (
            <ContextSubBlock title="인구·이동" theme={theme}>
              <p className={`text-xs ${t.text}`}>{ctx.details.population.summary}</p>
            </ContextSubBlock>
          )}
        </div>
      )}
    </section>
  );
}
