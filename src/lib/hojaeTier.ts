/** Track B 호재 tier — 서버 resolveHojaeTier.js · hojaeTierCap.js 와 동기화 */
export const HOJAE_TIER_CEILING: Record<number, number> = {
  0: 1.2,
  1: 1.8,
  2: 3.0,
  3: 5.0,
};

export const HOJAE_TIER_LABELS: Record<number, string> = {
  0: '호재 없음',
  1: '호재 1 · 직접수혜',
  2: '호재 2 · 복합',
  3: '호재 3 · 택지·도시개발',
};

export type HojaeTierFields = {
  hojaeTier?: number | null;
  hojaeTierLabel?: string | null;
  hojaeTierReason?: string | null;
  hojaeTierCeiling?: number | null;
  hojaeTierCapped?: boolean | null;
  appliedMultiplierRaw?: number | null;
};

export function resolveHojaeTierLabel(tier: number | null | undefined, fallback?: string | null): string | null {
  if (fallback) return fallback;
  if (tier == null || !Number.isFinite(Number(tier))) return null;
  return HOJAE_TIER_LABELS[Number(tier)] ?? `호재 tier ${tier}`;
}

export function resolveHojaeTierCeiling(tier: number | null | undefined, explicit?: number | null): number | null {
  if (explicit != null && Number.isFinite(Number(explicit))) return Number(explicit);
  if (tier == null || !Number.isFinite(Number(tier))) return null;
  return HOJAE_TIER_CEILING[Number(tier)] ?? HOJAE_TIER_CEILING[0];
}

export function formatHojaeTierSummary(fields: HojaeTierFields): string | null {
  const tier = fields.hojaeTier;
  if (tier == null || !Number.isFinite(Number(tier))) return null;
  const label = resolveHojaeTierLabel(tier, fields.hojaeTierLabel);
  const ceiling = resolveHojaeTierCeiling(tier, fields.hojaeTierCeiling);
  if (!label) return null;
  return ceiling != null ? `${label} · 배율 상한 ${ceiling}배` : label;
}

/** observedRatio 또는 cohort flat 필드에서 호재 tier 추출 */
export function pickHojaeTierFields(source: Record<string, unknown> | null | undefined): HojaeTierFields {
  const s = source || {};
  const opr = s.officialPriceRatio as Record<string, unknown> | undefined;
  const obs = (s.observedRatio || opr?.observedRatio || {}) as Record<string, unknown>;
  const pick = (key: string) => (s[key] ?? obs[key]) as HojaeTierFields[keyof HojaeTierFields];
  return {
    hojaeTier: pick('hojaeTier') as number | null | undefined,
    hojaeTierLabel: pick('hojaeTierLabel') as string | null | undefined,
    hojaeTierReason: pick('hojaeTierReason') as string | null | undefined,
    hojaeTierCeiling: pick('hojaeTierCeiling') as number | null | undefined,
    hojaeTierCapped: pick('hojaeTierCapped') as boolean | null | undefined,
    appliedMultiplierRaw: pick('appliedMultiplierRaw') as number | null | undefined,
  };
}
