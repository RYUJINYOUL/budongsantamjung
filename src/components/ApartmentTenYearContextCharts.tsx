'use client';

import { useMemo } from 'react';
import MacroContextCharts from '@/components/MacroContextCharts';

interface PriceQuarterRow {
  name: string;
  year: number;
  quarter: number;
}

interface ApartmentTenYearContextChartsProps {
  chartData: PriceQuarterRow[];
  sigunguCd: string | null;
  sigunguLabel?: string | null;
}

/** @deprecated MacroContextCharts 직접 사용 권장 */
export default function ApartmentTenYearContextCharts({
  chartData,
  sigunguCd,
  sigunguLabel,
}: ApartmentTenYearContextChartsProps) {
  const timeRefs = useMemo(
    () =>
      chartData.map((row) => ({
        year: row.year,
        quarter: row.quarter,
        name: row.name,
      })),
    [chartData],
  );

  return (
    <MacroContextCharts
      timeRefs={timeRefs}
      sigunguCd={sigunguCd}
      sigunguLabel={sigunguLabel}
      axisMode="quarter"
    />
  );
}
