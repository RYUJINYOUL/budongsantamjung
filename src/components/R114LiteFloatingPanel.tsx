'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ApartmentDealMode } from '../lib/apartmentDiscoverFilters';
import R114LiteDetailPanel from './R114LiteDetailPanel';
export default function R114LiteFloatingPanel({
  r114PropId,
  initialDealMode = 'sale',
  latestReportId,
  reportTitle,
  onClose,
  onAnalyzeClick,
}: {
  r114PropId: string;
  initialDealMode?: ApartmentDealMode;
  latestReportId?: string | null;
  reportTitle?: string | null;
  onClose: () => void;
  onAnalyzeClick?: (propId: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  const handleComplexLoaded = useCallback(({ title: t, subtitle: s }: { title: string; subtitle: string }) => {
    setTitle(t);
    setSubtitle(s);
  }, []);

  useEffect(() => {
    setTitle('');
    setSubtitle('');
  }, [r114PropId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* 모바일 백드롭 */}
      <button
        type="button"
        aria-label="패널 닫기"
        className="lg:hidden fixed inset-0 z-[45] bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside
        className="absolute top-0 left-0 z-[46] flex flex-col bg-white shadow-2xl border-r border-slate-200/80
          w-full max-w-[min(100%,420px)] h-full
          animate-in slide-in-from-left-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={`${title || '단지'} 상세`}
      >
        {/* 헤더 — 114 스타일 */}
        <header className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 bg-white">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-black text-slate-900 leading-snug truncate">
                {title || '…'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                {subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 -mr-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <R114LiteDetailPanel
            r114PropId={r114PropId}
            theme="light"
            compactHeader
            initialDealMode={initialDealMode}
            latestReportId={latestReportId}
            reportTitle={reportTitle}
            onComplexLoaded={handleComplexLoaded}
            onAnalyzeClick={onAnalyzeClick ? () => onAnalyzeClick(r114PropId) : undefined}
          />
        </div>
      </aside>
    </>
  );
}
