'use client';

import { formatCompareComplexShortName } from './apartmentCompareMomentumBreakdown';
import type { CompareScoringItem } from './apartmentCompareScoring';

/** compare API 단지 결과 — ApartmentCompareClientPage CompareItemResult 와 동일 */
export type CompareNarrativeItem = {
  rtmsAptSeq?: string | null;
  masterId?: string | null;
  complexName?: string | null;
  exclusiveAreaM2?: number | null;
  riseRate6m?: number | null;
  avgPrice1m?: number | null;
  tradeCount6m?: number;
  maxPurchasableWithLoan?: number | null;
  loanAtPriceMan?: number | null;
  gapPriceMan?: number | null;
  jeonseRatePercent?: number | null;
  commuteMinutes?: number | null;
  commuteMinutesCar?: number | null;
  commuteMinutesTransit?: number | null;
  elementarySchoolNavMinutes?: number | null;
  elementarySchoolName?: string | null;
  hardware?: {
    householdCount?: number | null;
    buildingAgeYears?: number | null;
    parkingPerHousehold?: number | null;
  } | null;
  extended?: {
    rows?: { id: string; label: string; value: string }[];
    details?: {
      dynamicNews?: { count: number };
      redevelopment?: { projectCount?: number; isInZone?: boolean };
      academy?: { within1km?: number | null; within2km?: number | null };
    } | null;
  } | null;
  composite?: never;
};

export type CompareNarrativeColumn = {
  aptKey: string;
  complexName: string;
  data: CompareNarrativeItem;
  scoring?: CompareScoringItem | null;
};

export type CompareNarrativeEntry = {
  aptKey: string;
  complexName: string;
  stars: number;
  summary: string;
};

export type CompareNarrativeCard = {
  id: string;
  title: string;
  entries: CompareNarrativeEntry[];
};

function formatPriceMan(v: number | null | undefined) {
  if (v == null || v <= 0) return null;
  return `${(v / 10000).toFixed(1)}억`;
}

function formatPercent(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null;
  return `${v.toFixed(1)}%`;
}

function formatRise(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function extendedRowValue(c: CompareNarrativeItem, id: string): string | null {
  const row = c.extended?.rows?.find((r) => r.id === id);
  const v = row?.value?.trim();
  return v && v !== '-' ? v : null;
}

/** 초등학교명 — 공백 제거 후 4자 (예: 칠금초등, 충주중앙). 남녀공학 등 성별 라벨은 제외 */
function formatSchoolShortName(name: string | null | undefined): string | null {
  let t = name?.trim().replace(/\s/g, '') ?? '';
  if (!t) return null;
  t = t
    .replace(/\(?(남녀공학|남녀|남자|여자)\)?/g, '')
    .replace(/초등학교|초등/g, '');
  if (!t || /^(남녀공학|남녀|남|여|공학|남자|여자)$/.test(t)) return null;
  return t.length <= 4 ? t : t.slice(0, 4);
}

/** 주변 학원 — 1~2km 구간 개수만 `학원 N개` */
function formatKidsAcademySummary(c: CompareNarrativeItem): string | null {
  const fromDetails = c.extended?.details?.academy?.within2km;
  if (fromDetails != null && fromDetails >= 0) {
    return `학원 ${fromDetails}개`;
  }
  const raw = extendedRowValue(c, 'academy_near');
  if (!raw) return null;
  const m = raw.match(/2km\s*(\d+)\s*개/) ?? raw.match(/1~2km\s*(\d+)\s*개/);
  if (m) return `학원 ${m[1]}개`;
  return null;
}

const CARD_ACCENTS: Record<string, string> = {
  afford: '#34d399',
  commute: '#38bdf8',
  kids: '#0EA5E9',
  liquidity: '#a78bfa',
  jeonse: '#fbbf24',
  rise: '#fb923c',
  neighborhood: '#2dd4bf',
  history: '#818cf8',
  develop: '#f472b6',
  timing: '#4ade80',
};

function StarRating({ stars }: { stars: number }) {
  const n = Math.max(0, Math.min(5, Math.round(stars)));
  if (n === 0) {
    return <span className="text-[13px] text-white/25 font-bold leading-none">—</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-px leading-none"
      aria-label={`${n}점 만점에 ${n}점`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={
            i < n
              ? 'text-[12px] text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.45)]'
              : 'text-[12px] text-white/12'
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

/** 비교 단지 수 기준 상대 순위 → 1~5성 */
function rankToStars(rank: number, count: number): number {
  if (count <= 1) return 4;
  const t = (rank - 1) / Math.max(1, count - 1);
  return Math.max(1, Math.min(5, Math.round(5 - t * 4)));
}

function rankScores(
  scores: (number | null)[],
  higherIsBetter: boolean,
): number[] {
  const indexed = scores.map((s, i) => ({ i, s }));
  const valid = indexed.filter((x) => x.s != null && !Number.isNaN(x.s)) as { i: number; s: number }[];
  if (valid.length === 0) return scores.map(() => 0);

  const sorted = [...valid].sort((a, b) => (higherIsBetter ? b.s - a.s : a.s - b.s));
  const rankByIndex = new Map<number, number>();
  sorted.forEach((item, rank) => rankByIndex.set(item.i, rank + 1));

  return scores.map((s, i) => {
    if (s == null || Number.isNaN(s)) return 0;
    const rank = rankByIndex.get(i) ?? valid.length;
    return rankToStars(rank, valid.length);
  });
}

type DimensionBuilder = {
  id: string;
  title: string;
  skip?: (ctx: { workPlaceSet: boolean }) => boolean;
  scores: (c: CompareNarrativeItem, scoring?: CompareScoringItem | null) => number | null;
  higherIsBetter: boolean;
  summary: (c: CompareNarrativeItem, scoring?: CompareScoringItem | null) => string;
};

const DIMENSIONS: DimensionBuilder[] = [
  {
    id: 'afford',
    title: '살수있어요!',
    scores: (c) => {
      const gap = c.gapPriceMan;
      const loan = c.loanAtPriceMan ?? c.maxPurchasableWithLoan;
      if (gap != null && gap > 0) return -gap;
      if (loan != null && loan > 0) return loan;
      return null;
    },
    higherIsBetter: true,
    summary: (c) => {
      const loan = formatPriceMan(c.loanAtPriceMan ?? c.maxPurchasableWithLoan);
      const gap = formatPriceMan(c.gapPriceMan);
      if (loan && gap) return `(대출 ${loan} / 갭 ${gap})`;
      if (loan) return `(대출 ${loan})`;
      if (gap) return `(갭 ${gap})`;
      return '(데이터 오류)';
    },
  },
  {
    id: 'commute',
    title: '오늘도출근!',
    skip: ({ workPlaceSet }) => !workPlaceSet,
    scores: (c) => {
      const t = c.commuteMinutesTransit;
      const car = c.commuteMinutesCar ?? c.commuteMinutes;
      const parts = [t, car].filter((v) => v != null && v > 0) as number[];
      if (parts.length === 0) return null;
      return parts.reduce((a, b) => a + b, 0) / parts.length;
    },
    higherIsBetter: false,
    summary: (c) => {
      const t = c.commuteMinutesTransit;
      const car = c.commuteMinutesCar ?? c.commuteMinutes;
      const bits: string[] = [];
      if (t != null && t > 0) bits.push(`교통 ${t}분`);
      if (car != null && car > 0) bits.push(`자차 ${car}분`);
      return bits.length ? `(${bits.join(' / ')})` : '(데이터 오류)';
    },
  },
  {
    id: 'kids',
    title: '아이들행복!',
    scores: (c, scoring) => {
      const walk = c.elementarySchoolNavMinutes;
      const hh = c.hardware?.householdCount;
      const liv = scoring?.composite?.livabilityScore;
      let s = 0;
      let n = 0;
      if (walk != null && walk > 0) {
        s += Math.max(0, 30 - walk);
        n++;
      }
      if (hh != null && hh > 0) {
        s += Math.min(hh / 100, 50);
        n++;
      }
      if (liv != null && !Number.isNaN(liv)) {
        s += liv;
        n++;
      }
      return n > 0 ? s / n : null;
    },
    higherIsBetter: true,
    summary: (c) => {
      const walk = c.elementarySchoolNavMinutes;
      const bits: string[] = [];
      if (walk != null && walk > 0) {
        const school = formatSchoolShortName(c.elementarySchoolName);
        bits.push(school ? `${school} ${walk}분` : `초등 ${walk}분`);
      }
      const academy = formatKidsAcademySummary(c);
      if (academy) bits.push(academy);
      return bits.length ? `(${bits.join(', ')})` : '(데이터 오류)';
    },
  },
  {
    id: 'liquidity',
    title: '팔수있어요!',
    scores: (c) => {
      const t = c.tradeCount6m;
      return t != null && t >= 0 ? t : null;
    },
    higherIsBetter: true,
    summary: (c) => {
      const t = c.tradeCount6m;
      if (t == null) return '(거래 데이터 없음)';
      if (t >= 30) return `(6개월 ${t}건, 우수)`;
      if (t >= 10) return `(6개월 ${t}건)`;
      return `(6개월 ${t}건, 적음)`;
    },
  },
  {
    id: 'jeonse',
    title: '버텨요버텨!',
    scores: (c) => {
      const j = c.jeonseRatePercent;
      if (j != null && !Number.isNaN(j)) return j;
      return null;
    },
    higherIsBetter: true,
    summary: (c) => {
      const j = formatPercent(c.jeonseRatePercent);
      if (j) {
        const label =
          (c.jeonseRatePercent ?? 0) >= 70
            ? '탄탄'
            : (c.jeonseRatePercent ?? 0) >= 50
              ? '보통'
              : '낮음';
        return `(전세 ${j}, ${label})`;
      }
      return '(데이터 오류)';
    },
  },
  {
    id: 'rise',
    title: '올라요올라!',
    scores: (c) => {
      const r = c.riseRate6m;
      if (r != null && !Number.isNaN(r)) return r;
      return null;
    },
    higherIsBetter: true,
    summary: (c) => {
      const r = formatRise(c.riseRate6m);
      if (!r) return '(상승률 데이터 없음)';
      const n = c.riseRate6m ?? 0;
      const tag = n > 2 ? '우상향' : n >= 0 ? '보합' : '조정';
      return `(상승2분기 ${r}, ${tag})`;
    },
  },
  {
    id: 'neighborhood',
    title: '동네좋아요!',
    scores: (c, scoring) => {
      const hh = c.hardware?.householdCount;
      const age = c.hardware?.buildingAgeYears;
      const liv = scoring?.composite?.livabilityScore;
      let s = 0;
      let n = 0;
      if (hh != null && hh > 0) {
        s += Math.min(hh / 80, 40);
        n++;
      }
      if (age != null) {
        s += age <= 5 ? 35 : age <= 15 ? 28 : age <= 25 ? 22 : 15;
        n++;
      }
      if (liv != null) {
        s += liv * 0.4;
        n++;
      }
      return n > 0 ? s / n : null;
    },
    higherIsBetter: true,
    summary: (c) => {
      const age = c.hardware?.buildingAgeYears;
      const hh = c.hardware?.householdCount;
      const bits: string[] = [];
      if (age != null) {
        bits.push(age <= 5 ? `${age}년차 신축` : age <= 15 ? `${age}년차 안정기` : `${age}년차`);
      }
      if (hh != null && hh >= 500) bits.push('500세대↑');
      else if (hh != null) bits.push(`${hh.toLocaleString()}세대`);
      return bits.length ? `(${bits.join(' · ')})` : '(데이터 오류)';
    },
  },
  {
    id: 'history',
    title: '과거성적표!',
    scores: (c) => {
      const raw = extendedRowValue(c, 'rone_price');
      if (!raw) return null;
      const num = parseFloat(raw.replace(/[^\d.-]/g, ''));
      return Number.isFinite(num) ? num : null;
    },
    higherIsBetter: true,
    summary: (c) => {
      const raw = extendedRowValue(c, 'rone_price');
      if (!raw) return '(알원지수 없음)';
      return `(알원지수 ${raw})`;
    },
  },
  {
    id: 'develop',
    title: '개발있어요!',
    scores: (c) => {
      const news = c.extended?.details?.dynamicNews?.count;
      const redev = c.extended?.details?.redevelopment?.projectCount ?? 0;
      const redevRow = extendedRowValue(c, 'redevelopment');
      let s = 0;
      if (news != null && news > 0) s += news;
      if (redev > 0) s += redev * 2;
      if (redevRow && redevRow !== '-') s += 3;
      return s > 0 ? s : null;
    },
    higherIsBetter: true,
    summary: (c) => {
      const news = c.extended?.details?.dynamicNews?.count;
      const redev = extendedRowValue(c, 'redevelopment');
      if (news != null && news > 0) return `(호재·동향 ${news}건)`;
      if (redev) return `(${redev})`;
      return '(데이터 없음)';
    },
  },
  {
    id: 'timing',
    title: '지금타이밍!',
    scores: (c) => {
      const trade = c.tradeCount6m;
      const rise = c.riseRate6m;
      if (trade == null || rise == null || Number.isNaN(rise)) return null;
      return Math.min(trade, 40) * 1.2 + rise * 2;
    },
    higherIsBetter: true,
    summary: (c) => {
      const trade = c.tradeCount6m;
      const rise = c.riseRate6m;
      if (trade != null && rise != null) {
        if (trade >= 10 && rise > 0) return '(안정 거래량 · 상승)';
        if (rise < 0 && trade < 10) return '(높은 장벽 · 조정)';
        if (trade >= 10) return '(거래 활발 · 모멘텀 참고)';
        return '(거래·상승률 혼조)';
      }
      return '(판단 데이터 부족)';
    },
  },
];

export function buildCompareNarrativeCards(
  columns: CompareNarrativeColumn[],
  options: { workPlaceSet: boolean },
): CompareNarrativeCard[] {
  if (!columns.length) return [];

  return DIMENSIONS.filter((d) => !d.skip?.(options)).map((dim) => {
    const scores = columns.map(({ data, scoring }) => dim.scores(data, scoring));
    const starsList = rankScores(scores, dim.higherIsBetter);

    return {
      id: dim.id,
      title: dim.title,
      entries: columns.map(({ aptKey, complexName, data, scoring }, i) => ({
        aptKey,
        complexName,
        stars: starsList[i],
        summary: dim.summary(data, scoring),
      })),
    };
  });
}

function CompareNarrativeCardView({ card }: { card: CompareNarrativeCard }) {
  const gridClass = card.entries.length <= 1 ? 'grid-cols-1' : 'grid-cols-2';
  const accent = CARD_ACCENTS[card.id] ?? '#34d399';

  return (
    <div
      className="snap-start shrink-0 w-[288px] min-w-[288px] max-w-[288px] rounded-[18px] sm:rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] via-white/[0.025] to-transparent py-4 px-3.5 flex flex-col"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.22), inset 0 2px 0 ${accent}22` }}
    >
      <div className="text-center mb-2.5 shrink-0">
        <p className="text-[13px] font-black text-white leading-snug tracking-tight">{card.title}</p>
        <div
          className="mx-auto mt-1.5 h-[2px] w-10 rounded-full opacity-80"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
      </div>

      <div className={`grid ${gridClass} gap-x-3 gap-y-5 flex-1 content-start`}>
        {card.entries.map((e) => (
          <div
            key={e.aptKey}
            className="flex flex-col items-center min-w-0 text-center gap-1.5 rounded-[14px] border border-white/[0.05] bg-white/[0.03] px-2.5 py-3"
          >
            <p
              className="text-[10px] font-bold text-white/70 truncate w-full leading-tight"
              title={e.complexName}
            >
              {formatCompareComplexShortName(e.complexName)}
            </p>
            <StarRating stars={e.stars} />
            <p
              className="text-[9px] text-white/45 leading-snug w-full break-keep"
              title={e.summary}
            >
              {e.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareNarrativeOverviewSection({
  columns,
  workPlaceSet,
}: {
  columns: CompareNarrativeColumn[];
  workPlaceSet: boolean;
}) {
  const cards = buildCompareNarrativeCards(columns, { workPlaceSet });
  if (!cards.length) return null;

  return (
    <div className="space-y-3.5">
      <div>
        <h2 className="text-sm font-black text-white">한눈에 보는 단지 체크</h2>
        <p className="text-[10px] text-white/35 mt-1 leading-relaxed">
          10가지 관점 · 단지별 ★ · 좌우 스크롤 (참고용)
        </p>
      </div>
      <div className="flex items-stretch gap-3.5 overflow-x-auto py-0.5 pb-1 -mx-1 px-1 snap-x snap-mandatory scroll-smooth">
        {cards.map((card) => (
          <CompareNarrativeCardView key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
