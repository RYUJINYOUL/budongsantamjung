'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import {
  fetchApartmentAreas,
  formatAreaLabel,
  formatAreaTradeSubtitle,
  pickDefaultAreaIndex,
  resolveAptKeyForAreas,
  type ApartmentAreaOption,
} from '../lib/apartmentCompareAreas';
import { addToCompareBasket, updateCompareBasketItemArea } from '../lib/apartmentCompareBasket';

import { fetchR114LiteAreaOptions } from '../lib/r114LiteApi';

export type ApartmentComparePickPayload = {
  masterId?: string;
  rtmsAptSeq?: string;
  r114PropId?: string;
  complexName?: string;
  /** 리포트·카드·비교함에 있던 면적 (모달 기본 선택용) */
  suggestedAreaM2?: number | null;
  /** 있으면 담기 대신 해당 비교함 항목 평형 변경 */
  editBasketKey?: string;
};

type Props = {
  pending: ApartmentComparePickPayload | null;
  onClose: () => void;
  onAdded?: (message: string) => void;
  onError?: (message: string) => void;
};

export default function ApartmentAreaPickModal({
  pending,
  onClose,
  onAdded,
  onError,
}: Props) {
  const open = pending != null;
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [areas, setAreas] = useState<ApartmentAreaOption[]>([]);
  const [resolvedMeta, setResolvedMeta] = useState<{
    rtmsAptSeq?: string | null;
    masterId?: string | null;
    complexName?: string | null;
  }>({});
  const [selectedIdx, setSelectedIdx] = useState(0);

  const loadAreas = useCallback(async () => {
    if (!pending) return;

    if (pending.r114PropId) {
      setLoading(true);
      setFetchError(null);
      try {
        const data = await fetchR114LiteAreaOptions(pending.r114PropId);
        const list = data.areas || [];
        setAreas(list);
        setResolvedMeta({
          rtmsAptSeq: data.rtmsAptSeq ?? pending.rtmsAptSeq,
          masterId: pending.masterId,
          complexName: data.complexName ?? pending.complexName,
        });
        if (data.error && list.length === 0) {
          setFetchError(data.error);
        } else {
          setFetchError(null);
        }
        setSelectedIdx(pickDefaultAreaIndex(list, pending.suggestedAreaM2));
      } catch {
        setFetchError('평형 목록을 불러오지 못했습니다.');
        setAreas([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    const aptKey = resolveAptKeyForAreas(pending);
    if (!aptKey) {
      setFetchError('단지 코드가 없어 평형을 조회할 수 없습니다.');
      setAreas([]);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchApartmentAreas(aptKey);
      const list = data.areas || [];
      setAreas(list);
      setResolvedMeta({
        rtmsAptSeq: data.rtmsAptSeq ?? pending.rtmsAptSeq,
        masterId: data.masterId ?? pending.masterId,
        complexName: data.complexName ?? pending.complexName,
      });
      if (data.error && list.length === 0) {
        setFetchError(data.error);
      } else {
        setFetchError(null);
      }
      setSelectedIdx(pickDefaultAreaIndex(list, pending.suggestedAreaM2));
    } catch {
      setFetchError('평형 목록을 불러오지 못했습니다.');
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, [pending]);

  useEffect(() => {
    if (open) {
      loadAreas();
    } else {
      setAreas([]);
      setFetchError(null);
      setSelectedIdx(0);
    }
  }, [open, loadAreas]);

  const titleName =
    resolvedMeta.complexName || pending?.complexName || '아파트 단지';

  const isEditMode = !!pending?.editBasketKey;

  const confirmWithArea = (exclusiveAreaM2: number) => {
    if (!pending) return;
    const meta = {
      masterId: resolvedMeta.masterId || pending.masterId,
      rtmsAptSeq: resolvedMeta.rtmsAptSeq || pending.rtmsAptSeq,
      r114PropId: pending.r114PropId,
      exclusiveAreaM2,
      complexName: titleName,
    };

    if (isEditMode && pending.editBasketKey) {
      const result = updateCompareBasketItemArea(pending.editBasketKey, exclusiveAreaM2, meta);
      if (result.ok) {
        onAdded?.('평형을 변경했습니다.');
        onClose();
      } else {
        onError?.('error' in result ? result.error : '오류');
      }
      return;
    }

    const result = addToCompareBasket(meta);
    if (result.ok) {
      onAdded?.('비교함에 담았습니다.');
      onClose();
    } else {
      onError?.('error' in result ? result.error : '오류');
    }
  };

  const handleConfirm = () => {
    if (areas.length > 0) {
      confirmWithArea(areas[selectedIdx].exclusiveAreaM2);
      return;
    }
    const suggested = pending?.suggestedAreaM2;
    if (suggested != null && Number.isFinite(suggested) && suggested > 0) {
      confirmWithArea(suggested);
      return;
    }
    onError?.('선택할 평형이 없습니다.');
  };

  if (!open || typeof document === 'undefined') return null;

  const canConfirm =
    areas.length > 0
    || (pending?.suggestedAreaM2 != null
      && Number(pending.suggestedAreaM2) > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="area-pick-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
              {isEditMode ? '비교함 · 평형 변경' : '비교함 · 평형 선택'}
            </p>
            <h2 id="area-pick-title" className="text-base font-black text-slate-900 truncate">
              {titleName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {pending?.r114PropId
                ? '공급 · 전용 · 평형 (r114 기준)'
                : '최근 6개월 실거래 기준 전용면적'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[min(50vh,320px)] overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
              <p className="text-sm font-bold">평형 불러오는 중…</p>
            </div>
          )}

          {!loading && areas.length > 0 && (
            <ul className="space-y-2">
              {areas.map((a, idx) => {
                const selected = idx === selectedIdx;
                return (
                  <li key={`${a.exclusiveAreaM2}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={[
                        'w-full text-left px-4 py-3 rounded-xl border transition-all',
                        selected
                          ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          {formatAreaLabel(a.exclusiveAreaM2, {
                            supplyM2: a.supplyAreaM2,
                            pyeongApprox: a.pyeongApprox,
                          })}
                        </span>
                        {selected && (
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg">
                            선택
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        {formatAreaTradeSubtitle(a)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && areas.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm font-bold text-slate-700 mb-1">
                등록된 평형이 없습니다
              </p>
              {fetchError && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                  {fetchError}
                </p>
              )}
              {pending?.suggestedAreaM2 != null && pending.suggestedAreaM2 > 0 ? (
                <p className="text-xs text-slate-500 mt-3">
                  {isEditMode ? '현재' : '리포트'} 평형{' '}
                  <span className="font-bold text-slate-800">
                    {formatAreaLabel(Number(pending.suggestedAreaM2))}
                  </span>
                  {isEditMode ? ' 기준으로 선택할 수 있습니다.' : ' 으로 담을 수 있습니다.'}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-2">
                  RTMS 미연동 단지이거나 최근 거래가 없을 수 있습니다.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canConfirm || loading}
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-slate-900 font-black text-sm"
          >
            {isEditMode ? '적용' : '비교함에 담기'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
