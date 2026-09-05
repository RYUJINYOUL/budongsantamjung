'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import ListingLitePanel from './ListingLitePanel';
import ListingLiteFooter from './ListingLiteFooter';
import type { ListingItem } from '@/lib/listingInventory';

export default function ListingLiteFloatingPanel({
  item,
  onClose,
  onAnalyzeClick,
  placement = 'map',
}: {
  item: ListingItem;
  onClose: () => void;
  onAnalyzeClick?: () => void;
  placement?: 'list-inset' | 'map';
}) {
  const meta = item.listingMeta || {};
  const title = meta.title || item.propertyTitle;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shellClassName = placement === 'list-inset'
    ? 'absolute inset-0 z-[30] flex flex-col bg-white shadow-2xl w-full h-full animate-in slide-in-from-right-4 duration-200 lg:hidden'
    : 'absolute inset-0 z-[46] flex flex-col bg-white shadow-2xl border-r border-slate-200/80 w-full h-full max-w-[min(420px,100%)] animate-in slide-in-from-left-4 duration-200';

  return (
    <aside
      className={shellClassName}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} 매물 상세`}
    >
      <header className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100 bg-white">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-black text-slate-900 leading-snug truncate">{title}</h2>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{item.address}</p>
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

      <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <ListingLitePanel item={item} />
      </div>

      <ListingLiteFooter item={item} onAnalyzeClick={onAnalyzeClick} />
    </aside>
  );
}
