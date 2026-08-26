import { describe, expect, it } from 'vitest';
import { resolveBudgetManFromReportDetail } from './analysisBudgetMan';

describe('analysisBudgetMan', () => {
  it('resolves 제시가 from report.price (원)', () => {
    expect(resolveBudgetManFromReportDetail({
      report: { price: 2_000_000_000 },
    })).toBe(200000);
  });

  it('resolves 제시가 from userSubmittedData', () => {
    expect(resolveBudgetManFromReportDetail({
      report: {},
      rawData: { userSubmittedData: { price: 2_000_000_000, transactionType: '매매' } },
    })).toBe(200000);
  });

  it('prefers userPriceWon in analysisMetadata', () => {
    expect(resolveBudgetManFromReportDetail({
      report: {
        price: 999,
        ai_summary: { analysisMetadata: { userPriceWon: 2_000_000_000 } },
      },
    })).toBe(200000);
  });
});
