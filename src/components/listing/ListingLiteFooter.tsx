'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { makeAnalyzeSlug } from '@/lib/slug';
import type { ListingItem } from '@/lib/listingInventory';

export default function ListingLiteFooter({
  item,
  onAnalyzeClick,
}: {
  item: ListingItem;
  onAnalyzeClick?: () => void;
}) {
  const router = useRouter();

  const handleAnalyze = () => {
    if (onAnalyzeClick) {
      onAnalyzeClick();
      return;
    }
    router.push(`/analyze/${makeAnalyzeSlug(item.id, item.propertyTitle)}`);
  };

  return (
    <footer className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {!item.hasReport && (
        <p className="text-[10px] text-slate-500 text-center font-medium mb-2">
          분석 후 탐정 리포트가 연결됩니다
        </p>
      )}
      <div className="flex gap-2">
        {!item.hasReport ? (
          <button
            type="button"
            onClick={handleAnalyze}
            className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm shadow-lg"
          >
            AI 분석하기
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAnalyze}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm shadow-lg"
            >
              분석 리포트
            </button>
            <Link
              href={`/analyze/${makeAnalyzeSlug(item.id, item.propertyTitle)}`}
              className="px-4 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold text-sm text-slate-700"
            >
              전체
            </Link>
          </>
        )}
      </div>
    </footer>
  );
}
