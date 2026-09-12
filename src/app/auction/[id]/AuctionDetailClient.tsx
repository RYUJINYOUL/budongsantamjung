'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SideNav from '../../../components/SideNav';
import type { AuctionDetailResponse, AuctionListItem } from '../../../lib/auctionTypes';
import { buildAuctionAnalyzeUrl } from '../../../lib/auctionAnalyze';
import { formatManwon, formatSaleDate, meritLabelKo, meritStyle } from '../../../lib/formatAuctionPrice';
import { makeAnalyzeSlug } from '../../../lib/slug';
import { PAGE_HEADER_TITLE, PAGE_STICKY_HEADER } from '../../../components/analyzePanelFormStyles';

export default function AuctionDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<AuctionListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/auction/${id}`, { signal: controller.signal });
        const data = (await res.json()) as AuctionDetailResponse;
        if (!res.ok || !data.success || !data.item) {
          throw new Error(data.message || '상세 정보를 불러오지 못했습니다.');
        }
        setItem(data.item);
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        if (e.name === 'AbortError') return;
        setError(e.message || '조회 실패');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id]);

  const analysis = item?.priceAnalysis;
  const merit = meritStyle(analysis?.meritLabel);

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative font-noto-sans-kr antialiased">
      <div className="noise-overlay" />
      <SideNav />

      <main className="lg:pl-16 min-h-screen pb-24">
        <header className={PAGE_STICKY_HEADER}>
          <div className="flex items-center gap-3">
            <div className="w-9 lg:hidden" />
            <div className="min-w-0 flex-1">
              <Link href="/auction" className="text-[11px] font-bold text-emerald-600">
                ← 경매 목록
              </Link>
              <h1 className={`${PAGE_HEADER_TITLE} mt-1 truncate`}>
                {item?.caseNumber ?? '경매 상세'}
              </h1>
            </div>
          </div>
        </header>

        <div className="px-4 lg:px-6 py-4 max-w-2xl mx-auto">
          {loading && <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />}

          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-sm font-bold text-rose-700">{error}</p>
            </div>
          )}

          {item && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.usageType && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                      {item.usageType}
                    </span>
                  )}
                  {analysis && (
                    <span
                      className={`px-2.5 py-0.5 rounded-lg border text-xs font-black ${merit.bg} ${merit.text} ${merit.border}`}
                    >
                      1차 {meritLabelKo(analysis.meritLabel)}
                    </span>
                  )}
                </div>
                <p className="text-base font-black text-slate-900 leading-snug">{item.address}</p>
                <p className="text-xs font-bold text-slate-500 mt-2">
                  {item.courtName} · {item.caseNumber}
                  {item.itemNumber ? ` · ${item.itemNumber}` : ''}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  매각기일 {formatSaleDate(item.saleDate)} · 유찰 {item.failCount}회
                </p>
              </section>

              {item.linkedReportId ? (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                  <h2 className="text-sm font-black text-emerald-800 mb-2">탐정 정밀 분석 완료</h2>
                  <p className="text-xs text-slate-600 mb-4">
                    공공데이터 수집 + AI 리포트가 이 경매 물건에 연결되어 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/analyze/${makeAnalyzeSlug(item.linkedReportId!)}`)}
                    className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold"
                  >
                    탐정 리포트 보기
                  </button>
                </section>
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-black text-slate-900 mb-2">탐정 정밀 분석</h2>
                  <p className="text-xs text-slate-600 mb-4">
                    실거래·규제·공시 등 공공데이터 기반 리포트로 입찰 판단 근거를 확인하세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(buildAuctionAnalyzeUrl(item.id))}
                    className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
                  >
                    탐정 정밀 분석 시작
                  </button>
                </section>
              )}

              {analysis && (
                <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
                  <h2 className="text-sm font-black text-slate-700 mb-3">Tier1 목록 기반 참고가</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400">최저입찰</p>
                      <p className="text-lg font-black">{formatManwon(item.minPriceMan)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400">감정가</p>
                      <p className="text-lg font-black text-slate-700">{formatManwon(item.appraisalPriceMan)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-slate-200 col-span-2">
                      <p className="text-[10px] font-bold text-slate-500">추천 입찰 상한 (규칙)</p>
                      <p className="text-xl font-black text-slate-800">
                        {formatManwon(analysis.suggestedBidMan)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 mt-4">{analysis.summaryText}</p>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
