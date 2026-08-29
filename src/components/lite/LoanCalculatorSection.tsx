'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Loader2, Phone } from 'lucide-react';
import {
  defaultRepayMethodForKind,
  defaultTermMonthsForKind,
  fetchR114LiteLoanCalculator,
  formatManKorean,
  formatMaxLoanHint,
  formatMonthlyMan,
  monthlyPaymentCaption,
  rateTypeShort,
  repayMethodDescription,
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
import LoanProductsSlideOver from './LoanProductsSlideOver';

const NAVER_PAY_MORTGAGE_URL = 'https://bridge.pay.naver.com/loan/mortgage-preview';

type Theme = 'light' | 'dark';

type Props = {
  r114PropId: string;
  loanKind: LiteLoanKind;
  basisMan: number | null | undefined;
  pyeongLabel?: string | null;
  theme?: Theme;
};

function sectionTheme(theme: Theme) {
  if (theme === 'light') {
    return {
      wrap: 'bg-white border border-slate-200',
      muted: 'text-slate-500',
      text: 'text-slate-900',
      accent: 'text-violet-600',
      loan: 'text-emerald-600',
      sliderTrack: 'bg-slate-200',
      card: 'bg-slate-50 border border-slate-200',
      link: 'text-violet-600 hover:text-violet-700',
      badge: 'bg-slate-100 text-slate-600',
      select: 'border-slate-200 bg-white text-slate-800',
    };
  }
  return {
    wrap: 'bg-white/[0.02] border border-white/10',
    muted: 'text-zinc-500',
    text: 'text-white',
    accent: 'text-violet-400',
    loan: 'text-emerald-400',
    sliderTrack: 'bg-white/10',
    card: 'bg-white/[0.04] border border-white/10',
    link: 'text-violet-400 hover:text-violet-300',
    badge: 'bg-white/10 text-zinc-400',
    select: 'border-white/15 bg-white/5 text-white',
  };
}

const LOAN_RANGE_INPUT_CLASS =
  'absolute w-[calc(100%-0.5rem)] left-1 h-10 pointer-events-auto bg-transparent appearance-none cursor-pointer touch-none ' +
  '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 ' +
  '[&::-webkit-slider-thumb]:border-violet-500 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:mt-[-5px] ' +
  '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent ' +
  '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-violet-500 [&::-moz-range-thumb]:bg-white ' +
  '[&::-moz-range-thumb]:shadow-sm ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

function LoanEquityRangeSlider({
  minEquityPct,
  equityPct,
  loanPctVisual,
  trackClass,
  disabled,
  onEquityChange,
  onCommit,
}: {
  minEquityPct: number;
  equityPct: number;
  loanPctVisual: number;
  trackClass: string;
  disabled?: boolean;
  onEquityChange: (equityPct: number) => void;
  onCommit: (equityPct: number) => void;
}) {
  const handleChange = (raw: string) => {
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    onEquityChange(Math.min(100, Math.max(minEquityPct, next)));
  };

  return (
    <div className="relative h-10 flex items-center px-1 touch-none">
      <div
        className={`absolute left-1 right-1 top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none ${trackClass}`}
        aria-hidden
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-violet-500/80 pointer-events-none"
        aria-hidden
        style={{
          left: '0.25rem',
          width: `calc((100% - 0.5rem) * ${Math.min(100, Math.max(0, equityPct)) / 100})`,
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-emerald-500/80 pointer-events-none"
        aria-hidden
        style={{
          left: `calc(0.25rem + (100% - 0.5rem) * ${Math.min(100, Math.max(0, equityPct)) / 100})`,
          width: `calc((100% - 0.5rem) * ${Math.min(100, Math.max(0, loanPctVisual)) / 100})`,
        }}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={0.05}
        value={equityPct}
        disabled={disabled}
        aria-label="자본금·대출 비율"
        aria-valuemin={minEquityPct}
        aria-valuemax={100}
        aria-valuenow={equityPct}
        className={LOAN_RANGE_INPUT_CLASS}
        onChange={(e) => handleChange(e.target.value)}
        onPointerUp={(e) => onCommit(Math.min(100, Math.max(minEquityPct, Number((e.target as HTMLInputElement).value))))}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onCommit(Math.min(100, Math.max(minEquityPct, Number((e.target as HTMLInputElement).value))));
          }
        }}
      />
    </div>
  );
}

function buildDefaultFilters(loanKind: LiteLoanKind): LiteLoanFilters {
  return {
    repayMethod: defaultRepayMethodForKind(loanKind),
    rateType: 'C',
    termMonths: defaultTermMonthsForKind(loanKind),
  };
}

export default function LoanCalculatorSection({
  r114PropId,
  loanKind,
  basisMan,
  pyeongLabel,
  theme = 'dark',
}: Props) {
  const t = sectionTheme(theme);
  const [firstTimeBuyer, setFirstTimeBuyer] = useState(true);
  const [filters, setFilters] = useState<LiteLoanFilters>(() => buildDefaultFilters(loanKind));
  const [loanMan, setLoanMan] = useState<number | null>(null);
  const [maxLoanMan, setMaxLoanMan] = useState<number | null>(null);
  const [ltvPercent, setLtvPercent] = useState<number | null>(null);
  const [loanCapMan, setLoanCapMan] = useState<number | null>(null);
  const [best, setBest] = useState<LiteLoanProduct | null>(null);
  const [products, setProducts] = useState<LiteLoanProduct[]>([]);
  const [summary, setSummary] = useState<{
    monthlyPaymentMan: number | null;
    totalInterestMan: number | null;
  } | null>(null);
  const [asOfLabel, setAsOfLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slideOpen, setSlideOpen] = useState(false);
  const [fssError, setFssError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const priceMan = basisMan != null && basisMan > 0 ? Math.round(basisMan) : null;
  const isRent = loanKind === 'rent';

  /** 자본금 = 기준가 − 대출 (항상 연동) */
  const equityMan = useMemo(() => {
    if (!priceMan || loanMan == null) return null;
    return Math.max(0, priceMan - loanMan);
  }, [loanMan, priceMan]);
  const termYears = termYearsFromMonths(filters.termMonths);
  const termOptions = termOptionsForKind(loanKind);

  useEffect(() => {
    setFilters(buildDefaultFilters(loanKind));
  }, [loanKind]);

  useEffect(() => {
    requestIdRef.current += 1;
    setLoanMan(null);
    setMaxLoanMan(null);
    setSummary(null);
    setBest(null);
    setProducts([]);
  }, [priceMan, pyeongLabel, r114PropId, loanKind]);

  const loadCalculator = useCallback(async (opts?: {
    overrideLoanMan?: number | null;
    overrideFilters?: Partial<LiteLoanFilters>;
  }) => {
    if (!priceMan) return;
    const reqId = ++requestIdRef.current;
    const capturedPrice = priceMan;
    const activeFilters = { ...filters, ...opts?.overrideFilters };
    setLoading(true);
    setFssError(null);
    try {
      const res = await fetchR114LiteLoanCalculator(r114PropId, {
        loanKind,
        purchasePriceMan: !isRent ? capturedPrice : undefined,
        jeonseDepositMan: isRent ? capturedPrice : undefined,
        loanMan: opts?.overrideLoanMan ?? undefined,
        firstTimeBuyer: isRent ? undefined : firstTimeBuyer,
        repayMethod: activeFilters.repayMethod,
        rateType: activeFilters.rateType,
        termMonths: activeFilters.termMonths,
      });
      if (reqId !== requestIdRef.current) return;
      if (!res.success || !res.data) {
        setFssError(res.message || '대출 정보를 불러오지 못했습니다.');
        return;
      }
      const { context, meta, summary: sm, best: b, products: list } = res.data;
      const responsePrice = context.purchasePriceMan ?? context.jeonseDepositMan;
      if (responsePrice != null && Math.round(responsePrice) !== capturedPrice) return;

      setMaxLoanMan(context.maxLoanMan);
      setLtvPercent(context.ltvPercent);
      setLoanCapMan(context.loanCapMan);
      setLoanMan(context.loanMan);
      setBest(b);
      setProducts(list);
      if (meta.termMonths) {
        setFilters((prev) =>
          prev.termMonths === meta.termMonths ? prev : { ...prev, termMonths: meta.termMonths! },
        );
      }
      setSummary(
        sm
          ? { monthlyPaymentMan: sm.monthlyPaymentMan, totalInterestMan: sm.totalInterestMan }
          : null,
      );
      setAsOfLabel(meta.asOfLabel ?? null);
      if (meta.fssError) setFssError(meta.fssError);
    } catch {
      if (reqId !== requestIdRef.current) return;
      setFssError('네트워크 오류가 발생했습니다.');
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters, firstTimeBuyer, isRent, loanKind, priceMan, r114PropId]);

  useEffect(() => {
    void loadCalculator();
  }, [loadCalculator]);

  /** 슬라이더 — 매매가 대비 자본금·대출 비율 (maxLoan 한도 내, 필터 시트와 동일 native range) */
  const minEquityPct = useMemo(() => {
    if (!priceMan || !maxLoanMan || priceMan <= 0) return 0;
    return Math.max(0, ((priceMan - maxLoanMan) / priceMan) * 100);
  }, [maxLoanMan, priceMan]);

  const equityPct = useMemo(() => {
    if (!priceMan || loanMan == null) return 100;
    const pct = ((priceMan - loanMan) / priceMan) * 100;
    return Math.min(100, Math.max(minEquityPct, pct));
  }, [loanMan, minEquityPct, priceMan]);

  const loanPctVisual = useMemo(() => {
    if (!priceMan || loanMan == null || priceMan <= 0) return 0;
    return Math.min(100, Math.max(0, (loanMan / priceMan) * 100));
  }, [loanMan, priceMan]);

  const applyEquityFromSlider = useCallback((nextEquityPct: number, commit: boolean) => {
    if (!priceMan || maxLoanMan == null) return;
    const clampedEquity = Math.min(100, Math.max(minEquityPct, nextEquityPct));
    const rawLoan = (priceMan * (100 - clampedEquity)) / 100;
    const nextLoan = Math.round(Math.min(maxLoanMan, Math.max(0, rawLoan)) / 100) * 100;
    setLoanMan(nextLoan);
    if (commit) void loadCalculator({ overrideLoanMan: nextLoan });
  }, [loadCalculator, maxLoanMan, minEquityPct, priceMan]);

  const handleFilterChange = (next: Partial<LiteLoanFilters>) => {
    const merged = { ...filters, ...next };
    setFilters(merged);
    void loadCalculator({ overrideFilters: merged });
  };

  if (!priceMan) return null;

  const loanPctOfPrice = priceMan > 0 && loanMan
    ? Math.round((loanMan / priceMan) * 100)
    : 0;

  const equityLabel = isRent ? '자기부담' : '자본금';
  const basisLabel = isRent ? '전세보증금' : '매매가';
  const maxLoanHint = !isRent
    ? formatMaxLoanHint(maxLoanMan, ltvPercent, loanCapMan)
    : null;

  return (
    <>
      <section className={`rounded-2xl p-4 ${t.wrap}`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className={`text-sm font-bold ${t.text}`}>
              {isRent ? '전세자금 대출계산기' : '대출계산기'}
            </h2>
            <p className={`text-[11px] ${t.muted} mt-0.5`}>
              금융감독원 최저금리 기준
              {asOfLabel ? ` · ${asOfLabel}` : ''}
            </p>
          </div>
          {!isRent && (
            <label className={`flex items-center gap-1.5 text-[11px] shrink-0 cursor-pointer ${t.muted}`}>
              <input
                type="checkbox"
                checked={firstTimeBuyer}
                onChange={(e) => {
                  setFirstTimeBuyer(e.target.checked);
                }}
                className="rounded border-white/20"
              />
              생애최초
            </label>
          )}
        </div>

        {pyeongLabel ? (
          <p className={`text-[10px] ${t.muted} mb-2`}>
            기준 {basisLabel} {formatManKorean(priceMan)} · {pyeongLabel}
          </p>
        ) : (
          <p className={`text-[10px] ${t.muted} mb-2`}>
            기준 {basisLabel} {formatManKorean(priceMan)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
          <select
            value={filters.repayMethod}
            onChange={(e) => handleFilterChange({ repayMethod: e.target.value as LiteLoanRepayMethod })}
            className={`rounded-lg px-2 py-1.5 border flex-1 min-w-[140px] ${t.select}`}
          >
            {REPAY_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`${t.muted} font-medium`}>대출기간</span>
            <select
              value={filters.termMonths}
              onChange={(e) => handleFilterChange({ termMonths: Number(e.target.value) })}
              className={`rounded-lg px-2 py-1.5 border ${t.select}`}
            >
              {termOptions.map((opt) => (
                <option key={opt.months} value={opt.months}>{opt.label}</option>
              ))}
            </select>
          </div>
          <select
            value={filters.rateType}
            onChange={(e) => handleFilterChange({ rateType: e.target.value as LiteLoanRateType })}
            className={`rounded-lg px-2 py-1.5 border ${t.select}`}
          >
            <option value="C">변동금리</option>
            <option value="F">고정금리</option>
          </select>
        </div>

        <p className={`text-[10px] ${t.muted} mb-3 leading-relaxed`}>
          {repayMethodDescription(filters.repayMethod)}
        </p>

        <div className="flex justify-between text-xs font-bold mb-2 gap-2">
          <span className={t.accent}>{equityLabel} {formatManKorean(equityMan)}</span>
          <span className={`${t.loan} text-right`}>
            대출금(전체의 {loanPctOfPrice}%) {formatManKorean(loanMan)}
          </span>
        </div>

        <LoanEquityRangeSlider
          minEquityPct={minEquityPct}
          equityPct={equityPct}
          loanPctVisual={loanPctVisual}
          trackClass={t.sliderTrack}
          disabled={maxLoanMan == null || loanMan == null}
          onEquityChange={(pct) => applyEquityFromSlider(pct, false)}
          onCommit={(pct) => applyEquityFromSlider(pct, true)}
        />

        {maxLoanHint && (
          <p className={`text-[10px] ${t.muted} mb-4 leading-relaxed`}>
            {maxLoanHint}
            <span className="opacity-70"> · 단지 최근 평균 시세 기준</span>
          </p>
        )}
        {!maxLoanHint && <div className="mb-3" />}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
          </div>
        ) : (
          <>
            <div className="mb-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-lg font-black ${t.text}`}>
                  월납입금 {formatMonthlyMan(summary?.monthlyPaymentMan)}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.badge}`}>
                  {termYears}년간 · {monthlyPaymentCaption(filters.repayMethod)}
                </span>
              </div>
              <p className={`text-[11px] ${t.muted} mt-1`}>
                이자총액 {formatManKorean(summary?.totalInterestMan)}
              </p>
            </div>

            {best && (
              <div className={`rounded-xl p-3 mb-3 ${t.card}`}>
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-2">
                  가장 저렴한 대출 상담받기
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-bold text-sm truncate ${t.text}`}>{best.korCoNm}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.badge}`}>
                        {rateTypeShort(best.lendRateTypeNm)}
                      </span>
                    </div>
                    <p className={`text-2xl font-black mt-1 ${t.text}`}>
                      {best.lendRateMin.toFixed(2)}%
                    </p>
                  </div>
                  {telHref(best.consultPhone) ? (
                    <a
                      href={telHref(best.consultPhone)!}
                      className="shrink-0 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white"
                      aria-label={`${best.korCoNm} 상담 전화`}
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="shrink-0 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white"
                      aria-label={`${best.korCoNm} 상담`}
                      onClick={() => setSlideOpen(true)}
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {fssError && !best && (
              <p className="text-[11px] text-amber-500 mb-2">{fssError}</p>
            )}

            {products.length > 0 && (
              <button
                type="button"
                onClick={() => setSlideOpen(true)}
                className={`w-full text-center text-xs font-bold py-2 ${t.link}`}
              >
                다른 은행 대출상품 더보기
              </button>
            )}
          </>
        )}
      </section>

      {!isRent && (
        <a
          href={NAVER_PAY_MORTGAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 rounded-2xl p-4 mt-3 transition-colors active:scale-[0.99] ${t.wrap} hover:border-emerald-400/50`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#03C75A] text-sm font-black text-white">
            N
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-bold ${t.text}`}>네이버페이로 갈아타기</span>
            <span className={`block text-[11px] ${t.muted} mt-0.5 leading-snug`}>
              LTV·DTI·DSR 반영 예상 대출한도 확인
            </span>
          </span>
          <ChevronRight className={`w-5 h-5 shrink-0 ${t.muted}`} aria-hidden />
        </a>
      )}

      <LoanProductsSlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        theme={theme}
        loanKind={loanKind}
        products={products}
        summary={summary}
        loanMan={loanMan}
        pyeongLabel={pyeongLabel}
        filters={filters}
        loading={loading}
        onFilterChange={handleFilterChange}
      />
    </>
  );
}
