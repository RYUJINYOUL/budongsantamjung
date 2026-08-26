'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  formatBudgetManLabel,
  submitListingRequest,
  type ListingRequestContext,
} from '../lib/listingRequest';

const MOVE_IN_OPTIONS = [
  '즉시',
  '3개월 이내',
  '6개월 이내',
  '1년 이내',
  '2년 이후',
  '미정',
];

type Props = {
  open: boolean;
  onClose: () => void;
  context: ListingRequestContext;
  title?: string;
};

export default function ListingRequestSheet({ open, onClose, context, title }: Props) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);
  const [pyeong, setPyeong] = useState('');
  const [budgetMan, setBudgetMan] = useState('');
  const [moveIn, setMoveIn] = useState('6개월 이내');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPyeong = context.showPyeong !== false && context.category === 'apartment';
  const showMoveIn = context.showMoveIn !== false && context.category === 'apartment';

  useEffect(() => {
    if (!open) return;
    setPyeong(context.defaultPyeong != null ? String(context.defaultPyeong) : '');
    setBudgetMan(context.defaultBudgetMan != null ? String(context.defaultBudgetMan) : '');
    setMoveIn('6개월 이내');
    setName('');
    setPhone('');
    setDone(false);
    setError(null);
  }, [open, context]);

  if (!open) return null;

  const heading = title
    ?? (context.category === 'apartment'
      ? '일단 이 집, 매물 구해드릴까요?'
      : '이 매물 구해드릴까요?');

  const handleSubmit = async () => {
    if (!user) {
      setError('로그인 후 이용할 수 있습니다.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const result = await submitListingRequest(token, {
        category: context.category,
        sourceType: context.sourceType,
        sourceId: context.sourceId ?? undefined,
        complexName: context.complexName ?? undefined,
        address: context.address ?? undefined,
        pyeongApprox: showPyeong && pyeong ? Number(pyeong) : undefined,
        budgetMan: budgetMan ? Number(budgetMan) : undefined,
        moveInTiming: showMoveIn ? moveIn : undefined,
        contactName: name.trim(),
        contactPhone: phone.trim(),
        prefilledPriceMan: context.defaultBudgetMan ?? undefined,
      });
      if (!result.success) {
        setError(result.error || '의뢰 접수에 실패했습니다.');
        return;
      }
      setDone(true);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3 rounded-t-3xl">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">매물 소싱</p>
            <h3 className="text-base font-black text-slate-900 mt-0.5">{heading}</h3>
            {context.complexName && (
              <p className="text-xs text-slate-500 font-semibold mt-1 truncate">{context.complexName}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {done ? (
            <div className="py-8 text-center">
              <p className="text-lg font-black text-slate-900">접수 완료</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                담당자가 조건에 맞는 매물을 검토한 뒤 연락드릴게요.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold text-sm"
              >
                확인
              </button>
            </div>
          ) : (
            <>
              {context.referencePriceHint && (
                <p className="text-[11px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  {context.referencePriceHint}
                </p>
              )}

              {showPyeong && (
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">희망 평형 (평)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={pyeong}
                    onChange={(e) => setPyeong(e.target.value)}
                    placeholder="예: 34"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-xs font-bold text-slate-700">희망 매매가 (만원)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={budgetMan}
                  onChange={(e) => setBudgetMan(e.target.value)}
                  placeholder={context.defaultBudgetMan
                    ? `예: ${context.defaultBudgetMan.toLocaleString()} (${formatBudgetManLabel(context.defaultBudgetMan)})`
                    : '예: 85000 (8.5억)'}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                />
              </label>

              {showMoveIn && (
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">입주 시기</span>
                  <select
                    value={moveIn}
                    onChange={(e) => setMoveIn(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold bg-white"
                  >
                    {MOVE_IN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="text-xs font-bold text-slate-700">성함</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-700">휴대폰 번호</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                />
              </label>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                입력하신 연락처는 매물 소싱 상담 목적으로만 사용됩니다.
              </p>

              {error && (
                <p className="text-xs font-bold text-rose-600 text-center">{error}</p>
              )}

              <button
                type="button"
                disabled={submitting || !name.trim() || !phone.trim()}
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-emerald-500/20"
              >
                {submitting ? '접수 중…' : '의뢰하기'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** CTA 버튼 */
export function ListingRequestTrigger({
  label,
  onClick,
  className = '',
  variant = 'primary',
}: {
  label: string;
  onClick: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'dark';
}) {
  const base = 'w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-[0.99]';
  const styles = variant === 'dark'
    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
    : variant === 'secondary'
      ? 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20';
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles} ${className}`}>
      {label}
    </button>
  );
}
