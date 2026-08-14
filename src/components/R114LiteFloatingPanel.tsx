'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import type { ApartmentDealMode } from '../lib/apartmentDiscoverFilters';
import type { ApartmentComparePickPayload } from './ApartmentAreaPickModal';
import R114LiteDetailPanel, {
  type R114LiteComplexChrome,
  type R114LitePanelActions,
  R114LitePanelActionButtons,
} from './R114LiteDetailPanel';

export default function R114LiteFloatingPanel({
  r114PropId,
  initialDealMode = 'sale',
  latestReportId,
  reportTitle,
  onClose,
  onAnalyzeClick,
  onCompareClick,
  compareNotice,
  onCompareNoticeTap,
}: {
  r114PropId: string;
  initialDealMode?: ApartmentDealMode;
  latestReportId?: string | null;
  reportTitle?: string | null;
  onClose: () => void;
  onAnalyzeClick?: (propId: string) => void;
  onCompareClick?: (payload: ApartmentComparePickPayload) => void;
  compareNotice?: string | null;
  onCompareNoticeTap?: () => void;
}) {
  const [chrome, setChrome] = useState<R114LiteComplexChrome | null>(null);
  const [floatingActions, setFloatingActions] = useState<R114LitePanelActions | null>(null);

  const handleComplexLoaded = useCallback((loaded: R114LiteComplexChrome, propId: string) => {
    if (propId !== r114PropId) return;
    setChrome(loaded);
  }, [r114PropId]);

  const handleAnalyzeClick = useCallback(() => {
    onAnalyzeClick?.(r114PropId);
  }, [onAnalyzeClick, r114PropId]);

  useEffect(() => {
    setChrome(null);
    setFloatingActions(null);
  }, [r114PropId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="shrink-0 p-2 -mr-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      aria-label="닫기"
    >
      <X className="w-5 h-5" />
    </button>
  );

  return (
    <aside
      className="absolute top-0 left-0 z-[46] flex flex-col bg-white shadow-2xl border-r border-slate-200/80
        w-full max-w-[min(100%,420px)] h-full
        animate-in slide-in-from-left-4 duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`${chrome?.title || '단지'} 상세`}
    >
      {/* 모바일: 상단 액션 버튼 */}
      <header className="lg:hidden shrink-0 px-4 pt-3 pb-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2">
          {floatingActions ? (
            <R114LitePanelActionButtons actions={floatingActions} theme="light" />
          ) : (
            <div className="flex min-w-0 flex-1 gap-2">
              <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
            </div>
          )}
          {closeButton}
        </div>
      </header>

      {/* 데스크톱: 상단 단지명 */}
      <header className="hidden lg:block shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 bg-white">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-black text-slate-900 leading-snug truncate">
              {chrome?.title || '…'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              {chrome?.subtitle || ''}
            </p>
          </div>
          {closeButton}
        </div>
      </header>

      <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <R114LiteDetailPanel
          key={r114PropId}
          r114PropId={r114PropId}
          theme="light"
          compactHeader
          floatingChrome
          initialDealMode={initialDealMode}
          latestReportId={latestReportId}
          reportTitle={reportTitle}
          onComplexLoaded={handleComplexLoaded}
          onFloatingActionsChange={setFloatingActions}
          onAnalyzeClick={onAnalyzeClick ? handleAnalyzeClick : undefined}
          onCompareClick={onCompareClick}
        />
      </div>

      {/* 모바일: 하단 단지명 · 주소 · 세대 · 년식 */}
      <footer className="lg:hidden shrink-0 border-t border-slate-200/90 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <h2 className="text-[17px] font-black text-slate-900 leading-snug truncate">
          {chrome?.title || '…'}
        </h2>
        {chrome?.address && (
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{chrome.address}</p>
        )}
        {chrome?.meta && (
          <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{chrome.meta}</p>
        )}
      </footer>

      {compareNotice && (
        <button
          type="button"
          onClick={onCompareNoticeTap}
          className="absolute bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[48] flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-left shadow-lg shadow-emerald-500/15 animate-in fade-in slide-in-from-bottom-2 duration-200 active:scale-[0.98] transition-transform lg:bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-emerald-900">
              {compareNotice.includes('담') || compareNotice.includes('추가')
                ? '비교함에 추가되었습니다'
                : compareNotice}
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold text-emerald-700/80">
              클릭하시고 추가 또는 결과를 확인하세요.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-emerald-600" />
        </button>
      )}
    </aside>
  );
}
