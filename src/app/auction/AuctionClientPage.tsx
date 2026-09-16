'use client';

import { useCallback, useEffect, useState } from 'react';
import SideNav from '../../components/SideNav';
import AuctionCard from '../../components/AuctionCard';
import type { AuctionListItem, AuctionListResponse } from '../../lib/auctionTypes';
import {
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
} from '../../components/analyzePanelFormStyles';

const USAGE_FILTERS = [
  { id: 'all', label: '전체' },
  { id: '아파트', label: '아파트' },
  { id: '오피스텔', label: '빌딩·오피스텔' },
  { id: '대지', label: '토지' },
  { id: '상가', label: '상가' },
] as const;

const PAGE_SIZE = 30;

export default function AuctionClientPage() {
  const [items, setItems] = useState<AuctionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageFilter, setUsageFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean, signal?: AbortSignal) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          page: String(pageNum),
          sort: 'sale_date',
          excludeDuplicateCase: '1',
          scheduledOnly: '1',
        });
        if (usageFilter !== 'all') {
          params.set('usage', usageFilter);
        }
        if (keyword.trim()) {
          params.set('q', keyword.trim());
        }

        const res = await fetch(`/api/auction/search?${params.toString()}`, { signal });
        const data = (await res.json()) as AuctionListResponse;

        if (!res.ok || !data.success) {
          throw new Error(data.message || '경매 목록을 불러오지 못했습니다.');
        }

        const next = data.items ?? [];
        setTotal(data.total ?? 0);
        setPage(pageNum);
        setItems(prev => (append ? [...prev, ...next] : next));
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        if (e.name === 'AbortError') return;
        setError(e.message || '목록 조회 실패');
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [usageFilter, keyword],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchPage(1, false, controller.signal);
    return () => controller.abort();
  }, [fetchPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const hasMore = items.length < total;

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative font-noto-sans-kr antialiased">
      <div className="noise-overlay" />
      <SideNav />

      <main className="lg:pl-16 min-h-screen">
        <header className={PAGE_STICKY_HEADER}>
          <div className="flex items-center gap-3">
            <div className="w-9 lg:hidden" />
            <div>
              <h1 className={PAGE_HEADER_TITLE}>경매</h1>
              <p className="text-[11px] font-bold text-slate-500 mt-1">
                탐정 분석 연동 · 서울중앙지방법원 파일럿
              </p>
            </div>
          </div>
        </header>

        <section className={PAGE_SUBHEADER}>
          <p className={PAGE_SUBHEADER_TITLE}>검색</p>
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="주소·사건번호·지역명"
            className="mt-2 w-full max-w-xl rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
          />

          <p className={`${PAGE_SUBHEADER_TITLE} mt-4`}>용도 필터</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {USAGE_FILTERS.map((f) => {
              const active = usageFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setUsageFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-3">
            {loading && !items.length
              ? '불러오는 중…'
              : `총 ${total.toLocaleString('ko-KR')}건 · ${items.length.toLocaleString('ko-KR')}건 표시`}
          </p>
        </section>

        <div className="px-4 lg:px-6 py-4 pb-24 max-w-3xl mx-auto lg:max-w-none lg:mx-0">
          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 mb-4">
              <p className="text-sm font-bold text-rose-700">{error}</p>
              <button
                type="button"
                onClick={() => fetchPage(1, false)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-xs font-bold text-rose-700"
              >
                다시 시도
              </button>
            </div>
          )}

          {loading && !items.length && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p className="font-bold">표시할 경매 물건이 없습니다.</p>
            </div>
          )}

          <div className="space-y-3">
            {items.map((item) => (
              <AuctionCard key={item.id} item={item} />
            ))}
          </div>

          {hasMore && items.length > 0 && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => fetchPage(page + 1, true)}
              className="mt-6 w-full py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingMore ? '불러오는 중…' : `더 보기 (${items.length}/${total})`}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
