'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { MyApartmentRegistration, MyHomeCompareItem, MyHomeCompareSlot, MyHomeWorkplace } from '../../lib/myHomeTypes';
import { MY_HOME_COMPARE_MAX } from '../../lib/myHomeTypes';
import type { CompareScoringPayload } from '../../lib/apartmentCompareScoring';
import { scoringItemAt } from '../../lib/myHomeApi';
import {
  buildMyHomeCompareTableLines,
  formatMyHomeComplexShortName,
  formatMyHomeExtendedRowLabel,
  momentumFromScoring,
  resolveMyHomeCompareCellValue,
} from '../../lib/myHomeCompareTable';

type Props = {
  registration: MyApartmentRegistration;
  compareSlots: MyHomeCompareSlot[];
  compareResults: MyHomeCompareItem[];
  scoring: CompareScoringPayload | null;
  workplace: MyHomeWorkplace;
  loading?: boolean;
  onAddCompare: () => void;
  onRemoveCompare: (index: number) => void;
};

function riseColor(text: string) {
  if (!text.endsWith('%')) return undefined;
  const n = parseFloat(text.replace('%', '').replace('+', ''));
  if (Number.isNaN(n)) return undefined;
  if (n > 0) return 'text-red-500';
  if (n < 0) return 'text-blue-500';
  return undefined;
}

function CellValue({ text, emphasize, sublineMuted }: { text: string; emphasize?: boolean; sublineMuted?: boolean }) {
  const twoLine = text.includes('\n');
  if (twoLine) {
    const [line1, line2] = text.split('\n');
    const subClass = sublineMuted
      ? 'text-slate-500 font-semibold'
      : riseColor(line2) ?? 'text-slate-400';
    return (
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span className={`font-bold ${emphasize ? 'text-sm font-black' : 'text-[13px]'} text-slate-900`}>
          {line1}
        </span>
        {line2 && (
          <span className={`text-[10px] font-bold leading-tight ${subClass}`}>{line2}</span>
        )}
      </div>
    );
  }
  return (
    <span
      className={`font-bold ${emphasize ? 'text-sm font-black text-slate-900' : 'text-[13px] text-slate-800'} ${riseColor(text) ?? ''}`}
    >
      {text}
    </span>
  );
}

export default function MyHomeCompareTable({
  registration,
  compareSlots,
  compareResults,
  scoring,
  workplace,
  loading,
  onAddCompare,
  onRemoveCompare,
}: Props) {
  const tableLines = buildMyHomeCompareTableLines(workplace);
  const canAdd = compareSlots.length < MY_HOME_COMPARE_MAX;

  const columns = [
    { label: registration.complexName, isHome: true, resultIndex: 0 },
    ...compareSlots.map((slot, i) => ({
      label: slot.complexName,
      isHome: false,
      slotIndex: i,
      resultIndex: i + 1,
    })),
  ];

  const getMomentum = (index: number) => momentumFromScoring(scoringItemAt(scoring, index));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-black text-slate-900">단지 비교</h3>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={onAddCompare}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
          >
            <Plus className="w-3.5 h-3.5" />
            비교 추가
          </button>
        )}
      </div>

      <div className="overflow-x-auto overscroll-x-contain touch-pan-x border-t border-slate-100">
        <div className="min-w-[320px]">
          {/* 헤더 */}
          <div className="flex bg-emerald-50/80 border-b border-slate-100">
            <div className="shrink-0 w-[80px] px-2.5 py-4 text-[11px] font-bold text-slate-500 bg-emerald-50/70">항목</div>
            {columns.map((col, i) => (
              <div key={i} className="flex-1 min-w-[92px] px-2.5 py-4 border-l border-slate-100">
                <div className="flex flex-col items-center gap-0.5 text-center">
                  {col.isHome && (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                      우리집
                    </span>
                  )}
                  {!col.isHome && (
                    <button
                      type="button"
                      onClick={() => onRemoveCompare((col as { slotIndex: number }).slotIndex)}
                      className="self-end text-slate-400 hover:text-rose-500 -mt-0.5 -mr-0.5"
                      aria-label="비교 단지 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <span className="text-[11px] font-black text-slate-900 leading-snug line-clamp-2">
                    {formatMyHomeComplexShortName(col.label)}
                  </span>
                </div>
              </div>
            ))}
            {canAdd && columns.length < MY_HOME_COMPARE_MAX + 1 && (
              <div className="flex-1 min-w-[72px] px-2 py-3 border-l border-slate-100 flex items-center justify-center">
                <button
                  type="button"
                  onClick={onAddCompare}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 text-[10px] font-bold"
                >
                  + 추가
                </button>
              </div>
            )}
          </div>

          {/* 행 */}
          {tableLines.map((line, lineIdx) => {
            if (line.kind === 'group') {
              return (
                <div
                  key={`g-${line.title}`}
                  className="px-3 py-2.5 bg-white border-b border-slate-50"
                >
                  <span className="text-[11px] font-black text-emerald-600 tracking-wide">{line.title}</span>
                </div>
              );
            }

            const label =
              line.kind === 'extended'
                ? formatMyHomeExtendedRowLabel(line.label)
                : line.label;
            const emphasize = label.startsWith('최근 평균');
            const labelTwoLine = label.includes('\n');
            const isElementaryRow = line.kind === 'field' && line.label === '초품아(도보)';

            return (
              <div
                key={`${line.kind === 'extended' ? line.id : line.label}-${lineIdx}`}
                className="flex border-b border-slate-50 last:border-b-0"
              >
                <div className="shrink-0 w-[80px] px-2.5 py-3.5 min-h-[52px] bg-emerald-50/55 flex items-center justify-center">
                  {labelTwoLine ? (
                    <div className="text-[11px] font-bold text-slate-600 leading-tight">
                      {label.split('\n').map((part, pi) => (
                        <div key={pi} className={pi === 1 ? 'text-slate-400 font-semibold' : ''}>
                          {part}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-600 leading-tight">{label}</span>
                  )}
                </div>
                {columns.map((col, ci) => {
                  const item = compareResults[col.resultIndex];
                  const momentum = getMomentum(col.resultIndex);
                  const text = loading
                    ? '…'
                    : resolveMyHomeCompareCellValue(line, item, momentum);
                  return (
                    <div
                      key={ci}
                      className="flex-1 min-w-[92px] px-2 py-3.5 min-h-[52px] border-l border-slate-50 flex items-center justify-center text-center"
                    >
                      <CellValue
                        text={text}
                        emphasize={emphasize}
                        sublineMuted={isElementaryRow && text.includes('\n')}
                      />
                    </div>
                  );
                })}
                {canAdd && columns.length < MY_HOME_COMPARE_MAX + 1 && (
                  <div className="flex-1 min-w-[72px] border-l border-slate-50" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
