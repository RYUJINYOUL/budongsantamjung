'use client';

import { useEffect, useRef, useState } from 'react';
import type { AuctionListItem, AuctionListResponse } from '../lib/auctionTypes';
import { formatManwon, formatSaleDate } from '../lib/formatAuctionPrice';
import { PANEL_CARD, PANEL_SECTION_DESC, PANEL_SECTION_LABEL } from './analyzePanelFormStyles';

const USAGE_FILTERS = [
  { id: 'all', label: '전체' },
  { id: '아파트', label: '아파트' },
  { id: '오피스텔', label: '빌딩' },
  { id: '대지', label: '토지' },
  { id: '상가', label: '상가' },
] as const;

export interface AuctionPickerPanelProps {
  selectedId: number | null;
  onSelect: (item: AuctionListItem) => void;
}

export default function AuctionPickerPanel({ selectedId, onSelect }: AuctionPickerPanelProps) {
  const [items, setItems] = useState<AuctionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageFilter, setUsageFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [listExpanded, setListExpanded] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const selectedItem = selectedId != null ? items.find((i) => i.id === selectedId) : null;

  useEffect(() => {
    if (selectedId != null) {
      setListExpanded(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (selectedId != null && !listExpanded) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: '40',
          sort: 'sale_date',
          excludeDuplicateCase: '1',
          scheduledOnly: '1',
        });
        if (usageFilter !== 'all') params.set('usage', usageFilter);
        if (keyword.trim()) params.set('q', keyword.trim());

        const res = await fetch(`/api/auction/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as AuctionListResponse;
        if (cancelled) return;
        if (!res.ok || !data.success) {
          throw new Error(data.message || '경매 목록을 불러오지 못했습니다.');
        }
        setItems(data.items ?? []);
        hasLoadedOnceRef.current = true;
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { name?: string; message?: string };
        if (e.name === 'AbortError') return;
        setError(e.message || '목록 조회 실패');
        if (!hasLoadedOnceRef.current) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = window.setTimeout(run, keyword.trim() ? 300 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [usageFilter, keyword, selectedId, listExpanded]);

  return (
    <section className={PANEL_CARD}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className={PANEL_SECTION_LABEL}>경매 물건</p>
          <p className={PANEL_SECTION_DESC}>서울중앙지방법원 · 목록에서 1건 선택</p>
        </div>
        {selectedId != null && (
          <button
            type="button"
            onClick={() => setListExpanded((v) => !v)}
            className="shrink-0 text-[11px] font-bold text-emerald-600 px-2 py-1 rounded-lg bg-emerald-50"
          >
            {listExpanded ? '접기' : '다른 물건'}
          </button>
        )}
      </div>

      {selectedItem && !listExpanded && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 mb-2">
          <p className="text-[11px] font-bold text-slate-500">
            {selectedItem.usageType} · {selectedItem.caseNumber}
          </p>
          <p className="text-xs font-extrabold text-slate-900 mt-0.5 line-clamp-2">
            {selectedItem.address}
          </p>
          <p className="text-[10px] font-bold text-emerald-700 mt-1">선택됨 · 아래에서 분석 진행</p>
        </div>
      )}

      {(listExpanded || selectedId == null) && (
        <>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="사건번호·주소 검색"
            className="w-full mb-3 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 placeholder:text-slate-400"
          />

          <div className="flex flex-wrap gap-1.5 mb-3">
            {USAGE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setUsageFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  usageFilter === f.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 mb-2">{error}</p>
          )}

          <div className="max-h-64 overflow-y-auto space-y-2 pr-0.5">
            {loading && items.length === 0 && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && items.length === 0 && (
              <p className="text-xs font-bold text-slate-500 py-6 text-center">물건이 없습니다.</p>
            )}

            {items.map((item) => {
              const active = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectRef.current(item)}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    active
                      ? 'border-emerald-400 bg-emerald-50/60 shadow-sm'
                      : 'border-slate-100 bg-white hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-500">
                        {item.usageType} · {item.caseNumber}
                        {item.linkedReportId ? ' · 분석완료' : ''}
                      </p>
                      <p className="text-xs font-extrabold text-slate-900 line-clamp-2 mt-0.5">
                        {item.address || '주소 미상'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        최저 {formatManwon(item.minPriceMan)} · {formatSaleDate(item.saleDate)}
                      </p>
                    </div>
                    {active && (
                      <span className="shrink-0 text-[10px] font-black text-emerald-700">선택</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
