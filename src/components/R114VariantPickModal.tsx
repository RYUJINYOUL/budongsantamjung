'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Loader2, X } from 'lucide-react';
import { fetchR114ComplexVariants } from '../lib/r114LiteApi';
import type { R114LiteVariantItem } from '../lib/r114LiteTypes';

export type R114VariantPickContext = {
  anchorPropId: string;
  propertyTitle?: string | null;
  coords?: { lat: number; lng: number } | null;
  latestReportId?: string | null;
};

type Props = {
  pending: R114VariantPickContext | null;
  onClose: () => void;
  onSelect: (variant: R114LiteVariantItem, ctx: R114VariantPickContext) => void;
};

function formatPriceHint(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '시세 —';
  if (man >= 10000) {
    const eok = Math.round((man / 10000) * 10) / 10;
    return `~${eok}억`;
  }
  return `~${Math.round(man).toLocaleString('ko-KR')}만`;
}

function formatPyeongHint(v: R114LiteVariantItem): string {
  if (v.pyeongApprox != null && v.pyeongApprox > 0) return `${v.pyeongApprox}평`;
  if (v.exclusiveAreaM2 != null && v.exclusiveAreaM2 > 0) {
    return `${Math.round(v.exclusiveAreaM2 / 3.3058)}평`;
  }
  return '—';
}

function roleBadgeClass(role: R114LiteVariantItem['variantRole']): string {
  if (role === 'officetel') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (role === 'apartment') return 'bg-sky-100 text-sky-800 border-sky-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function R114VariantPickModal({ pending, onClose, onSelect }: Props) {
  const open = pending != null;
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [variants, setVariants] = useState<R114LiteVariantItem[]>([]);
  const [metaTitle, setMetaTitle] = useState<string>('');

  const loadVariants = useCallback(async () => {
    if (!pending) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetchR114ComplexVariants(pending.anchorPropId);
      if (!res.success || !res.data?.variants?.length) {
        setFetchError(res.message || '단지 목록을 불러오지 못했습니다.');
        setVariants([]);
        return;
      }
      setMetaTitle(res.data.title || pending.propertyTitle || '');
      setVariants(res.data.variants);
      if (res.data.variantCount <= 1) {
        onSelect(res.data.variants[0], pending);
      }
    } catch {
      setFetchError('단지 목록을 불러오지 못했습니다.');
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }, [pending, onSelect]);

  useEffect(() => {
    if (!open) {
      setVariants([]);
      setFetchError(null);
      return;
    }
    void loadVariants();
  }, [open, loadVariants]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="r114-variant-pick-title"
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase">2개 단지</p>
            <h2 id="r114-variant-pick-title" className="text-lg font-black text-slate-900 leading-tight mt-0.5">
              {metaTitle || pending?.propertyTitle || '단지 선택'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">같은 주소에 등록된 단지 유형을 선택해 주세요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-2 max-h-[min(60vh,420px)] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <span className="text-sm font-medium">단지 불러오는 중…</span>
            </div>
          )}

          {!loading && fetchError && (
            <div className="text-center py-10 px-4">
              <p className="text-sm font-medium text-slate-600">{fetchError}</p>
              <button
                type="button"
                onClick={() => void loadVariants()}
                className="mt-3 text-sm font-bold text-emerald-600 hover:underline"
              >
                다시 시도
              </button>
            </div>
          )}

          {!loading && !fetchError && variants.map((v) => (
            <button
              key={v.r114PropId}
              type="button"
              onClick={() => pending && onSelect(v, pending)}
              className="w-full text-left rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.99] transition-all p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${roleBadgeClass(v.variantRole)}`}>
                    {v.variantRoleLabel}
                  </span>
                  {v.isDefault && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      기본
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900 truncate mt-1">{v.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatPyeongHint(v)}
                  {' · '}
                  {formatPriceHint(v.avgPrice1m)}
                  {v.householdCount != null ? ` · ${v.householdCount.toLocaleString('ko-KR')}세대` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
