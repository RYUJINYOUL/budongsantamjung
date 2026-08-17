'use client';

import { MapPin, X } from 'lucide-react';

type Props = {
  complexName: string | null;
  onClose: () => void;
  className?: string;
};

export default function MyHomeMapDiscoverHintSheet({ complexName, onClose, className }: Props) {
  if (!complexName) return null;

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-40 w-[min(92%,360px)] pointer-events-none ${
        className ?? 'bottom-6'
      }`}
    >
      <div className="pointer-events-auto rounded-2xl border border-emerald-200 bg-white/95 backdrop-blur shadow-xl shadow-emerald-500/15 overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 leading-snug">{complexName}</h3>
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500 leading-relaxed">
              우리집 등록 및 비교 추가 버튼을 누르고 저장하세요
            </p>
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
