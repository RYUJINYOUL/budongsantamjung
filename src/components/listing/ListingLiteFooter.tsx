'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { makeAnalyzeSlug } from '@/lib/slug';
import type { ListingItem } from '@/lib/listingInventory';
import { DEEP_ANALYZE_MIN_SCORE, isPassQueueListing } from '@/lib/passQueue';
import PassQueueAnalyzeConsentModal from './PassQueueAnalyzeConsentModal';

export default function ListingLiteFooter({
  item,
  onAnalyzeClick,
}: {
  item: ListingItem;
  onAnalyzeClick?: () => void;
}) {
  const router = useRouter();
  const [showConsent, setShowConsent] = useState(false);
  const isPassQueue = isPassQueueListing(item);
  const needsConsent = isPassQueue && !item.hasReport;

  const goAnalyze = () => {
    if (onAnalyzeClick) {
      onAnalyzeClick();
      return;
    }
    router.push(`/analyze/${makeAnalyzeSlug(item.id, item.propertyTitle)}`);
  };

  const handleAnalyze = () => {
    if (needsConsent) {
      setShowConsent(true);
      return;
    }
    goAnalyze();
  };

  const analyzeLabel = item.hasReport
    ? '분석 리포트'
    : isPassQueue
      ? '심층 분석 요청'
      : 'AI 분석하기';

  return (
    <>
      <PassQueueAnalyzeConsentModal
        open={showConsent}
        passBadge={item.passBadge}
        passBadgeLabel={item.passBadgeLabel}
        address={item.address}
        onCancel={() => setShowConsent(false)}
        onConfirm={() => {
          setShowConsent(false);
          goAnalyze();
        }}
      />

      <footer className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {!item.hasReport && (
          <p className="text-[10px] text-slate-500 text-center font-medium mb-2">
            {isPassQueue
              ? 'Lite 정보는 참고용입니다. 심층 분석은 요청 후 진행됩니다.'
              : '분석 후 탐정 리포트가 연결됩니다'}
          </p>
        )}
        {item.hasReport && item.aiScore != null && item.aiScore < DEEP_ANALYZE_MIN_SCORE && isPassQueue && (
          <p className="text-[10px] text-amber-800 text-center font-medium mb-2">
            AI {item.aiScore}점 — 추천 등록 기준({DEEP_ANALYZE_MIN_SCORE}점) 미달
          </p>
        )}
        <div className="flex gap-2">
          {!item.hasReport ? (
            <button
              type="button"
              onClick={handleAnalyze}
              className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm shadow-lg"
            >
              {analyzeLabel}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAnalyze}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm shadow-lg"
              >
                {analyzeLabel}
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
    </>
  );
}
