'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Phone, X } from 'lucide-react';
import {
  formatManKorean,
  formatMonthlyMan,
  monthlyPaymentCaption,
  rateTypeShort,
  repayMethodLabel,
  REPAY_METHOD_OPTIONS,
  telHref,
  termOptionsForKind,
  termYearsFromMonths,
} from '@/lib/liteLoanApi';
import type {
  LiteLoanFilters,
  LiteLoanKind,
  LiteLoanProduct,
  LiteLoanRateType,
  LiteLoanRepayMethod,
} from '@/lib/liteLoanTypes';

type Theme = 'light' | 'dark';

type Props = {
  open: boolean;
  onClose: () => void;
  theme?: Theme;
  loanKind: LiteLoanKind;
  products: LiteLoanProduct[];
  summary: {
    monthlyPaymentMan: number | null;
    totalInterestMan: number | null;
  } | null;
  loanMan: number | null;
  pyeongLabel?: string | null;
  filters: LiteLoanFilters;
  loading?: boolean;
  onFilterChange: (next: Partial<LiteLoanFilters>) => void;
};

function panelTheme(theme: Theme) {
  if (theme === 'light') {
    return {
      overlay: 'bg-black/40',
      panel: 'bg-white text-slate-900',
      header: 'bg-violet-600 text-white',
      muted: 'text-slate-500',
      card: 'border border-slate-200 bg-white',
      badge: 'bg-violet-50 text-violet-700',
      interest: 'text-violet-600',
      select: 'border-slate-200 bg-white text-slate-800',
    };
  }
  return {
    overlay: 'bg-black/60',
    panel: 'bg-[#121214] text-white',
    header: 'bg-violet-700 text-white',
    muted: 'text-zinc-500',
    card: 'border border-white/10 bg-white/[0.03]',
    badge: 'bg-violet-500/20 text-violet-300',
    interest: 'text-violet-400',
    select: 'border-white/15 bg-white/5 text-white',
  };
}

function ErlyRpaySnippet({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className="text-zinc-500">—</span>;
  const short = text.length > 48 ? `${text.slice(0, 48)}…` : text;
  return (
    <span>
      {expanded ? text : short}
      {text.length > 48 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-1 text-violet-500 font-bold"
        >
          {expanded ? '접기' : '더보기'}
        </button>
      )}
    </span>
  );
}

function ConsultButton({ product }: { product: LiteLoanProduct }) {
  const href = telHref(product.consultPhone);
  const cls = 'w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white';
  if (href) {
    return (
      <a href={href} className={cls} aria-label={`${product.korCoNm} 상담 전화`}>
        <Phone className="w-4 h-4" />
      </a>
    );
  }
  return (
    <button type="button" className={cls} aria-label={`${product.korCoNm} 상담`} disabled>
      <Phone className="w-4 h-4 opacity-50" />
    </button>
  );
}

function LoanProductsSlideOverPanel({
  onClose,
  theme = 'dark',
  loanKind,
  products,
  summary,
  loanMan,
  pyeongLabel,
  filters,
  loading = false,
  onFilterChange,
}: Omit<Props, 'open'>) {
  const t = panelTheme(theme);

  const title = loanKind === 'rent' ? '전세자금대출' : '주택담보대출';
  const termYears = termYearsFromMonths(filters.termMonths);
  const termOptions = termOptionsForKind(loanKind);

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <button
        type="button"
        className={`absolute inset-0 ${t.overlay}`}
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className={`relative w-full sm:max-w-md h-full flex flex-col shadow-2xl ${t.panel}`}
        role="dialog"
        aria-modal
        aria-labelledby="loan-panel-title"
      >
        <div className={`flex items-center justify-between px-4 py-3 ${t.header}`}>
          <h2 id="loan-panel-title" className="font-bold text-base">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-white/10 flex flex-wrap gap-2 text-[11px]">
          {pyeongLabel && (
            <span className={`px-2 py-1 rounded-lg ${t.badge}`}>{pyeongLabel}</span>
          )}
          <select
            value={filters.repayMethod}
            onChange={(e) => onFilterChange({ repayMethod: e.target.value as LiteLoanRepayMethod })}
            className={`rounded-lg px-2 py-1 text-[11px] flex-1 min-w-[120px] ${t.select}`}
          >
            {REPAY_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.shortLabel}</option>
            ))}
          </select>
          <select
            value={filters.termMonths}
            onChange={(e) => onFilterChange({ termMonths: Number(e.target.value) })}
            className={`rounded-lg px-2 py-1 text-[11px] ${t.select}`}
          >
            {termOptions.map((opt) => (
              <option key={opt.months} value={opt.months}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filters.rateType}
            onChange={(e) => onFilterChange({ rateType: e.target.value as LiteLoanRateType })}
            className={`rounded-lg px-2 py-1 text-[11px] ${t.select}`}
          >
            <option value="C">변동</option>
            <option value="F">고정</option>
          </select>
        </div>

        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-sm font-bold flex items-center gap-2">
            월납입금 {formatMonthlyMan(summary?.monthlyPaymentMan)}
            <span className={`text-[10px] font-normal px-2 py-0.5 rounded-full ${t.badge}`}>
              {termYears}년간 · {monthlyPaymentCaption(filters.repayMethod)}
            </span>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-violet-400" />}
          </p>
          <p className={`text-[11px] ${t.muted} mt-1`}>
            대출 {formatManKorean(loanMan)} · 이자총액 {formatManKorean(summary?.totalInterestMan)}
            <span className="opacity-70"> ({repayMethodLabel(filters.repayMethod)})</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
          {products.map((p) => (
            <article key={`${p.finCoNo}-${p.lendRateMin}-${p.lendRateTypeNm}`} className={`rounded-xl p-3 ${t.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm">{p.korCoNm}</p>
                  {p.finPrdtNm && (
                    <p className={`text-[10px] ${t.muted} truncate`}>{p.finPrdtNm}</p>
                  )}
                  <p className="text-2xl font-black mt-1">{p.lendRateMin.toFixed(2)}%</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${t.badge}`}>
                    월{formatMonthlyMan(p.monthlyPaymentMan).replace('만원', '만')}
                  </span>
                  <ConsultButton product={p} />
                </div>
              </div>

              <dl className={`mt-3 space-y-1.5 text-[11px] ${t.muted}`}>
                <div className="flex gap-2">
                  <dt className="shrink-0 w-20">대출한도</dt>
                  <dd className="flex-1">{p.loanLmt || '—'}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 w-20">이자총액</dt>
                  <dd className={`flex-1 font-bold ${t.interest}`}>
                    {formatManKorean(p.totalInterestMan)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 w-20">중도상환</dt>
                  <dd className="flex-1 leading-relaxed">
                    <ErlyRpaySnippet text={p.erlyRpayFee} />
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 w-20">금리유형</dt>
                  <dd>{rateTypeShort(p.lendRateTypeNm)} · {p.rpayTypeNm || repayMethodLabel(filters.repayMethod)}</dd>
                </div>
                {p.consultPhone && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 w-20">상담</dt>
                    <dd>
                      <a href={telHref(p.consultPhone)!} className="text-violet-500 font-bold">
                        {p.consultPhone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </article>
          ))}

          {!loading && products.length === 0 && (
            <p className={`text-center text-sm py-8 ${t.muted}`}>
              선택한 조건의 대출 상품이 없습니다.
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/10 text-center shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <a
            href="mailto:partnership@ddangpago.com?subject=대출%20제휴%20문의"
            className="text-xs text-violet-500 font-bold hover:underline"
          >
            광고 및 제휴 문의
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoanProductsSlideOver(props: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!props.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [props.open]);

  if (!props.open || !mounted) return null;

  return createPortal(
    <LoanProductsSlideOverPanel {...props} />,
    document.body,
  );
}
