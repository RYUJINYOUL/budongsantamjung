/** AI분석 탭 짧은 문장 — Flutter my_home_weekly_ai_insights.dart 포팅 */

function intOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function doubleOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseFloat(String(value ?? ''));
  return Number.isNaN(parsed) ? null : parsed;
}

function trendWord(percent: number, epsilon = 0.05): string {
  if (percent > epsilon) return '상승';
  if (percent < -epsilon) return '하락';
  return '보합';
}

function formatWonBrief(man: number): string {
  if (man >= 10000) {
    const eok = man / 10000;
    if (man % 10000 === 0) return `${eok.toFixed(0)}억원`;
    return `${eok.toFixed(2)}억원`;
  }
  return `${man}만원`;
}

function formatPercentTrend(percent: number, epsilon = 0.05): string {
  const signed = `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  return `${signed} ${trendWord(percent, epsilon)}`;
}

function tradePartCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  return intOrNull(value) ?? 0;
}

function priceChangePrevMan(c: Record<string, unknown>): number | null {
  const prev = c.prev;
  if (prev && typeof prev === 'object') return intOrNull((prev as Record<string, unknown>).priceMan);
  return intOrNull(c.previousPriceMan);
}

function priceChangeLatestMan(c: Record<string, unknown>): number | null {
  const latest = c.latest;
  if (latest && typeof latest === 'object') return intOrNull((latest as Record<string, unknown>).priceMan);
  return intOrNull(c.latestPriceMan);
}

function readRebScope(map: Record<string, unknown>): string | null {
  const scope = map.scope?.toString().trim();
  return scope || null;
}

function isLatestAvailableScope(scope: string | null | undefined): boolean {
  return scope === 'latest_available' || scope === 'latestAvailable';
}

export function aiBriefLatestSaleText(item: Record<string, unknown>): string {
  const sale = item.latestSale;
  if (!sale || typeof sale !== 'object') return '—';
  const s = sale as Record<string, unknown>;
  if (s.available === false) return '최근 매매 없음';

  const priceMan = intOrNull(s.priceMan);
  if (priceMan == null) return '—';

  const vs = doubleOrNull(s.vsAvgPrice6mPercent) ?? doubleOrNull(s.vsAvgPrice1mPercent);
  if (vs != null) return `최근 ${formatWonBrief(priceMan)} 평균 대비 ${formatPercentTrend(vs)}`;
  return `최근 ${formatWonBrief(priceMan)}`;
}

export function aiBriefLatestJeonseText(item: Record<string, unknown>): string {
  const jeonse = item.latestJeonse;
  if (!jeonse || typeof jeonse !== 'object') return '—';
  const j = jeonse as Record<string, unknown>;
  if (j.available === false) return '최근 전세 없음';

  const depositMan = intOrNull(j.depositMan);
  if (depositMan == null) return '—';

  const rate = doubleOrNull(j.jeonseRatePercent);
  if (rate != null) return `최근 ${formatWonBrief(depositMan)} 전세가율 ${rate.toFixed(1)}%`;
  return `최근 ${formatWonBrief(depositMan)}`;
}

export function aiBriefPriceChangeText(item: Record<string, unknown>): string {
  const change = item.priceChange;
  if (!change || typeof change !== 'object') return '—';
  const c = change as Record<string, unknown>;

  if (c.available === false) return '변동 없음';

  const delta = doubleOrNull(c.deltaPercent) ?? doubleOrNull(c.changePercent);
  const prevPrice = priceChangePrevMan(c);
  const latestPrice = priceChangeLatestMan(c);

  if (prevPrice != null && latestPrice != null) {
    const pricePart = `${formatWonBrief(prevPrice)} - ${formatWonBrief(latestPrice)}`;
    if (delta != null) return `${pricePart} ${formatPercentTrend(delta)}`;
    return pricePart;
  }

  if (delta != null) return formatPercentTrend(delta);
  return '—';
}

export function aiBriefNewTradesText(item: Record<string, unknown>): string {
  const trades = item.newTradesThisWeek;
  if (!trades || typeof trades !== 'object') return '매매 0건, 전세 0건, 월세 0건';

  const t = trades as Record<string, unknown>;
  const sales = tradePartCount(t.sales);
  const jeonse = tradePartCount(t.jeonse);
  const wolse = tradePartCount(t.wolse);

  return `매매 ${sales}건, 전세 ${jeonse}건, 월세 ${wolse}건`;
}

function aiBriefRebIndexLine(
  label: string,
  idxRaw: unknown,
  rebRoot: Record<string, unknown>,
): string | null {
  if (!idxRaw || typeof idxRaw !== 'object') return null;
  const idx = idxRaw as Record<string, unknown>;

  const wow = doubleOrNull(idx.wowPercent);
  const thisWeek = doubleOrNull(idx.thisWeek);
  if (wow == null && thisWeek == null) return null;

  const scopeNote = isLatestAvailableScope(readRebScope(idx) ?? readRebScope(rebRoot))
    ? ' (최근 발표)'
    : '';

  if (wow != null) {
    const indexPart = thisWeek != null ? ` ${thisWeek.toFixed(1)}` : '';
    return `${label} ${formatPercentTrend(wow)}${indexPart}${scopeNote}`;
  }

  return `${label} ${thisWeek!.toFixed(1)}${scopeNote}`;
}

export function aiBriefRebLines(shared: Record<string, unknown>): string[] {
  const reb = shared.rebWeekly;
  if (!reb || typeof reb !== 'object') return ['데이터 없음'];

  const r = reb as Record<string, unknown>;
  if (r.available === false) return ['데이터 없음'];

  const lines: string[] = [];
  const saleLine = aiBriefRebIndexLine('매매지수', r.apartmentSaleIndex, r);
  if (saleLine) lines.push(saleLine);
  const jeonseLine = aiBriefRebIndexLine('전세지수', r.apartmentJeonseIndex, r);
  if (jeonseLine) lines.push(jeonseLine);

  return lines.length > 0 ? lines : ['데이터 없음'];
}
