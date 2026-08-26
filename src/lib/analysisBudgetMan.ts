/**
 * 타임라인·필터용 예산(만원) — report 상세 응답에서 추출
 * (운영 timeline에 budgetMan 미포함 시 프록시 보강용)
 */

function normalizePriceToMan(raw: unknown): number | null {
  const n = Number(raw || 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 10_000_000) return Math.round(n / 10000);
  return Math.round(n);
}

function pickSubmittedPrice(submitted: Record<string, unknown> | null | undefined): number | null {
  if (!submitted || typeof submitted !== 'object') return null;
  const tx = String(submitted.transactionType || submitted.transaction_type || '매매');
  const raw = (tx === '전세' || tx === '월세')
    ? (submitted.deposit ?? submitted.price)
    : (submitted.price ?? submitted.deposit);
  return normalizePriceToMan(raw);
}

export function resolveBudgetManFromReportDetail(detail: {
  report?: {
    price?: number | string | null;
    deposit?: number | string | null;
    jeonse_deposit?: number | string | null;
    ai_summary?: unknown;
  } | null;
  rawData?: {
    userSubmittedData?: Record<string, unknown>;
    userSubmitted?: Record<string, unknown>;
  } | null;
}): number | null {
  const report = detail.report;
  const rawData = detail.rawData;
  if (!report) return null;

  const fromPrice = normalizePriceToMan(report.price);
  if (fromPrice) return fromPrice;

  const fromDeposit = normalizePriceToMan(report.deposit ?? report.jeonse_deposit);
  if (fromDeposit) return fromDeposit;

  let aiParsed: Record<string, unknown> | null = null;
  if (report.ai_summary && typeof report.ai_summary === 'object') {
    aiParsed = report.ai_summary as Record<string, unknown>;
  } else if (typeof report.ai_summary === 'string' && report.ai_summary.trim().startsWith('{')) {
    try {
      aiParsed = JSON.parse(report.ai_summary);
    } catch {
      aiParsed = null;
    }
  }

  const meta = (aiParsed?.analysisMetadata || aiParsed || {}) as Record<string, unknown>;
  const userWon = Number(meta.userPriceWon || 0);
  if (userWon > 0) return Math.round(userWon / 10000);

  const fromAiSubmitted = pickSubmittedPrice(
    (aiParsed?.userSubmittedData as Record<string, unknown>)
    || (meta.userSubmittedData as Record<string, unknown>)
    || (meta.target as Record<string, unknown>),
  );
  if (fromAiSubmitted) return fromAiSubmitted;

  const fromRaw = pickSubmittedPrice(
    rawData?.userSubmittedData || rawData?.userSubmitted,
  );
  if (fromRaw) return fromRaw;

  const perSqm = Number(meta.estimatedPricePerSqm || 0);
  const targetArea = Number(meta.targetArea || 0);
  const total = Number(meta.estimatedTotalPrice || 0)
    || (perSqm > 0 && targetArea > 0 ? perSqm * targetArea : 0);
  if (total > 0) return Math.round(total / 10000);

  return null;
}

export function isInvestmentTimelineCategory(category: string): boolean {
  return category === '토지' || category === '빌딩';
}

export async function enrichTimelineAnalysesBudgetMan(
  analyses: Array<{ id?: string; category?: string; budgetMan?: number | null }>,
  backendUrl: string,
  authHeader: string | null,
): Promise<void> {
  const targets = analyses.filter(
    (a) => a.id
      && isInvestmentTimelineCategory(String(a.category || ''))
      && (a.budgetMan == null || !Number.isFinite(Number(a.budgetMan))),
  );
  if (targets.length === 0) return;

  const headers: Record<string, string> = {};
  if (authHeader) headers.Authorization = authHeader;

  await Promise.all(
    targets.slice(0, 50).map(async (item) => {
      try {
        const res = await fetch(`${backendUrl}/api/land/detective/report/${item.id}`, {
          cache: 'no-store',
          headers,
        });
        if (!res.ok) return;
        const detail = await res.json();
        const man = resolveBudgetManFromReportDetail(detail);
        if (man != null) item.budgetMan = man;
      } catch {
        /* ignore enrichment failure */
      }
    }),
  );
}
