'use client';

import { ExternalLink, Sparkles, X } from 'lucide-react';
import type { MyHomeInsightItem } from '../../lib/myHomeInsightMarkers';

type Props = {
  item: MyHomeInsightItem | null;
  onClose: () => void;
};

const KIND_LABEL: Record<MyHomeInsightItem['kind'], string> = {
  news: '동네 호재',
  redevelopment: '재건축·정비',
};

export default function MyHomeInsightSheet({ item, onClose }: Props) {
  if (!item) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(92%,360px)] pointer-events-none">
      <div className="pointer-events-auto rounded-2xl border border-emerald-200 bg-white/95 backdrop-blur shadow-xl shadow-emerald-500/15 overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
              {KIND_LABEL[item.kind]}
              {item.anchorLabel ? ` · ${item.anchorLabel}` : ''}
            </p>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
            {(item.subtitle || item.date) && (
              <p className="mt-1 text-[11px] text-slate-500">
                {[item.subtitle, item.date].filter(Boolean).join(' · ')}
              </p>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-500"
              >
                자세히 보기
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
