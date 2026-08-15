'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { resolveR114LiteAptSeq } from '../lib/r114LiteApi';
import type { R114LiteAnchorTradeInput, R114LiteResolveAptSeqResponse } from '../lib/r114LiteTypes';

type Theme = 'light' | 'dark';

const EMPTY_TRADE: R114LiteAnchorTradeInput = {
  priceMan: '',
  exclusiveAreaM2: '',
  contractYearMonth: '',
};

function themeClasses(theme: Theme) {
  if (theme === 'light') {
    return {
      section: 'bg-amber-50 border-amber-200',
      title: 'text-amber-900',
      muted: 'text-amber-800/70',
      input: 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
      label: 'text-slate-600',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      error: 'text-red-600 bg-red-50 border-red-200',
      success: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    };
  }
  return {
    section: 'bg-amber-500/10 border-amber-500/30',
    title: 'text-amber-200',
    muted: 'text-amber-200/70',
    input: 'bg-white/5 border-white/10 text-white placeholder:text-zinc-500',
    label: 'text-zinc-400',
    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    error: 'text-red-300 bg-red-500/10 border-red-500/30',
    success: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  };
}

function buildDefaultTrades(): R114LiteAnchorTradeInput[] {
  return [EMPTY_TRADE, EMPTY_TRADE, EMPTY_TRADE].map((t) => ({ ...t }));
}

export default function R114LiteAptSeqResolveForm({
  r114PropId,
  defaultTitle,
  defaultAddress,
  theme = 'light',
  successHint,
  onResolved,
}: {
  r114PropId: string;
  defaultTitle: string;
  defaultAddress: string;
  theme?: Theme;
  successHint?: string;
  onResolved: (result: NonNullable<R114LiteResolveAptSeqResponse['data']>) => void;
}) {
  const t = themeClasses(theme);
  const [portalTitle, setPortalTitle] = useState(defaultTitle);
  const [portalAddress, setPortalAddress] = useState(defaultAddress);
  const [anchorTrades, setAnchorTrades] = useState(buildDefaultTrades);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPortalTitle(defaultTitle);
    setPortalAddress(defaultAddress);
    setAnchorTrades(buildDefaultTrades());
    setError(null);
    setSuccess(null);
  }, [r114PropId, defaultTitle, defaultAddress]);

  const updateTrade = useCallback((index: number, patch: Partial<R114LiteAnchorTradeInput>) => {
    setAnchorTrades((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        portalTitle: portalTitle.trim(),
        portalAddress: portalAddress.trim(),
        anchorTrades: anchorTrades.map((row) => ({
          priceMan: Number(row.priceMan),
          exclusiveAreaM2: Number(row.exclusiveAreaM2),
          contractYearMonth: row.contractYearMonth.trim(),
        })),
      };

      const res = await resolveR114LiteAptSeq(r114PropId, payload);
      if (!res.success || !res.data) {
        setError(res.message || '단지 확인에 실패했습니다.');
        return;
      }

      setSuccess(
        res.alreadyVerified
          ? '이미 확인된 단지입니다.'
          : (successHint || '단지 확인이 완료되었습니다. AI 분석을 진행할 수 있습니다.'),
      );
      onResolved(res.data);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [anchorTrades, onResolved, portalAddress, portalTitle, r114PropId, successHint]);

  return (
    <section className={`rounded-2xl border p-4 space-y-4 ${t.section}`}>
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <h2 className={`text-sm font-black ${t.title}`}>아파트 단지 확인이 필요합니다</h2>
          <p className={`text-[11px] mt-1 leading-relaxed ${t.muted}`}>
            AI 분석 전, 네이버·호갱노노에 표시된 단지명·주소와 참고 실거래 3건을 입력해 주세요.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div>
          <label className={`block text-[11px] font-bold mb-1 ${t.label}`}>단지명 (네이버·호갱노노)</label>
          <input
            type="text"
            value={portalTitle}
            onChange={(e) => setPortalTitle(e.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm ${t.input}`}
            placeholder="예: 래미안대치팰리스"
            required
          />
        </div>

        <div>
          <label className={`block text-[11px] font-bold mb-1 ${t.label}`}>주소 (네이버·호갱노노)</label>
          <input
            type="text"
            value={portalAddress}
            onChange={(e) => setPortalAddress(e.target.value)}
            className={`w-full rounded-xl border px-3 py-2 text-sm ${t.input}`}
            placeholder="예: 서울특별시 강남구 대치동 123"
            required
          />
        </div>

        <div className="space-y-2">
          <p className={`text-[11px] font-bold ${t.label}`}>참고 실거래 3건 (매매)</p>
          {anchorTrades.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={row.contractYearMonth}
                onChange={(e) => updateTrade(i, { contractYearMonth: e.target.value })}
                className={`rounded-lg border px-2 py-2 text-xs ${t.input}`}
                placeholder="2025-01"
                required
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={row.exclusiveAreaM2}
                onChange={(e) => updateTrade(i, { exclusiveAreaM2: e.target.value === '' ? '' : Number(e.target.value) })}
                className={`rounded-lg border px-2 py-2 text-xs ${t.input}`}
                placeholder="전용㎡"
                required
              />
              <input
                type="number"
                step="1"
                min="0"
                value={row.priceMan}
                onChange={(e) => updateTrade(i, { priceMan: e.target.value === '' ? '' : Number(e.target.value) })}
                className={`rounded-lg border px-2 py-2 text-xs ${t.input}`}
                placeholder="매매가(만원)"
                required
              />
            </div>
          ))}
          <p className={`text-[10px] ${t.muted}`}>계약년월 · 전용㎡ · 매매가(만원)</p>
        </div>

        {error && (
          <p className={`text-xs rounded-xl border px-3 py-2 ${t.error}`}>{error}</p>
        )}
        {success && (
          <p className={`text-xs rounded-xl border px-3 py-2 flex items-center gap-1.5 ${t.success}`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${t.btn}`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              확인 중…
            </>
          ) : (
            '단지 확인하기'
          )}
        </button>
      </form>
    </section>
  );
}
