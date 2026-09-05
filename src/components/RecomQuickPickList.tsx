'use client';

import {
  RECOM_QUICK_PICKS,
  RECOM_QUICK_PICKS_ENABLED,
  type RecomQuickPickId,
} from '../lib/recomQuickPicks';

type Props = {
  activePickId: RecomQuickPickId | null;
  onSelect: (id: RecomQuickPickId) => void;
  className?: string;
};

export default function RecomQuickPickList({ activePickId, onSelect, className = '' }: Props) {
  if (!RECOM_QUICK_PICKS_ENABLED || RECOM_QUICK_PICKS.length === 0) return null;

  return (
    <ul className={`space-y-2 ${className}`.trim()}>
      {RECOM_QUICK_PICKS.map((pick) => {
        const active = activePickId === pick.id;
        return (
          <li key={pick.id}>
            <button
              type="button"
              onClick={() => onSelect(pick.id)}
              className={[
                'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all border',
                active
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/50',
              ].join(' ')}
            >
              <span
                className={[
                  'shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border',
                  active ? 'bg-white/20 border-white/30' : 'bg-slate-50 border-slate-100',
                ].join(' ')}
              >
                <img
                  src={pick.icon}
                  alt=""
                  className="h-5 w-5 object-contain"
                  draggable={false}
                />
              </span>
              <span className="flex-1 min-w-0 text-[12px] font-extrabold leading-snug">
                {pick.label}
              </span>
              {active && (
                <svg className="shrink-0 w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
