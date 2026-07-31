export type CompareScoreCoverContext = {
  workplaceLabel?: string | null;
  maxCommuteMinutes?: number | null;
  complexNames: string[];
};

export type CompareScoreCoverLines = {
  headline: string;
  workplaceLine: string | null;
  commuteLine: string | null;
  aptLine: string;
  suffix: string;
};

function normalizeComplexName(name: string) {
  return name.trim().replace(/\s+/g, '') || '단지';
}

export function buildCompareScoreCoverLines(ctx: CompareScoreCoverContext): CompareScoreCoverLines | null {
  const aptNames = ctx.complexNames.map((n) => normalizeComplexName(n || '단지')).filter(Boolean);
  if (!aptNames.length) return null;

  const aptLine = aptNames.join(' · ');
  const workplace = ctx.workplaceLabel?.trim() || '';
  const commuteMin = ctx.maxCommuteMinutes != null && ctx.maxCommuteMinutes > 0
    ? ctx.maxCommuteMinutes
    : null;

  if (workplace && commuteMin) {
    const headline = `${workplace}에서 ${commuteMin}분 내 ${aptLine} 비교`;
    return {
      headline,
      workplaceLine: `${workplace}에서`,
      commuteLine: `${commuteMin}분 내`,
      aptLine,
      suffix: '비교',
    };
  }

  if (workplace) {
    const headline = `${workplace}에서 ${aptLine} 비교`;
    return {
      headline,
      workplaceLine: `${workplace}에서`,
      commuteLine: null,
      aptLine,
      suffix: '비교',
    };
  }

  const headline = `${aptLine} 비교`;
  return {
    headline,
    workplaceLine: null,
    commuteLine: null,
    aptLine,
    suffix: '비교',
  };
}

export const COMPARE_SCORE_COVER_SCENE_ID = 0;
