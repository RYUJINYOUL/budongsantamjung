'use client';

import React from 'react';
import { Layers, CheckCircle2, Map } from 'lucide-react';
import {
  filterUnitCompTierRowsForUi,
  formatUnitCompTierAmount,
  parseUnitCompComparison,
  resolveUnitCompFinalSource,
  resolveMapMarkersForUnitCompTier,
  resolveUnitCompSsotGuidance,
  shouldShowUnitCompTierPanel,
  unitCompTierHeadlineLabel,
  type UnitCompTierRow,
} from '@/lib/unitCompTierHelpers';
import { formatEokCompact } from '@/lib/analysisV31Helpers';
import ReferenceAppraisalBlock from './ReferenceAppraisalBlock';

const ACCENT = '#38bdf8';

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function tierIndexLabel(i: number) {
  return String.fromCharCode(0x2460 + i);
}

const MAP_TIER_KEYS = new Set(['same_unit', 'same_pnu', 'same_building']);

function TierLine({
  index,
  row,
  isFinal,
  onMapOpen,
  meta,
  comparables,
}: {
  index: number;
  row: UnitCompTierRow;
  isFinal: boolean;
  onMapOpen?: (tier: string, label: string) => void;
  meta: Record<string, unknown>;
  comparables: unknown[];
}) {
  const amount = formatUnitCompTierAmount(row);
  const hasData = amount !== '—';
  const countSuffix = row.count != null && row.count > 0 ? ` · ${row.count}건` : '';
  const showMap = MAP_TIER_KEYS.has(row.tier) && onMapOpen;
  return (
    <div
      className="flex gap-3 items-start py-2.5 border-b border-white/5 last:border-0"
      style={isFinal ? { background: hexToRgba(ACCENT, 0.06), margin: '0 -0.75rem', padding: '0.625rem 0.75rem', borderRadius: '0.75rem' } : undefined}
    >
      <span className="text-[11px] text-white/45 shrink-0 pt-0.5 w-5">{tierIndexLabel(index)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`text-xs font-bold ${isFinal ? 'text-sky-300' : 'text-white/85'}`}>
            {row.label}
          </span>
          {row.role && (
            <span className="text-[9px] text-white/30 uppercase tracking-wide">{row.role}</span>
          )}
        </div>
        <p className={`text-sm font-semibold mt-0.5 ${hasData ? 'text-white' : 'text-white/35'}`}>
          {hasData ? amount : '표본 없음'}
          {hasData && countSuffix}
        </p>
        {showMap && (
          <button
            type="button"
            onClick={() => onMapOpen(row.tier, row.label)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors hover:brightness-110"
            style={{
              backgroundColor: hexToRgba(ACCENT, 0.12),
              border: `1px solid ${hexToRgba(ACCENT, 0.28)}`,
              color: ACCENT,
            }}
          >
            <Map className="w-3.5 h-3.5" />
            지도 보기
          </button>
        )}
      </div>
      {isFinal && (
        <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" aria-hidden />
      )}
    </div>
  );
}

export default function UnitCompTierSection({
  meta,
  mergedData,
  comparables = [],
  ai,
  onOpenTierMap,
}: {
  meta: Record<string, unknown>;
  mergedData?: Record<string, unknown> | null;
  comparables?: unknown[];
  ai?: Record<string, unknown> | null;
  onOpenTierMap?: (payload: { tier: string; tierLabel: string; markers: Record<string, unknown>[]; mapTitle: string }) => void;
}) {
  if (!shouldShowUnitCompTierPanel(meta, mergedData)) return null;

  const rows = filterUnitCompTierRowsForUi(parseUnitCompComparison(meta));
  if (rows.length === 0) return null;

  const finalSource = resolveUnitCompFinalSource(meta);
  const finalLabel = unitCompTierHeadlineLabel(meta);
  const finalWon = Number(meta.estimatedTotalPrice) || Number(meta.weightedTotalPrice) || 0;
  const finalIsDirectSsot = finalSource === 'same_unit' || finalSource === 'same_building';
  const showFinalEstimateCard = finalWon > 0 && finalLabel && finalIsDirectSsot;
  const ssotGuidance = resolveUnitCompSsotGuidance(meta);
  const aiForAppraisal = ai || ({ analysisMetadata: meta, referenceAppraisal: meta.referenceAppraisal } as Record<string, unknown>);

  const handleMap = (tier: string, tierLabel: string) => {
    if (!onOpenTierMap) return;
    const { markers, mapLabel } = resolveMapMarkersForUnitCompTier(tier, meta, comparables, mergedData);
    onOpenTierMap({ tier, tierLabel, markers, mapTitle: mapLabel });
  };

  return (
    <div
      className="p-5 sm:p-6 rounded-[32px] bg-[#0f172a]/55 flex flex-col gap-4 shadow-sm"
      style={{
        border: `1px solid ${hexToRgba(ACCENT, 0.2)}`,
        boxShadow: `0 0 25px ${hexToRgba(ACCENT, 0.04)}`,
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="p-2 rounded-xl shrink-0"
          style={{
            backgroundColor: hexToRgba(ACCENT, 0.12),
            border: `1px solid ${hexToRgba(ACCENT, 0.3)}`,
          }}
        >
          <Layers className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-2 pt-0.5">
          <span className="text-base font-bold leading-snug text-white">
            호 단위 추정 — 근거 tier (분리 표시)
          </span>
          <p className="text-white/40 text-[11px] leading-relaxed">
            ① 동일 세대 · ② 동일 건물만 표시합니다. 지역·코호트 tier는 재분석·지도 검증 후 다시 노출합니다.
          </p>
        </div>
      </div>

      {ssotGuidance && (
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-2"
          style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.28)',
          }}
        >
          <p className="text-xs font-bold text-amber-200/95">{ssotGuidance.title}</p>
          <p className="text-[11px] text-amber-100/80 leading-relaxed">{ssotGuidance.primary}</p>
          <p className="text-[11px] text-white/45 leading-relaxed">{ssotGuidance.secondary}</p>
        </div>
      )}

      {ssotGuidance && aiForAppraisal && (
        <ReferenceAppraisalBlock ai={aiForAppraisal} mergedData={mergedData} compact />
      )}

      {showFinalEstimateCard && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: `linear-gradient(to bottom right, ${hexToRgba(ACCENT, 0.15)}, ${hexToRgba(ACCENT, 0.06)})`,
            border: `1px solid ${hexToRgba(ACCENT, 0.35)}`,
          }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
            최종 추정 ({finalLabel})
          </span>
          <p className="text-2xl font-black mt-0.5 leading-none text-sky-300">
            {formatEokCompact(finalWon)}원
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-white/[0.02] px-3 py-1 border border-white/5">
        {rows.map((row, i) => (
          <TierLine
            key={row.tier}
            index={i}
            row={row}
            isFinal={Boolean(finalIsDirectSsot && finalSource && row.tier === finalSource)}
            onMapOpen={onOpenTierMap ? handleMap : undefined}
            meta={meta}
            comparables={comparables}
          />
        ))}
      </div>

      <p className="text-[10px] text-white/30 leading-relaxed">
        동일 세대 0건이어도 동일 건물 거래가 있으면 ② tier에 표시됩니다. 전용㎡ 기준 실거래만 사용합니다.
      </p>
    </div>
  );
}
