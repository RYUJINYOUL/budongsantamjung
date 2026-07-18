import { formatPriceManwon } from './formatPriceManwon';

export interface NearbyComp {
  id: string;
  apt_name: string;
  distance_m: number;
  area_sqm: number;
  deal_amount: number;
  deal_date: string | null;
  use_apr_year?: number | null;
  total_units?: number | null;
  builder?: string | null;
  badges?: string[];
}

export interface InvestmentCalcInput {
  buyPriceManwon: number;
  additionalContributionManwon: number;
  targetAreaSqm: number;
  selectedComps: NearbyComp[];
  manualExpectedPriceManwon?: number | null;
  targetReturnRate?: number;
}

export interface InvestmentCalcResult {
  totalInvestment: number;
  expectedNewPrice: number;
  expectedProfit: number;
  returnRate: number;
  fairBuyPrice: number;
  grade: string;
  stars: number;
  expectedNewPriceLabel: string;
  totalInvestmentLabel: string;
  expectedProfitLabel: string;
  fairBuyPriceLabel: string;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function mapReturnRateToGrade(returnRate: number): { grade: string; stars: number } {
  if (returnRate >= 50) return { grade: '적극 추천', stars: 5 };
  if (returnRate >= 30) return { grade: '추천', stars: 4 };
  if (returnRate >= 15) return { grade: '보통', stars: 3 };
  if (returnRate >= 0) return { grade: '주의', stars: 2 };
  return { grade: '비추천', stars: 1 };
}

export function renderStars(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
}

export function calculateInvestment(input: InvestmentCalcInput): InvestmentCalcResult | null {
  const buy = Number(input.buyPriceManwon);
  const contrib = Number(input.additionalContributionManwon);
  const area = Number(input.targetAreaSqm);
  const targetReturn = Number(input.targetReturnRate ?? 0.3);

  if (!buy || buy <= 0 || contrib < 0 || !area || area <= 0) return null;

  let expectedNewPrice = 0;

  if (input.selectedComps.length > 0) {
    const perSqm = input.selectedComps
      .map((c) => (c.deal_amount / c.area_sqm))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (!perSqm.length) return null;
    const medianPerSqm = median(perSqm);
    expectedNewPrice = Math.round(medianPerSqm * area);
  } else if (input.manualExpectedPriceManwon && input.manualExpectedPriceManwon > 0) {
    expectedNewPrice = Math.round(input.manualExpectedPriceManwon);
  } else {
    return null;
  }

  const totalInvestment = buy + contrib;
  const expectedProfit = expectedNewPrice - totalInvestment;
  const returnRate = totalInvestment > 0 ? (expectedProfit / totalInvestment) * 100 : 0;
  const fairBuyPrice = Math.max(0, Math.round(expectedNewPrice / (1 + targetReturn) - contrib));
  const { grade, stars } = mapReturnRateToGrade(returnRate);

  return {
    totalInvestment,
    expectedNewPrice,
    expectedProfit,
    returnRate,
    fairBuyPrice,
    grade,
    stars,
    expectedNewPriceLabel: formatPriceManwon(expectedNewPrice) || '-',
    totalInvestmentLabel: formatPriceManwon(totalInvestment) || '-',
    expectedProfitLabel: formatPriceManwon(expectedProfit) || '-',
    fairBuyPriceLabel: formatPriceManwon(fairBuyPrice) || '-',
  };
}
