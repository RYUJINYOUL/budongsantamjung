import type { CompareMetricCard } from './apartmentCompareMomentumBreakdown';
import {
  buildCompareScoreCoverLines,
  COMPARE_SCORE_COVER_SCENE_ID,
  type CompareScoreCoverContext,
} from './compareScoreCoverCard';

export type { CompareScoreCoverContext } from './compareScoreCoverCard';

export type CompareScoreSceneMeta = {
  id: number;
  key: string;
  label: string;
  filename: string;
};

/** 간편 카드 보기(PNG) 전용 제목 — 비교 리포트 UI와 분리 */
export const COMPARE_SCORE_CARD_TITLES: Record<string, string> = {
  total: '종합점수',
  cagr3y: '3년상승률',
  yoy1y: '1년상승률',
  rise6m: '6개월상승률',
  upside: '투자종합',
  livability: '실거주점수',
  risk: '리스크점수',
};

export function getCompareScoreCardTitle(metricKey: string, fallback = metricKey): string {
  return COMPARE_SCORE_CARD_TITLES[metricKey] ?? fallback;
}

const SCENE_ID_BY_KEY: Record<string, number> = {
  total: 1,
  cagr3y: 2,
  yoy1y: 3,
  rise6m: 4,
  upside: 5,
  livability: 6,
  risk: 7,
};

function slugifyComplexNames(cards: CompareMetricCard[]): string {
  const names = cards[0]?.entries.map((e) => e.complexName.replace(/\s/g, '').slice(0, 8)) ?? [];
  if (!names.length) return 'compare';
  return names.join('_vs_').slice(0, 48);
}

export function getCompareScoreSceneMeta(
  metricCards: CompareMetricCard[],
  prefix?: string,
  cover?: CompareScoreCoverContext | null,
): CompareScoreSceneMeta[] {
  const slug = prefix ?? slugifyComplexNames(metricCards);
  const scoreScenes = metricCards.map(({ metric }) => ({
    id: SCENE_ID_BY_KEY[metric.key] ?? 0,
    key: metric.key,
    label: getCompareScoreCardTitle(metric.key, metric.label),
    filename: `${slug}_score_${metric.key}.png`,
  })).filter((scene) => scene.id > 0);

  const coverLines = cover ? buildCompareScoreCoverLines(cover) : null;
  if (!coverLines) return scoreScenes;

  return [
    {
      id: COMPARE_SCORE_COVER_SCENE_ID,
      key: 'cover',
      label: '표지',
      filename: `${slug}_score_cover.png`,
    },
    ...scoreScenes,
  ];
}

export function findCompareScoreSceneMeta(
  metricCards: CompareMetricCard[],
  sceneId: number,
  prefix?: string,
  cover?: CompareScoreCoverContext | null,
): CompareScoreSceneMeta | undefined {
  return getCompareScoreSceneMeta(metricCards, prefix, cover).find((scene) => scene.id === sceneId);
}
