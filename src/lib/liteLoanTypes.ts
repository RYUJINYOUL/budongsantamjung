export type LiteLoanKind = 'mortgage' | 'rent';

export type LiteLoanRepayMethod = 'equal_principal' | 'equal_payment' | 'bullet';
export type LiteLoanRateType = 'C' | 'F';

export type LiteLoanProduct = {
  finCoNo: string;
  korCoNm: string;
  finPrdtNm?: string;
  lendRateMin: number;
  lendRateMax?: number;
  lendRateAvg?: number;
  lendRateTypeNm: string;
  rpayTypeNm?: string;
  loanLmt?: string;
  erlyRpayFee?: string;
  monthlyPaymentMan: number | null;
  totalInterestMan: number | null;
  consultPhone?: string | null;
};

export type LiteLoanContext = {
  loanKind?: LiteLoanKind;
  purchasePriceMan: number | null;
  jeonseDepositMan?: number | null;
  equityMan: number | null;
  loanMan: number | null;
  maxLoanMan: number | null;
  ltvPercent: number | null;
  loanCapMan: number | null;
  region: string;
  sigunguCd: string | null;
};

export type LiteLoanCalculatorResponse = {
  success: boolean;
  message?: string;
  data?: {
    loanKind?: LiteLoanKind;
    context: LiteLoanContext;
    meta: {
      loanKind?: LiteLoanKind;
      source?: string;
      dclsMonth?: string | null;
      asOfLabel?: string | null;
      disclaimer?: string;
      mortgageDisclaimer?: string;
      mortgageAsOfLabel?: string;
      fssConfigured?: boolean;
      fssError?: string;
      repayMethod?: LiteLoanRepayMethod;
      rateType?: LiteLoanRateType;
      termMonths?: number;
    };
    summary: {
      loanMan: number;
      termMonths: number;
      repayMethod?: LiteLoanRepayMethod;
      monthlyPaymentMan: number | null;
      totalInterestMan: number | null;
    } | null;
    best: LiteLoanProduct | null;
    products: LiteLoanProduct[];
  };
};

export type FetchLiteLoanCalculatorOptions = {
  loanKind?: LiteLoanKind;
  purchasePriceMan?: number | null;
  jeonseDepositMan?: number | null;
  loanMan?: number | null;
  firstTimeBuyer?: boolean;
  repayMethod?: LiteLoanRepayMethod;
  rateType?: LiteLoanRateType;
  termMonths?: number;
};

export type LiteLoanFilters = {
  repayMethod: LiteLoanRepayMethod;
  rateType: LiteLoanRateType;
  termMonths: number;
};
