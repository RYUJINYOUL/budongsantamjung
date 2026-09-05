'use client';

import { useState } from 'react';
import {
  RECOM_QUICK_PICK_TITLE,
  type RecomQuickPickId,
} from '../lib/recomQuickPicks';
import RecomQuickPickList from './RecomQuickPickList';

type Props = {
  activePickId: RecomQuickPickId | null;
  onSelect: (id: RecomQuickPickId) => void;
  /** 모바일 — 처음에는 접힌 상태 */
  defaultCollapsed?: boolean;
};

function shortLabel(id: RecomQuickPickId): string {
  const map: Record<RecomQuickPickId, string> = {
    'land-1eok': '1억 토지',
    'building-10eok': '10억 빌딩',
  };
  return map[id];
}

export default function RecomQuickPickPanel({
  activePickId,
  onSelect,
  defaultCollapsed = false,
}: Props) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-emerald-100/80 text-left transition-all active:scale-[0.99]"
        aria-expanded={false}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold text-emerald-800">{RECOM_QUICK_PICK_TITLE}</span>
          {activePickId ? (
            <span className="block text-[10px] font-semibold text-slate-500 truncate mt-0.5">
              {shortLabel(activePickId)}
            </span>
          ) : (
            <span className="block text-[10px] font-medium text-slate-400 mt-0.5">탭하여 선택</span>
          )}
        </span>
        <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-100/80 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-emerald-50/80 bg-gradient-to-r from-emerald-50/60 to-white">
        <span className="text-[11px] font-extrabold text-emerald-800">{RECOM_QUICK_PICK_TITLE}</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-expanded
        >
          접기
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <RecomQuickPickList activePickId={activePickId} onSelect={onSelect} className="p-2 max-h-[min(40vh,240px)] overflow-y-auto" />
    </div>
  );
}
