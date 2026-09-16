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

export default function AuctionClientPage() {
  const [items, setItems] = useState<AuctionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageFilter, setUsageFilter] = useState<string>('all');

  const loadItems = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '50',
        sort: 'sale_date',
        excludeDuplicateCase: '1',
        scheduledOnly: '1',
      });
      if (usageFilter !== 'all') {
        params.set('usage', usageFilter);
      }

      const res = await fetch(`/api/auction/search?${params.toString()}`, { signal });
      const data = (await res.json()) as AuctionListResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.message || '경매 목록을 불러오지 못했습니다.');
      }

      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError') return;
      setError(e.message || '목록 조회 실패');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [usageFilter]);

  useEffect(() => {
    const controller = new AbortController();
    loadItems(controller.signal);
    return () => controller.abort();
  }, [loadItems]);

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
                Tier1 AI 가격 분석 · 서울중앙지방법원 파일럿
              </p>
            </div>
          </div>
        </header>

        <section className={PAGE_SUBHEADER}>
          <p className={PAGE_SUBHEADER_TITLE}>용도 필터</p>
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
            {loading ? '불러오는 중…' : `총 ${total.toLocaleString('ko-KR')}건 · AI 가격 분석 포함`}
          </p>
        </section>

        <div className="px-4 lg:px-6 py-4 pb-24 max-w-3xl mx-auto lg:max-w-none lg:mx-0">
          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 mb-4">
              <p className="text-sm font-bold text-rose-700">{error}</p>
              <p className="text-[11px] text-rose-600 mt-1">
                백엔드 API 배포 후 다시 시도해 주세요.
              </p>
              <button
                type="button"
                onClick={() => loadItems()}
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
        </div>
      </main>
    </div>
  );
}
