import type { ChartQuarterPoint } from '@/lib/apartmentTenYearStory';

export interface NarrativeSection {
  section: number;
  theme: string;
  script: string;
}

export type ChangeDirection = 'base' | 'up' | 'down' | 'flat';

export interface PriceStoryBeat {
  id: string;
  year: number;
  priceMan: number;
  priceDisplay: string;
  changePct: number | null;
  changeDisplay: string;
  direction: ChangeDirection;
  theme: string;
  badge?: string;
}

export interface PriceStorySummary {
  beats: PriceStoryBeat[];
  opening: { year: number; priceMan: number; display: string };
  peak: { year: number; priceMan: number; display: string };
  current: { year: number; priceMan: number; display: string };
  totalChangePct: number | null;
  peakToCurrentPct: number | null;
}

interface YearlyAvg {
  year: number;
  avg: number;
}

interface PhaseFacts {
  yearly: YearlyAvg[];
  opening: YearlyAvg;
  peak: YearlyAvg;
  current: YearlyAvg;
  rise?: { from: YearlyAvg; to: YearlyAvg; pct: number };
  crash?: { peak: YearlyAvg; trough: YearlyAvg; drop: number; dropPct: number };
}

/** 10년 시장 타임라인 카드와 맞추는 연도 — 데이터 있으면 beats에 포함 */
const STORY_ANCHOR_YEARS = [2017, 2019, 2021, 2022, 2023, 2024, 2025, 2026] as const;

/** 큰 숫자용 — "2.2억", "3.8억" */
export function formatPriceHero(manWon: number): string {
  if (!manWon || manWon <= 0) return '-';
  if (manWon >= 10000) {
    const eok = manWon / 10000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  if (manWon >= 1000) {
    const cheon = manWon / 1000;
    return cheon % 1 === 0 ? `${cheon}천만` : `${cheon.toFixed(1)}천만`;
  }
  return `${Math.round(manWon)}만`;
}

/** 만원 → "2억 2천만 원대" */
export function formatPriceBand(manWon: number): string {
  if (!manWon || manWon <= 0) return '정보 없음';
  if (manWon >= 10000) {
    const eok = Math.floor(manWon / 10000);
    const rest = manWon % 10000;
    if (rest >= 500) {
      const cheon = Math.round(rest / 1000);
      if (cheon >= 10) {
        return `${eok + 1}억 원대`;
      }
      return cheon > 0 ? `${eok}억 ${cheon}천만 원대` : `${eok}억 원대`;
    }
    return `${eok}억 원대`;
  }
  if (manWon >= 1000) {
    const cheon = Math.round(manWon / 1000);
    return `${cheon}천만 원대`;
  }
  return `${Math.round(manWon).toLocaleString()}만 원대`;
}

/** 만원 → "3억 8천만 원" (고점 등 강조용) */
export function formatPriceExact(manWon: number): string {
  if (!manWon || manWon <= 0) return '정보 없음';
  if (manWon >= 10000) {
    const eok = Math.floor(manWon / 10000);
    const rest = manWon % 10000;
    if (rest >= 500) {
      const cheon = Math.round(rest / 1000);
      if (cheon >= 10) return `${eok + 1}억 원`;
      return cheon > 0 ? `${eok}억 ${cheon}천만 원` : `${eok}억 원`;
    }
    return `${eok}억 원`;
  }
  if (manWon >= 1000) {
    return `${Math.round(manWon / 1000)}천만 원`;
  }
  return `${Math.round(manWon).toLocaleString()}만 원`;
}

function formatDropAmount(manWon: number): string {
  if (manWon >= 10000) {
    const eok = manWon / 10000;
    return eok % 1 === 0 ? `${eok}억 원` : `${eok.toFixed(1)}억 원`;
  }
  return `${Math.round(manWon).toLocaleString()}만 원`;
}

function buildYearlyAverages(chartData: ChartQuarterPoint[]): YearlyAvg[] {
  const byYear = new Map<number, number[]>();
  for (const row of chartData) {
    if (row.sale == null || row.sale <= 0) continue;
    const list = byYear.get(row.year) ?? [];
    list.push(row.sale);
    byYear.set(row.year, list);
  }
  return [...byYear.entries()]
    .map(([year, vals]) => ({ year, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => a.year - b.year);
}

function buildYoYMap(yearly: YearlyAvg[]): Map<number, number | null> {
  const map = new Map<number, number | null>();
  for (let i = 0; i < yearly.length; i++) {
    if (i === 0) {
      map.set(yearly[i]!.year, null);
      continue;
    }
    const prev = yearly[i - 1]!.avg;
    const curr = yearly[i]!.avg;
    map.set(yearly[i]!.year, ((curr - prev) / prev) * 100);
  }
  return map;
}

function formatChange(pct: number | null | undefined): { display: string; direction: ChangeDirection } {
  if (pct == null || Number.isNaN(pct)) {
    return { display: '기준', direction: 'base' };
  }
  const abs = Math.abs(pct);
  if (abs < 3) {
    return { display: '보합', direction: 'flat' };
  }
  const rounded = Math.round(pct);
  if (rounded > 0) {
    return { display: `+${rounded}%`, direction: 'up' };
  }
  return { display: `${rounded}%`, direction: 'down' };
}

function analyzePhases(yearly: YearlyAvg[]): PhaseFacts | null {
  if (yearly.length < 2) return null;

  const opening = yearly[0]!;
  const current = yearly[yearly.length - 1]!;
  const peak = yearly.reduce((best, y) => (y.avg > best.avg ? y : best), yearly[0]!);

  let rise: PhaseFacts['rise'];
  let maxRisePct = 0;
  for (let i = 1; i < yearly.length; i++) {
    const prev = yearly[i - 1]!;
    const curr = yearly[i]!;
    if (curr.year > peak.year) continue;
    const pct = ((curr.avg - prev.avg) / prev.avg) * 100;
    if (pct > maxRisePct && pct >= 8) {
      maxRisePct = pct;
      rise = { from: prev, to: curr, pct };
    }
  }

  let crash: PhaseFacts['crash'];
  const afterPeak = yearly.filter((y) => y.year > peak.year);
  if (afterPeak.length > 0) {
    const trough = afterPeak.reduce((worst, y) => (y.avg < worst.avg ? y : worst), afterPeak[0]!);
    const drop = peak.avg - trough.avg;
    const dropPct = (drop / peak.avg) * 100;
    if (dropPct >= 8) {
      crash = { peak, trough, drop, dropPct };
    }
  } else if (peak.year !== current.year && peak.avg > current.avg) {
    const drop = peak.avg - current.avg;
    const dropPct = (drop / peak.avg) * 100;
    if (dropPct >= 8) {
      crash = { peak, trough: current, drop, dropPct };
    }
  }

  return { yearly, opening, peak, current, rise, crash };
}

function themeForYear(year: number, facts: PhaseFacts): { theme: string; badge?: string } {
  if (year === facts.opening.year) return { theme: '초기 시세', badge: '시작' };
  if (facts.rise && year === facts.rise.to.year) return { theme: '급등 구간', badge: '상승' };
  if (year === facts.peak.year) return { theme: '구간 최고가', badge: '고점' };
  if (facts.crash && year === facts.crash.trough.year) return { theme: '조정 바닥', badge: '저점' };
  if (year === facts.current.year) return { theme: '최근 시세', badge: '현재' };
  if (year === 2017) return { theme: '갭투자 유입' };
  if (year === 2019) return { theme: '규제 반사·GTX' };
  if (year === 2021) return { theme: '유동성·매수 확장' };
  if (year === 2022) return { theme: '고금리·조정' };
  if (year === 2023) return { theme: '규제 완화·반등' };
  if (year >= 2024) return { theme: '선별 회복' };
  return { theme: '중간 구간' };
}

/** 핵심 마일스톤 — 연도·가격·전년 대비 변동률 */
export function buildPriceStorySummary(chartData: ChartQuarterPoint[]): PriceStorySummary | null {
  const yearly = buildYearlyAverages(chartData);
  const facts = analyzePhases(yearly);
  if (!facts) return null;

  const yoy = buildYoYMap(yearly);
  const yearlyByYear = new Map(yearly.map((y) => [y.year, y]));
  const milestoneYears = new Set<number>();
  milestoneYears.add(facts.opening.year);
  if (facts.rise) milestoneYears.add(facts.rise.to.year);
  milestoneYears.add(facts.peak.year);
  if (facts.crash) milestoneYears.add(facts.crash.trough.year);
  milestoneYears.add(facts.current.year);
  for (const y of STORY_ANCHOR_YEARS) {
    if (yearlyByYear.has(y)) milestoneYears.add(y);
  }

  const beats: PriceStoryBeat[] = [...milestoneYears]
    .sort((a, b) => a - b)
    .map((year) => {
      const point = yearlyByYear.get(year)!;
      const { display, direction } = formatChange(yoy.get(year));
      const meta = themeForYear(year, facts);
      return {
        id: `beat-${year}`,
        year,
        priceMan: point.avg,
        priceDisplay: formatPriceHero(point.avg),
        changePct: yoy.get(year) ?? null,
        changeDisplay: display,
        direction,
        theme: meta.theme,
        badge: meta.badge,
      };
    });

  const totalChangePct =
    facts.opening.avg > 0
      ? ((facts.current.avg - facts.opening.avg) / facts.opening.avg) * 100
      : null;
  const peakToCurrentPct =
    facts.peak.avg > 0 ? ((facts.current.avg - facts.peak.avg) / facts.peak.avg) * 100 : null;

  return {
    beats,
    opening: {
      year: facts.opening.year,
      priceMan: facts.opening.avg,
      display: formatPriceHero(facts.opening.avg),
    },
    peak: {
      year: facts.peak.year,
      priceMan: facts.peak.avg,
      display: formatPriceHero(facts.peak.avg),
    },
    current: {
      year: facts.current.year,
      priceMan: facts.current.avg,
      display: formatPriceHero(facts.current.avg),
    },
    totalChangePct,
    peakToCurrentPct,
  };
}

function isFlatOpening(yearly: YearlyAvg[], opening: YearlyAvg): boolean {
  const early = yearly.filter((y) => y.year <= opening.year + 2);
  if (early.length < 2) return true;
  const maxDiff =
    (Math.max(...early.map((y) => y.avg)) - Math.min(...early.map((y) => y.avg))) / opening.avg;
  return maxDiff < 0.08;
}

export function generateComplexNarrative(
  chartData: ChartQuarterPoint[],
  complexName: string,
  exclusiveArea: number | null,
): NarrativeSection[] | null {
  const yearly = buildYearlyAverages(chartData);
  const facts = analyzePhases(yearly);
  if (!facts) return null;

  const name = complexName || '해당 단지';
  const areaLabel = exclusiveArea ? `${exclusiveArea}㎡` : '대표 평형';
  const sections: NarrativeSection[] = [];
  let sectionNo = 1;

  const flatEarly = isFlatOpening(yearly, facts.opening);
  const openingMacro =
    facts.opening.year <= 2017
      ? '저금리 시대'
      : facts.opening.year <= 2019
        ? '규제·조정기'
        : '부동산 시장 변동기';
  const flatPhrase = flatEarly
    ? '뚜렷한 상승 동력 없이 보합·조정 흐름이 이어지던 구간이었습니다.'
    : '초기 구간에서도 점진적인 가격 변동이 관측되었습니다.';

  sections.push({
    section: sectionNo++,
    theme: '오프닝 (초기 시세)',
    script: `${facts.opening.year}년 ${openingMacro}, ${name}(${areaLabel})의 연간 매매 평균은 ${formatPriceBand(facts.opening.avg)} 수준이었습니다. ${flatPhrase}`,
  });

  if (facts.rise && facts.rise.to.avg > facts.opening.avg * 1.1) {
    const breakPrice =
      facts.rise.to.avg >= 30000 ? '3억 원' : facts.rise.to.avg >= 20000 ? '2억 원' : formatPriceExact(facts.rise.to.avg);
    sections.push({
      section: sectionNo++,
      theme: '상승기 (유동성·수요 확대)',
      script: `${facts.rise.to.year}년경 전국적인 유동성 장세와 함께 매수세가 붙으며, ${formatPriceBand(facts.rise.from.avg)}에서 ${formatPriceBand(facts.rise.to.avg)}까지 약 ${Math.round(facts.rise.pct)}% 가까이 올랐습니다.${facts.rise.to.avg >= 28000 ? ` ${breakPrice} 선을 넘어서며 상승세가 가팔라졌습니다.` : ''}`,
    });
  } else if (facts.peak.avg > facts.opening.avg * 1.15 && facts.peak.year !== facts.opening.year) {
    sections.push({
      section: sectionNo++,
      theme: '상승기 (가격 재평가)',
      script: `${facts.peak.year}년 이전 구간에서 ${name}는 ${formatPriceBand(facts.opening.avg)}에서 ${formatPriceBand(facts.peak.avg)}까지 누적 상승하며 시세가 크게 재평가되었습니다.`,
    });
  }

  if (facts.peak.avg >= facts.opening.avg * 1.05) {
    const isHistoricalHigh = facts.peak.year >= 2020 && facts.peak.avg === Math.max(...yearly.map((y) => y.avg));
    sections.push({
      section: sectionNo++,
      theme: '최고점 (구간 고점)',
      script: `${facts.peak.year}년, ${name}(${areaLabel})는 ${formatPriceExact(facts.peak.avg)}${isHistoricalHigh ? ' 수준의 구간 최고가' : ' 수준의 고점'}를 기록했습니다. 당시 대비 ${formatPriceBand(facts.opening.avg)}였던 초기 시세와 비교하면 큰 폭의 변동이 있었습니다.`,
    });
  }

  if (facts.crash) {
    sections.push({
      section: sectionNo++,
      theme: '조정기 (금리·거래 위축)',
      script: `${facts.crash.trough.year}년 금리 인상과 거래 위축 속에서, ${formatPriceExact(facts.crash.peak.avg)} 고점 대비 ${formatDropAmount(facts.crash.drop)}(${Math.round(facts.crash.dropPct)}%) 가량 조정되며 ${formatPriceBand(facts.crash.trough.avg)}까지 내려왔습니다.`,
    });
  }

  const gapFromPeak = facts.peak.avg - facts.current.avg;
  const gapPct = facts.peak.avg > 0 ? (gapFromPeak / facts.peak.avg) * 100 : 0;
  const belowPeak = gapPct >= 5;
  const abovePeak = facts.current.avg > facts.peak.avg * 1.03;

  let outlook = '';
  if (abovePeak) {
    outlook = '최근 들어 구간 고점을 다시 경신하며 상승 모멘텀이 이어지고 있습니다.';
  } else if (belowPeak) {
    outlook = `최고점 대비 ${formatDropAmount(gapFromPeak)} 낮은 수준이지만, 실거주 수요와 지역 입지에 따라 향후 회복 속도는 갈릴 전망입니다.`;
  } else {
    outlook = '고점 대비 큰 폭의 추가 조정 없이 박스권에서 숨 고르기 중인 것으로 보입니다.';
  }

  sections.push({
    section: sectionNo,
    theme: '현재와 전망',
    script: `${facts.current.year}년 현재, ${name}(${areaLabel})의 연간 매매 평균은 ${formatPriceBand(facts.current.avg)}입니다. ${outlook}`,
  });

  return sections;
}
