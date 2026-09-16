'use client';

import Link from 'next/link';
import type { AuctionListItem } from '../lib/auctionTypes';
import { formatManwon, formatSaleDate, formatSuggestedBidMan, meritLabelKo, meritStyle } from '../lib/formatAuctionPrice';

export interface AuctionCardProps {
  item: AuctionListItem;
  href?: string;
}

export default function AuctionCard({ item, href }: AuctionCardProps) {
  const analysis = item.priceAnalysis;
  const merit = meritStyle(analysis?.meritLabel);
  const targetHref = href ?? `/auction/${item.id}`;

  const discountPct =
    analysis?.bidRatioPct != null ? Math.round(100 - analysis.bidRatioPct) : null;

  return (
    <Link
      href={targetHref}
      className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-emerald-200 hover:shadow-md transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {item.usageType && (
              <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-700">
                {item.usageType}
              </span>
            )}
            {item.isPackaged && (
              <span className="inline-flex px-2 py-0.5 rounded-md bg-violet-50 text-[11px] font-bold text-violet-700">
                일괄매각
              </span>
            )}
            {item.failCount > 0 && (
              <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-50 text-[11px] font-bold text-rose-600">
                유찰 {item.failCount}회
              </span>
            )}
          </div>
          <p className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
            {item.address || '주소 미상'}
          </p>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            {item.courtName ?? '법원'} · {item.caseNumber}
            {item.itemNumber ? ` · ${item.itemNumber}` : ''}
          </p>
        </div>
        {analysis && (
          <span
            className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-black ${merit.bg} ${merit.text} ${merit.border}`}
          >
            {meritLabelKo(analysis.meritLabel)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
        <div>
          <p className="text-[10px] font-bold text-slate-400">최저입찰</p>
          <p className="text-sm font-black text-slate-900">{formatManwon(item.minPriceMan)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400">감정가</p>
          <p className="text-sm font-bold text-slate-600">{formatManwon(item.appraisalPriceMan)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-emerald-600">AI 추천 상한</p>
          <p className={`text-sm font-black ${analysis?.suggestedBidMan != null ? 'text-emerald-700' : 'text-slate-500'}`}>
            {formatSuggestedBidMan(analysis?.suggestedBidMan ?? null)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] font-bold text-slate-500">
        <span>매각기일 {formatSaleDate(item.saleDate)}</span>
        {discountPct != null && discountPct > 0 && (
          <span className="text-emerald-600">감정가 대비 {discountPct}% 할인</span>
        )}
      </div>

      {analysis?.summaryText && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600 line-clamp-2">
          {analysis.summaryText}
        </p>
      )}
    </Link>
  );
}
