import { describe, expect, it } from 'vitest';
import {
  formatUnitCompTierAmount,
  parseUnitCompComparison,
} from './unitCompTierHelpers';

describe('unitCompTierHelpers', () => {
  it('parseUnitCompComparison orders tiers and skips empty same_building', () => {
    const rows = parseUnitCompComparison({
      unitCompComparison: [
        { tier: 'cohort', label: '공시지가 코호트', count: 22, estimatedTotalWon: 87_960_000 },
        { tier: 'regional', label: '인접·유사 실거래', count: 5, estimatedTotalWon: 102_000_000 },
        { tier: 'same_pnu', label: '동일 PNU/필지', count: 3, estimatedTotalWon: 270_000_000, minWon: 210_000_000, maxWon: 230_000_000 },
        { tier: 'same_building', label: '동일 건물명', count: 0, estimatedTotalWon: null },
      ],
      finalEstimateSource: 'same_pnu',
    });
    expect(rows.map((r) => r.tier)).toEqual(['same_pnu', 'regional', 'cohort']);
  });

  it('formatUnitCompTierAmount shows range when min/max differ', () => {
    const s = formatUnitCompTierAmount({
      tier: 'same_pnu',
      label: '동일 PNU/필지',
      minWon: 210_000_000,
      maxWon: 230_000_000,
      estimatedTotalWon: 270_000_000,
    });
    expect(s).toContain('~');
    expect(s).toContain('억');
  });
});
