import MiniScoreRing from '../components/MiniScoreRing';
import { isCompareScoringCoverageSufficient } from './apartmentCompareCoverage';
import { formatScore, type CompareScoringItem } from './apartmentCompareScoring';

/** compare 표 헤더 — 단지명 6자 */
export function formatCompareComplexShortName(name: string | null | undefined) {
  const t = (name || '단지').replace(/\s/g, '');
  if (t.length <= 6) return t;
  return t.slice(0, 6);
}

const TOTAL_SCORE_COLOR = '#34d399';

type MomentumPartKey = 'cagr3y' | 'yoy1y' | 'rise6m';

const MOMENTUM_KEYS: MomentumPartKey[] = ['cagr3y', 'yoy1y', 'rise6m'];

const MOMENTUM_LABELS: Record<MomentumPartKey, string> = {
  cagr3y: '3년',
  yoy1y: '1년',
  rise6m: '6개월',
};

const MOMENTUM_COLORS: Record<MomentumPartKey, string> = {
  cagr3y: '#34d399',
  yoy1y: '#38bdf8',
  rise6m: '#2dd4bf',
};

const COMPOSITE_AXES = [
  { key: 'upside', label: '투자종합', color: '#fb923c' },
  { key: 'livability', label: '실거주', color: '#0EA5E9' },
  { key: 'risk', label: '리스크', color: '#fbbf24' },
] as const;

export type CompareMetricDef = {
  key: string;
  label: string;
  color: string;
  group: 'total' | 'momentum' | 'composite';
};

type MetricDef = CompareMetricDef;

const TOTAL_METRIC: MetricDef = {
  key: 'total',
  label: '종합 점수',
  color: TOTAL_SCORE_COLOR,
  group: 'total',
};

const METRIC_DEFS: MetricDef[] = [
  ...MOMENTUM_KEYS.map((key) => ({
    key,
    label: MOMENTUM_LABELS[key],
    color: MOMENTUM_COLORS[key],
    group: 'momentum' as const,
  })),
  ...COMPOSITE_AXES.map(({ key, label, color }) => ({
    key,
    label,
    color,
    group: 'composite' as const,
  })),
];


function formatRatePercent(rate: number | null | undefined, excluded?: boolean): string {
  if (excluded) return '—';
  if (rate == null || Number.isNaN(rate)) return '—';
  const sign = rate > 0 ? '+' : '';
  const fixed = Math.abs(rate) >= 10 ? rate.toFixed(0) : rate.toFixed(1);
  return `${sign}${fixed}%`;
}

function ringScoreFromSubscore(subscore: number | null | undefined): number {
  if (subscore == null || Number.isNaN(subscore)) return 0;
  return Math.min(100, Math.max(0, Math.round(subscore)));
}

export type CompareMetricRing = {
  key: string;
  label: string;
  color: string;
  ringScore: number;
  centerText: string;
  /** 모멘텀 % 옆·아래에 함께 표시할 환산 점수 */
  scoreText?: string | null;
};

type MetricRing = CompareMetricRing;

function formatSubscorePoints(subscore: number | null | undefined, excluded?: boolean): string | null {
  if (excluded) return null;
  if (subscore == null || Number.isNaN(subscore)) return null;
  return `${Math.round(subscore)}점`;
}

function buildMetricRings(row: CompareScoringItem): MetricRing[] {
  const parts = row.momentumBreakdown?.parts ?? [];
  const byKey = new Map(parts.map((p) => [p.key, p]));
  const coverageOk = isCompareScoringCoverageSufficient(row);

  const momentumRings: MetricRing[] = MOMENTUM_KEYS.map((key) => {
    const part = byKey.get(key);
    return {
      key,
      label: MOMENTUM_LABELS[key],
      color: MOMENTUM_COLORS[key],
      ringScore: ringScoreFromSubscore(part?.subscore),
      centerText: formatRatePercent(part?.ratePercent, part?.excluded),
      scoreText: formatSubscorePoints(part?.subscore, part?.excluded),
    };
  });

  const compositeRings: MetricRing[] = COMPOSITE_AXES.map(({ key, label, color }) => {
    const raw =
      key === 'upside'
        ? row.composite?.upsideScore
        : key === 'livability'
          ? row.composite?.livabilityScore
          : row.composite?.riskScore;
    const hideForCoverage = !coverageOk && (key === 'upside' || key === 'livability');
    const score = !hideForCoverage && raw != null && !Number.isNaN(raw) ? Math.round(raw) : null;
    return {
      key,
      label,
      color,
      ringScore: score ?? 0,
      centerText: score != null ? String(score) : '—',
    };
  });

  return [...momentumRings, ...compositeRings];
}

function buildTotalRing(total: number | null | undefined, coverageOk: boolean): MetricRing {
  const score = coverageOk && total != null && !Number.isNaN(total) ? Math.round(total) : null;
  return {
    key: 'total',
    label: '종합 점수',
    color: TOTAL_SCORE_COLOR,
    ringScore: score ?? 0,
    centerText: score != null ? formatScore(score) : '—',
  };
}

export type CompareMetricCardEntry = {
  aptKey: string;
  complexName: string;
  ring: CompareMetricRing;
};

type MetricCardEntry = CompareMetricCardEntry;

export type CompareMetricCard = {
  metric: CompareMetricDef;
  entries: CompareMetricCardEntry[];
};

function metricSubtitleForGroup(group: CompareMetricDef['group']) {
  if (group === 'total') return '모멘텀 종합';
  if (group === 'momentum') return '상승률';
  return '점수';
}

/** 종합 점수 내역 가로 카드 — 제목 한 줄 */
export function formatMetricCardTitle(metric: CompareMetricDef): string {
  const subtitle = metricSubtitleForGroup(metric.group);
  if (metric.group === 'total') return `종합점수 ${subtitle}`;
  return `${metric.label} ${subtitle}`;
}

export function buildCompareMetricCards(items: CompareScoringItem[]): {
  metricCards: CompareMetricCard[];
  hasAnyScore: boolean;
  anyMissingLongTerm: boolean;
  anyLowCoverage: boolean;
} {
  if (!items.length) {
    return { metricCards: [], hasAnyScore: false, anyMissingLongTerm: false, anyLowCoverage: false };
  }

  const aptRows = items.map((item, i) => ({
    key: item.masterId || item.rtmsAptSeq || String(i),
    complexName: item.complexName || '단지',
    total: item.momentumBreakdown?.total ?? item.axes?.momentum,
    coverageOk: isCompareScoringCoverageSufficient(item),
    ringByKey: new Map(buildMetricRings(item).map((r) => [r.key, r])),
  }));

  const emptyRing = (metric: MetricDef): MetricRing => ({
    key: metric.key,
    label: metric.label,
    color: metric.color,
    ringScore: 0,
    centerText: '—',
  });

  const totalCard: CompareMetricCard = {
    metric: TOTAL_METRIC,
    entries: aptRows.map((apt) => ({
      aptKey: apt.key,
      complexName: apt.complexName,
      ring: buildTotalRing(apt.total, apt.coverageOk),
    })),
  };

  const metricCards: CompareMetricCard[] = [
    totalCard,
    ...METRIC_DEFS.map((metric) => ({
      metric,
      entries: aptRows.map((apt) => ({
        aptKey: apt.key,
        complexName: apt.complexName,
        ring: apt.ringByKey.get(metric.key) ?? emptyRing(metric),
      })),
    })),
  ];

  const hasAnyScore = aptRows.some(
    (apt) => apt.total != null || [...apt.ringByKey.values()].some((r) => r.centerText !== '—'),
  );

  const anyMissingLongTerm = items.some(
    (item) => item.momentumBreakdown && item.momentumBreakdown.hasLongTermData === false,
  );
  const anyLowCoverage = items.some((item) => !isCompareScoringCoverageSufficient(item));

  return { metricCards, hasAnyScore, anyMissingLongTerm, anyLowCoverage };
}

function CompareMetricBreakdownCard({
  metric,
  entries,
}: {
  metric: MetricDef;
  entries: MetricCardEntry[];
}) {
  return (
    <div className="snap-start shrink-0 w-[272px] min-w-[272px] max-w-[272px] rounded-[18px] sm:rounded-[20px] border border-white/[0.06] bg-white/[0.02] py-5 px-3.5 flex flex-col">
      <p
        className="text-[13px] font-black text-white leading-tight truncate text-center mb-3.5 shrink-0"
        title={formatMetricCardTitle(metric)}
      >
        {formatMetricCardTitle(metric)}
      </p>

      <div className="grid grid-cols-3 gap-x-1.5 gap-y-5 flex-1 content-start">
        {entries.map(({ aptKey, complexName, ring }) => (
          <div key={aptKey} className="flex flex-col items-center gap-2 min-w-0">
            <MiniScoreRing
              label=""
              score={ring.centerText === '—' ? 0 : ring.ringScore}
              centerText={ring.centerText}
              color={ring.color}
              max={100}
              size="lg"
            />
            <p
              className="text-[10px] font-bold text-white/65 truncate max-w-full text-center leading-tight w-full"
              title={complexName}
            >
              {formatCompareComplexShortName(complexName)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareScoreOverviewSection({
  items,
  onOpenCards,
}: {
  items: CompareScoringItem[];
  onOpenCards?: () => void;
}) {
  const { metricCards, hasAnyScore, anyMissingLongTerm, anyLowCoverage } = buildCompareMetricCards(items);
  if (!items.length || !hasAnyScore) return null;

  return (
    <div className="space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-white">종합 점수 내역</h2>
          <p className="text-[10px] text-white/35 mt-1 leading-relaxed">
            항목별 단지 비교 · 좌우 스크롤
          </p>
        </div>
        {onOpenCards && (
          <button
            type="button"
            onClick={onOpenCards}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/20 transition-colors"
          >
            카드 보기
          </button>
        )}
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth">
        {metricCards.map(({ metric, entries }) => (
          <CompareMetricBreakdownCard key={metric.key} metric={metric} entries={entries} />
        ))}
      </div>

      {anyLowCoverage && (
        <p className="text-[10px] text-amber-400/90 font-semibold leading-relaxed">
          데이터 커버리지 50% 미만 단지는 모멘텀·투자종합·실거주 종합점수를 표시하지 않습니다.
        </p>
      )}

      {anyMissingLongTerm && (
        <p className="text-[10px] text-amber-400/90 font-semibold leading-relaxed">
          일부 단지는 3년 quarterly 데이터가 없어 6개월 상승률만 반영됩니다(모멘텀 상한 55).
        </p>
      )}
    </div>
  );
}
