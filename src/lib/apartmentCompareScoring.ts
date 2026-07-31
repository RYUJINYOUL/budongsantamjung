/** compare API `scoring` (규칙 v0, AI verdict 아님) */

export type CompareScoringBadge = {
  index: number;
  complexName?: string | null;
  score: number;
  label: string;
};

export type CompareScoringItem = {
  masterId?: string | null;
  rtmsAptSeq?: string | null;
  complexName?: string | null;
  axes?: {
    momentum?: number | null;
    upside?: number | null;
    stability?: number | null;
    catalyst?: number | null;
  };
  momentumBreakdown?: {
    total?: number | null;
    hasLongTermData?: boolean;
    parts?: {
      /** cagr3y | yoy1y | rise6m | pattern */
      key: string;
      label: string;
      weight?: number;
      effectiveWeight?: number;
      ratePercent?: number | null;
      subscore?: number | null;
      tradeCount6m?: number;
      confidence?: number;
      reflectPercent?: number;
      confidenceLabel?: string | null;
      excluded?: boolean;
      patternId?: string;
      patternLabel?: string | null;
      patternEmoji?: string | null;
    }[];
  } | null;
  composite?: {
    upsideScore?: number | null;
    livabilityScore?: number | null;
    riskScore?: number | null;
  };
  pattern?: {
    available?: boolean;
    label?: string | null;
    id?: string | null;
    cagr3yPercent?: number | null;
  } | null;
};

export type CompareScoringPayload = {
  version?: string;
  disclaimer?: string;
  items?: CompareScoringItem[];
  badges?: {
    investmentTop?: CompareScoringBadge | null;
    livabilityTop?: CompareScoringBadge | null;
    stabilityTop?: CompareScoringBadge | null;
  };
};

export function parseCompareScoring(raw: unknown): CompareScoringPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as CompareScoringPayload;
  if (!Array.isArray(o.items) || o.items.length === 0) return null;
  return o;
}

export function formatScore(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '-';
  return String(Math.round(v));
}
