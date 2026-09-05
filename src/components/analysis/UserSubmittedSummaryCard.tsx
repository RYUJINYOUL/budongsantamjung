'use client';

import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { getTargetArea, resolveUserPriceWon } from '../../lib/analysisV31Helpers';

function findDeepValue(map: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!map || typeof map !== 'object') return undefined;
  if (map[key] !== undefined && map[key] !== null && map[key] !== '') return map[key];
  const nestedKeys = ['storeData', 'rawData', 'report', 'vitals', 'analysis', 'userSubmittedData'];
  for (const nest of nestedKeys) {
    const sub = map[nest] as Record<string, unknown> | undefined;
    if (sub && sub[key] !== undefined && sub[key] !== null && sub[key] !== '') return sub[key];
  }
  return undefined;
}

function formatKoreanCurrency(val: unknown): string {
  if (val === null || val === undefined) return '-';
  let num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (!Number.isFinite(num) || num === 0) return '-';
  if (num > 0 && num < 1_000_000) num *= 10_000;
  if (num >= 100_000_000) {
    const eok = Math.floor(num / 100_000_000);
    const rest = num % 100_000_000;
    if (rest >= 10_000) return `${eok}억 ${Math.round(rest / 10_000).toLocaleString()}만`;
    return `${eok}억`;
  }
  if (num >= 10_000) return `${Math.floor(num / 10_000).toLocaleString()}만`;
  return Math.round(num).toLocaleString();
}

type Props = {
  mergedData?: Record<string, unknown> | null;
  analysisMetadata?: Record<string, unknown> | null;
  category?: string;
  className?: string;
};

export default function UserSubmittedSummaryCard({
  mergedData,
  analysisMetadata,
  category,
  className = '',
}: Props) {
  const cells = useMemo(() => {
    const meta = analysisMetadata || {};
    const txTypeRaw = findDeepValue(mergedData, 'transactionType')
      || findDeepValue(mergedData, 'transaction_type');
    const txType = String(txTypeRaw || '매매');
    const priceVal = findDeepValue(mergedData, 'price') || findDeepValue(mergedData, 'sale_price');
    const deposit = findDeepValue(mergedData, 'deposit');
    const monthlyRent = findDeepValue(mergedData, 'monthlyRent') || findDeepValue(mergedData, 'monthly_rent');
    const floor = findDeepValue(mergedData, 'floor');
    const cat = String(category || mergedData?.category || 'land').toLowerCase();
    const areaFromMeta = getTargetArea(meta, mergedData, cat.includes('building') || cat.includes('빌') ? 'building' : 'land');
    const areaRaw = findDeepValue(mergedData, 'area') ?? findDeepValue(mergedData, 'exclusiveArea_sqm');
    const areaNum = Number(areaRaw) > 0 ? Number(areaRaw) : areaFromMeta;

    const getPriceText = () => {
      const won = resolveUserPriceWon(meta, mergedData);
      if (won > 0) return formatKoreanCurrency(won);
      if (txType === '매매') return priceVal ? formatKoreanCurrency(priceVal) : '미입력';
      if (txType === '전세') return deposit ? `보증금 ${formatKoreanCurrency(deposit)}` : '보증금 미입력';
      if (txType === '월세') {
        const depText = deposit ? `보증금 ${formatKoreanCurrency(deposit)}` : '보증금 -';
        const rentText = monthlyRent ? `월세 ${formatKoreanCurrency(monthlyRent)}` : '월세 -';
        return `${depText} / ${rentText}`;
      }
      return priceVal ? formatKoreanCurrency(priceVal) : '미입력';
    };

    const buildingTitleArr = (mergedData?.vitals as Record<string, unknown> | undefined)?.building as Record<string, unknown> | undefined;
    const titleNested = buildingTitleArr?.title ?? (mergedData?.rawData as Record<string, unknown> | undefined)?.vitals;
    let bldNm = '';
    if (Array.isArray(titleNested)) {
      bldNm = String((titleNested[0] as Record<string, unknown>)?.bldNm || '');
    } else if (buildingTitleArr && Array.isArray((buildingTitleArr as Record<string, unknown>).title)) {
      const arr = (buildingTitleArr as Record<string, unknown>).title as unknown[];
      bldNm = String((arr[0] as Record<string, unknown>)?.bldNm || '');
    }

    const floorText = floor != null && floor !== '' ? `${floor}층` : '-층';
    const areaLabel = '전용';
    const areaText = areaNum > 0 ? `${areaNum.toFixed(1)}㎡` : '-㎡';

    const list: { label: string; value: string }[] = [];
    if (bldNm) list.push({ label: '건축물명', value: bldNm });
    list.push(
      { label: '거래 유형', value: txType },
      { label: '가격 정보', value: getPriceText() },
      { label: '층수 / 면적', value: `${floorText} | ${areaLabel} ${areaText}` },
    );
    return list;
  }, [mergedData, analysisMetadata, category]);

  if (cells.every((c) => c.value === '미입력' || c.value === '-' || c.value === '-㎡')) return null;

  return (
    <section
      className={`rounded-[20px] border border-white/[0.08] bg-[#0f172a]/55 overflow-hidden shadow-[0_0_25px_rgba(14,165,233,0.04)] ${className}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
        <div className="p-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg">
          <FileText className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <span className="text-sm font-bold text-white/95 tracking-tight">입력한 상세 정보</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/[0.06]">
        {cells.map((cell) => (
          <div key={cell.label} className="px-4 py-3.5 sm:py-4 min-w-0">
            <div className="text-[11px] text-white/45 font-medium mb-1">{cell.label}</div>
            <div className="text-sm font-bold text-white truncate" title={cell.value}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
