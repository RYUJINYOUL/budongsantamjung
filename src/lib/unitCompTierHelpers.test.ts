import { describe, expect, it } from 'vitest';
import {
  formatUnitCompTierAmount,
  isUnitCompDirectSsotMissing,
  isUnitCompMarketContextOnly,
  parseUnitCompComparison,
  resolveMapMarkersForUnitCompTier,
  resolveUnitCompFinalSource,
  resolveUnitCompSsotGuidance,
} from './unitCompTierHelpers';

describe('unitCompTierHelpers', () => {
  it('parseUnitCompComparison orders tiers and shows empty same_unit/same_building', () => {
    const rows = parseUnitCompComparison({
      unitCompComparison: [
        { tier: 'cohort', label: '공시지가 코호트', count: 22, estimatedTotalWon: 87_960_000 },
        { tier: 'regional', label: '지역 유사', count: 5, estimatedTotalWon: 102_000_000 },
        {
          tier: 'same_building',
          label: '동일 건물',
          count: 2,
          estimatedTotalWon: 380_000_000,
          minWon: 305_000_000,
          maxWon: 455_000_000,
        },
      ],
      finalEstimateSource: 'same_building',
    });
    expect(rows.map((r) => r.tier)).toEqual(['same_unit', 'same_building', 'regional', 'cohort']);
    expect(rows[0].count).toBe(0);
    expect(rows[1].count).toBe(2);
  });

  it('legacy same_pnu maps to same_unit', () => {
    expect(resolveUnitCompFinalSource({ finalEstimateSource: 'same_pnu' })).toBe('same_unit');
  });

  it('detects direct SSOT missing and market-context-only guidance', () => {
    const meta = {
      unitCompComparison: [
        { tier: 'same_unit', label: '동일 세대', count: 0, available: false },
        { tier: 'same_building', label: '동일 건물', count: 0, available: false },
        { tier: 'regional', label: '지역 유사', count: 12, estimatedTotalWon: 90_000_000, available: true },
        { tier: 'cohort', label: '코호트', count: 5, estimatedTotalWon: 88_000_000, available: true },
      ],
      finalEstimateSource: 'regional',
      unitCompDirectSsotMissing: true,
      unitCompMarketContextOnly: true,
    };
    expect(isUnitCompDirectSsotMissing(meta)).toBe(true);
    expect(isUnitCompMarketContextOnly(meta)).toBe(true);
    const g = resolveUnitCompSsotGuidance(meta);
    expect(g?.showBanner).toBe(true);
    expect(g?.secondary).toContain('③');
  });

  it('does not flag SSOT missing when same_building has trades', () => {
    const meta = {
      unitCompComparison: [
        { tier: 'same_building', label: '동일 건물', count: 3, estimatedTotalWon: 300_000_000, available: true },
        { tier: 'regional', label: '지역 유사', count: 10, estimatedTotalWon: 200_000_000, available: true },
      ],
      finalEstimateSource: 'same_unit',
    };
    expect(isUnitCompDirectSsotMissing(meta)).toBe(false);
    expect(resolveUnitCompSsotGuidance(meta)).toBeNull();
  });

  it('resolveMapMarkersForUnitCompTier prefers server regional markers', () => {
    const { markers } = resolveMapMarkersForUnitCompTier(
      'regional',
      {
        unitCompRegionalMapMarkers: [
          { lat: 37.5, lng: 127.0, dealAmount: '35000', jibun: '1-2' },
        ],
      },
      [{ lat: null, lng: null }],
    );
    expect(markers).toHaveLength(1);
    expect(markers[0].jibun).toBe('1-2');
  });

  it('formatUnitCompTierAmount shows range when min/max differ', () => {
    const s = formatUnitCompTierAmount({
      tier: 'same_building',
      label: '동일 건물',
      minWon: 305_000_000,
      maxWon: 455_000_000,
      estimatedTotalWon: 380_000_000,
    });
    expect(s).toContain('~');
    expect(s).toContain('억');
  });
});
