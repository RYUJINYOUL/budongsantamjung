import type {
  FetchLiteLoanCalculatorOptions,
  LiteLoanKind,
  LiteLoanRepayMethod,
} from './liteLoanTypes';

export const MORTGAGE_TERM_MONTHS = 240;
export const MORTGAGE_TERM_YEARS = 20;
export const RENT_TERM_MONTHS = 36;
export const RENT_TERM_YEARS = 3;

export const MORTGAGE_TERM_OPTIONS = [
  { months: 120, label: '10년' },
  { months: 240, label: '20년' },
  { months: 360, label: '30년' },
] as const;

export const RENT_TERM_OPTIONS = [
  { months: 24, label: '2년' },
  { months: 36, label: '3년' },
] as const;

export const REPAY_METHOD_OPTIONS: {
  value: LiteLoanRepayMethod;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: 'equal_principal',
    label: '원금균등분할상환',
    shortLabel: '원금균등',
    description:
      '매월 상환하는 원금이 동일하고, 이자는 잔액에 따라 줄어드는 방식. 초기 월납이 크고 시간이 지날수록 줄어듭니다.',
  },
  {
    value: 'equal_payment',
    label: '원리금균등분할상환',
    shortLabel: '원리금균등',
    description:
      '매월 원금과 이자 합계(원리금)가 동일한 방식. 초기에는 이자 비중이 크고, 후반으로 갈수록 원금 비중이 커집니다.',
  },
  {
    value: 'bullet',
    label: '만기일시상환',
    shortLabel: '만기일시',
    description:
      '매월 이자만 내다가 만기일에 원금을 일시상환하는 방식. 거치기간 동안 부담은 없으나 이자 총액이 가장 큽니다.',
  },
];

export function defaultRepayMethodForKind(loanKind: LiteLoanKind): LiteLoanRepayMethod {
  return loanKind === 'rent' ? 'bullet' : 'equal_principal';
}

export function defaultTermMonthsForKind(loanKind: LiteLoanKind): number {
  return loanKind === 'rent' ? RENT_TERM_MONTHS : MORTGAGE_TERM_MONTHS;
}

export function termOptionsForKind(loanKind: LiteLoanKind) {
  return loanKind === 'rent' ? RENT_TERM_OPTIONS : MORTGAGE_TERM_OPTIONS;
}

export function termYearsFromMonths(months: number): number {
  return Math.round(months / 12);
}

export function repayMethodLabel(method: LiteLoanRepayMethod): string {
  return REPAY_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;
}

export function repayMethodDescription(method: LiteLoanRepayMethod): string {
  return REPAY_METHOD_OPTIONS.find((o) => o.value === method)?.description ?? '';
}

export function monthlyPaymentCaption(method: LiteLoanRepayMethod): string {
  if (method === 'bullet') return '매월 이자';
  if (method === 'equal_payment') return '매월 동일';
  return '초기 월납';
}

export async function fetchR114LiteLoanCalculator(
  r114PropId: string,
  options?: FetchLiteLoanCalculatorOptions,
) {
  const params = new URLSearchParams();
  if (options?.loanKind) params.set('loanKind', options.loanKind);
  if (options?.purchasePriceMan != null && options.purchasePriceMan > 0) {
    params.set('purchasePriceMan', String(Math.round(options.purchasePriceMan)));
  }
  if (options?.jeonseDepositMan != null && options.jeonseDepositMan > 0) {
    params.set('jeonseDepositMan', String(Math.round(options.jeonseDepositMan)));
  }
  if (options?.loanMan != null && options.loanMan > 0) {
    params.set('loanMan', String(Math.round(options.loanMan)));
  }
  if (options?.firstTimeBuyer === false) {
    params.set('firstTimeBuyer', 'false');
  }
  if (options?.repayMethod) params.set('repayMethod', options.repayMethod);
  if (options?.rateType) params.set('rateType', options.rateType);
  if (options?.termMonths != null) params.set('termMonths', String(options.termMonths));

  const qs = params.toString();
  const url = `/api/r114/complex/${encodeURIComponent(r114PropId)}/loan-calculator${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  return res.json();
}

/** 만원 → "30억 7,000만원" 스타일 */
export function formatManKorean(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '—';
  const total = Math.round(man);
  const eok = Math.floor(total / 10000);
  const rest = total % 10000;
  if (eok > 0 && rest > 0) {
    return `${eok.toLocaleString()}억 ${rest.toLocaleString()}만원`;
  }
  if (eok > 0) return `${eok.toLocaleString()}억원`;
  return `${total.toLocaleString()}만원`;
}

export function formatMonthlyMan(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man)) return '—';
  return `${man.toLocaleString()}만원`;
}

export function rateTypeShort(label: string | undefined): string {
  if (!label) return '';
  if (label.includes('변동')) return '변동';
  if (label.includes('고정')) return '고정';
  return label.slice(0, 4);
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `tel:${digits}`;
}

/** LTV·수도권 cap 기준 최대 대출 안내 문구 */
export function formatMaxLoanHint(
  maxLoanMan: number | null | undefined,
  ltvPercent: number | null | undefined,
  loanCapMan: number | null | undefined,
): string | null {
  if (maxLoanMan == null || maxLoanMan <= 0) return null;
  const parts = [`최대 ${formatManKorean(maxLoanMan)}`];
  if (ltvPercent != null && ltvPercent > 0) {
    parts.push(`LTV ${ltvPercent}%`);
  }
  if (loanCapMan != null && loanCapMan > 0) {
    parts.push(`수도권 cap ${formatManKorean(loanCapMan)}`);
  }
  return parts.join(' · ');
}

/** @deprecated */
export const LOAN_TERM_YEARS = MORTGAGE_TERM_YEARS;
/** @deprecated */
export const LOAN_TERM_MONTHS = MORTGAGE_TERM_MONTHS;
/** @deprecated */
export function defaultRpayForKind() {
  return 'D' as const;
}
/** @deprecated */
export function termYearsForKind(loanKind: LiteLoanKind) {
  return termYearsFromMonths(defaultTermMonthsForKind(loanKind));
}
