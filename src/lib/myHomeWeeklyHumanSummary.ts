/** digest 항목별 인간어 문장 — Flutter my_home_weekly_human_summary.dart 포팅 */

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

function trendVerb(percent: number, epsilon = 0.05): string {
  if (percent > epsilon) return '상승해 ';
  if (percent < -epsilon) return '하락해 ';
  return '보합해 ';
}

function formatKoreanDate(value: unknown): string {
  const text = String(value ?? '').trim();
  if (text.length < 10) return '';
  const month = parseInt(text.substring(5, 7), 10);
  const day = parseInt(text.substring(8, 10), 10);
  if (Number.isNaN(month) || Number.isNaN(day)) return '';
  return `${month}월 ${day}일`;
}

export function formatWon(man: number): string {
  if (man >= 10000) {
    const eok = man / 10000;
    if (man % 10000 === 0) return `${eok.toFixed(0)}억 원`;
    return `${eok.toFixed(2)}억 원`;
  }
  return `${man}만 원`;
}

function tradePartCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  return intOrNull(value) ?? 0;
}

function readScope(map: Record<string, unknown>): string | null {
  const scope = map.scope?.toString().trim();
  return scope || null;
}

export function isLatestAvailableScope(scope: string | null | undefined): boolean {
  return scope === 'latest_available' || scope === 'latestAvailable';
}

function mortgageBasisMan(item: Record<string, unknown>, m: Record<string, unknown>): number | null {
  const fromMort = intOrNull(m.priceBasisMan) ?? intOrNull(m.avgPrice1m);
  if (fromMort != null) return fromMort;

  const sale = item.latestSale;
  if (sale && typeof sale === 'object') {
    return intOrNull((sale as Record<string, unknown>).priceMan);
  }
  return null;
}

function parseCapManFromNote(note: string | null | undefined): number | null {
  if (!note) return null;
  const match = /cap\s*(\d+)/i.exec(note);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function parseRegionFromNote(note: string | null | undefined): string | null {
  if (!note) return null;
  if (note.includes('수도권')) return '수도권';
  if (note.includes('지방')) return '지방';
  return null;
}

function effectiveLoanLimit(loan: number | null, cap: number | null): number | null {
  if (loan == null) return cap;
  if (cap == null) return loan;
  return loan < cap ? loan : cap;
}

function simpleRebImpactMan(baseMan: number, wowPercent: number): number {
  return Math.round(baseMan * wowPercent / 100);
}

function priceBasisMan(item: Record<string, unknown>, shared: Record<string, unknown>): number | null {
  const mort = item.mortgageAtPrice ?? item.mortgage ?? shared.mortgageSnapshot;
  if (mort && typeof mort === 'object') {
    const basis = mortgageBasisMan(item, mort as Record<string, unknown>);
    if (basis != null) return basis;
  }

  const sale = item.latestSale;
  if (sale && typeof sale === 'object') {
    return intOrNull((sale as Record<string, unknown>).priceMan);
  }
  return null;
}

function appendRebSaleLines(
  lines: string[],
  item: Record<string, unknown>,
  shared: Record<string, unknown>,
): void {
  const reb = shared.rebWeekly;
  if (!reb || typeof reb !== 'object') return;
  const r = reb as Record<string, unknown>;
  if (r.available === false) return;

  const idxRaw = r.apartmentSaleIndex;
  if (!idxRaw || typeof idxRaw !== 'object') return;
  const idx = idxRaw as Record<string, unknown>;

  const wow = doubleOrNull(idx.wowPercent);
  const thisWeek = doubleOrNull(idx.thisWeek);
  if (wow == null && thisWeek == null) return;

  const scopeNote = isLatestAvailableScope(readScope(idx) ?? readScope(r))
    ? ' (최근 발표 기준)'
    : '';

  if (wow != null) {
    const indexPart = thisWeek != null ? thisWeek.toFixed(1) : '—';
    lines.push(
      `부동산원 매매지수는 지난주 대비 ${wow > 0 ? '+' : ''}${wow.toFixed(2)}% `
      + `${trendVerb(wow)}${indexPart}입니다${scopeNote}.`,
    );
  } else if (thisWeek != null) {
    lines.push(`부동산원 매매지수는 ${thisWeek.toFixed(1)}입니다${scopeNote}.`);
  }

  const basisMan = priceBasisMan(item, shared);
  if (basisMan != null && wow != null) {
    const impact = simpleRebImpactMan(basisMan, wow);
    if (impact !== 0) {
      const dir = wow > 0 ? '상승' : '하락';
      lines.push(
        `시세 ${formatWon(basisMan)}에 단순 적용하면 약 ${formatWon(Math.abs(impact))} `
        + `${dir}한 수준입니다.`,
      );
    }
  }
}

function appendRebJeonseLines(
  lines: string[],
  item: Record<string, unknown>,
  shared: Record<string, unknown>,
): void {
  const reb = shared.rebWeekly;
  if (!reb || typeof reb !== 'object') return;
  const r = reb as Record<string, unknown>;
  if (r.available === false) return;

  const idxRaw = r.apartmentJeonseIndex;
  if (!idxRaw || typeof idxRaw !== 'object') return;
  const idx = idxRaw as Record<string, unknown>;

  const wow = doubleOrNull(idx.wowPercent);
  const thisWeek = doubleOrNull(idx.thisWeek);
  if (wow == null && thisWeek == null) return;

  const scopeNote = isLatestAvailableScope(readScope(idx) ?? readScope(r))
    ? ' (최근 발표 기준)'
    : '';

  if (wow != null) {
    const indexPart = thisWeek != null ? thisWeek.toFixed(1) : '—';
    lines.push(
      `부동산원 전세지수는 지난주 대비 ${wow > 0 ? '+' : ''}${wow.toFixed(2)}% `
      + `${trendVerb(wow)}${indexPart}입니다${scopeNote}.`,
    );
  } else if (thisWeek != null) {
    lines.push(`부동산원 전세지수는 ${thisWeek.toFixed(1)}입니다${scopeNote}.`);
  }

  const jeonse = item.latestJeonse;
  let depositMan: number | null = null;
  if (jeonse && typeof jeonse === 'object') {
    depositMan = intOrNull((jeonse as Record<string, unknown>).depositMan);
  }

  if (depositMan != null && wow != null) {
    const impact = simpleRebImpactMan(depositMan, wow);
    if (impact !== 0) {
      const dir = wow > 0 ? '상승' : '하락';
      lines.push(
        `전세보증금 ${formatWon(depositMan)}에 단순 적용하면 약 ${formatWon(Math.abs(impact))} `
        + `${dir}한 수준입니다.`,
      );
    }
  }
}

export function humanLatestSaleText(item: Record<string, unknown>): string {
  const sale = item.latestSale;
  if (!sale || typeof sale !== 'object') return '—';
  const s = sale as Record<string, unknown>;
  if (s.available === false) return '이번 주 신규 매매 없음';

  const priceMan = intOrNull(s.priceMan);
  if (priceMan == null) return '—';

  const dateLabel = formatKoreanDate(s.contractDate);
  const vs = doubleOrNull(s.vsAvgPrice6mPercent) ?? doubleOrNull(s.vsAvgPrice1mPercent);

  let text =
    `최근 거래는 ${dateLabel ? `${dateLabel} ` : ''}${formatWon(priceMan)}으로`;

  if (vs != null) {
    text += `, 최근 6개월 평균 대비 ${vs > 0 ? '+' : ''}${vs.toFixed(1)}% ${trendWord(vs)}입니다.`;
  } else {
    text += ' 있습니다.';
  }

  return text;
}

export function humanLatestJeonseText(item: Record<string, unknown>): string {
  const jeonse = item.latestJeonse;
  if (!jeonse || typeof jeonse !== 'object') return '—';
  const j = jeonse as Record<string, unknown>;
  if (j.available === false) return '이번 주 신규 전세 없음';

  const depositMan = intOrNull(j.depositMan);
  if (depositMan == null) return '—';

  const dateLabel = formatKoreanDate(j.contractDate);
  const rate = doubleOrNull(j.jeonseRatePercent);

  let text =
    `최근 전세는 ${dateLabel ? `${dateLabel} ` : ''}${formatWon(depositMan)}으로`;

  if (rate != null) {
    text += `, 전세가율은 ${rate.toFixed(1)}%입니다.`;
  } else {
    text += ' 있습니다.';
  }

  return text;
}

export function humanPriceChangeText(item: Record<string, unknown>): string {
  const change = item.priceChange;
  if (!change || typeof change !== 'object') return '—';
  const c = change as Record<string, unknown>;

  if (c.available === false) {
    const basis = c.basis?.toString().trim();
    const prevPrice = intOrNull(c.previousPriceMan);
    if (basis === 'area_mismatch' && prevPrice != null) {
      return `매매 변동은 직전 ${formatWon(prevPrice)} 대비 변동 없습니다. `
        + '평형이 달라 변동률은 표시하지 않습니다.';
    }
    if (prevPrice != null) {
      return `매매 변동은 직전 ${formatWon(prevPrice)} 대비 변동 없습니다.`;
    }
    return '직전 대비 변동 없음';
  }

  const delta = doubleOrNull(c.deltaPercent) ?? doubleOrNull(c.changePercent);
  let prevPrice: number | null = null;
  let latestPrice: number | null = null;

  const latest = c.latest;
  const prev = c.prev;
  if (latest && typeof latest === 'object' && prev && typeof prev === 'object') {
    prevPrice = intOrNull((prev as Record<string, unknown>).priceMan);
    latestPrice = intOrNull((latest as Record<string, unknown>).priceMan);
  } else {
    prevPrice = intOrNull(c.previousPriceMan);
    latestPrice = intOrNull(c.latestPriceMan);
  }

  if (prevPrice == null || latestPrice == null) {
    if (delta != null) {
      return `매매 변동은 ${delta > 0 ? '+' : ''}${delta.toFixed(1)}% ${trendWord(delta)}입니다.`;
    }
    return '—';
  }

  if (delta != null) {
    return `매매 변동은 ${formatWon(prevPrice)} → ${formatWon(latestPrice)}으로 `
      + `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% ${trendWord(delta)}입니다.`;
  }

  return `매매 변동은 ${formatWon(prevPrice)} → ${formatWon(latestPrice)}입니다.`;
}

export function humanNewTradesText(item: Record<string, unknown>): string {
  const trades = item.newTradesThisWeek;
  if (!trades || typeof trades !== 'object') {
    return '이번 주 거래는 매매 0건 · 전세 0건 · 월세 0건입니다.';
  }

  const t = trades as Record<string, unknown>;
  const sales = tradePartCount(t.sales);
  const jeonse = tradePartCount(t.jeonse);
  const wolse = tradePartCount(t.wolse);

  return `이번 주 거래는 매매 ${sales}건 · 전세 ${jeonse}건 · 월세 ${wolse}건입니다.`;
}

export function humanRebText(item: Record<string, unknown>, shared: Record<string, unknown>): string {
  const lines: string[] = [];
  appendRebSaleLines(lines, item, shared);
  appendRebJeonseLines(lines, item, shared);

  if (lines.length === 0) {
    const reb = shared.rebWeekly;
    if (reb && typeof reb === 'object' && (reb as Record<string, unknown>).available === false) {
      return '데이터 없음';
    }
    return '이번 주 발표 없음';
  }

  return lines.join('\n\n');
}

export function humanRebHasScopeFallback(shared: Record<string, unknown>): boolean {
  const reb = shared.rebWeekly;
  if (!reb || typeof reb !== 'object') return false;
  const r = reb as Record<string, unknown>;
  if (isLatestAvailableScope(readScope(r))) return true;
  const saleIdx = r.apartmentSaleIndex;
  if (saleIdx && typeof saleIdx === 'object' && isLatestAvailableScope(readScope(saleIdx as Record<string, unknown>))) {
    return true;
  }
  const jeonseIdx = r.apartmentJeonseIndex;
  if (jeonseIdx && typeof jeonseIdx === 'object' && isLatestAvailableScope(readScope(jeonseIdx as Record<string, unknown>))) {
    return true;
  }
  return false;
}

export function humanMortgageText(item: Record<string, unknown>, shared: Record<string, unknown>): string {
  const mort = item.mortgageAtPrice ?? item.mortgage ?? shared.mortgageSnapshot;
  if (!mort || typeof mort !== 'object') return '—';

  const m = mort as Record<string, unknown>;
  const ltv = intOrNull(m.ltvPercent);
  const loan = intOrNull(m.loanAtPriceMan) ?? intOrNull(m.maxLoanMan);
  const capMan = intOrNull(m.loanCapMan) ?? intOrNull(m.regionCapMan);
  const basis = mortgageBasisMan(item, m);
  const note = m.note?.toString().trim();

  if (loan == null && ltv == null && capMan == null && !note) return '—';

  let text = basis != null ? `시세 ${formatWon(basis)} 주택은` : '해당 주택은';

  const details: string[] = [];
  if (ltv != null) details.push(`LTV ${ltv}%`);

  const capFromNote = parseCapManFromNote(note);
  const effectiveCap = capMan ?? capFromNote;
  if (effectiveCap != null) {
    const region = parseRegionFromNote(note);
    if (region) details.push(`${region} 대출한도 ${formatWon(effectiveCap)}`);
    else details.push(`대출한도 ${formatWon(effectiveCap)}`);
  }

  if (details.length > 0) text += ` ${details.join(', ')}`;

  const effectiveLoan = effectiveLoanLimit(loan, effectiveCap);
  if (effectiveLoan != null) {
    text += ` 적용 시 최대 ${formatWon(effectiveLoan)}까지 대출 한도가 계산됩니다.`;
  } else {
    text += ' 기준으로 대출 한도가 계산됩니다.';
  }

  return text;
}

export function withScopeHeader(scope: string | null | undefined, body: string): string {
  if (body === '—' || !body) return body;
  if (isLatestAvailableScope(scope)) return `최근 자료 (이번 주 신규 없음)\n${body}`;
  return body;
}

export function isScopeFallbackText(value: string): boolean {
  return value.includes('최근 자료 (이번 주 신규 없음)') || value.includes('최근 발표 기준');
}

function formatDate(value: unknown): string {
  const text = String(value ?? '').trim();
  if (text.length >= 10) return text.substring(0, 10);
  return text;
}

function formatShortDate(value: unknown): string {
  const full = formatDate(value);
  if (full.length >= 10) return full.substring(2);
  return full;
}

function formatHosaeProgress(value: unknown): string | null {
  const key = value?.toString().trim().toLowerCase();
  if (!key) return null;
  const labels: Record<string, string> = {
    planning: '계획',
    approved: '승인',
    active: '진행',
    in_progress: '진행',
    inprogress: '진행',
    completed: '완료',
  };
  return labels[key] ?? value?.toString().trim() ?? null;
}

export type HosaeDisplayItem = {
  source: Record<string, unknown>;
  typeLabel: string;
  metaLine: string;
  titleLine: string;
};

export type HosaeParsed = {
  items: HosaeDisplayItem[];
  extraCount: number;
  scopeHeader: string | null;
};

function hosaeDisplayItem(item: Record<string, unknown>): HosaeDisplayItem | null {
  const label = item.ui_label?.toString().trim();
  const name = item.canonicalName?.toString().trim() ?? item.title?.toString().trim();
  const dist = doubleOrNull(item.distKm);
  const progress = formatHosaeProgress(item.progressStatus);
  const date = formatShortDate(item.firstSeenAt);

  const title = name || label || '';
  if (!title) return null;

  const meta = [
    date,
    dist != null ? `${dist.toFixed(1)}km` : '',
    progress ?? '',
  ].filter(Boolean);

  const titleLine = label && label !== title ? `${title} · ${label}` : title;

  return {
    source: item,
    typeLabel: label || '호재',
    metaLine: meta.join(' · '),
    titleLine,
  };
}

export function parseHosaeItems(shared: Record<string, unknown>): HosaeParsed {
  const hosae = shared.newHosae;
  if (!Array.isArray(hosae) || hosae.length === 0) {
    return { items: [], extraCount: 0, scopeHeader: null };
  }

  let listScope = readScope(shared);
  const items: HosaeDisplayItem[] = [];
  const seenKeys = new Set<string>();

  for (const raw of hosae) {
    if (items.length >= 5) break;
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    listScope ??= readScope(item);

    const display = hosaeDisplayItem(item);
    if (!display) continue;

    const dedupeKey = [item.id, item.canonicalName, item.firstSeenAt]
      .map((v) => v?.toString().trim())
      .filter(Boolean)
      .join('|');
    if (dedupeKey && seenKeys.has(dedupeKey)) continue;
    if (dedupeKey) seenKeys.add(dedupeKey);

    items.push(display);
  }

  const scopeHeader = isLatestAvailableScope(listScope) ? '최근 자료 (이번 주 신규 없음)' : null;
  const extra = hosae.length > items.length ? hosae.length - items.length : 0;

  return { items, extraCount: extra, scopeHeader };
}

export function hasHosaeScopeFallback(shared: Record<string, unknown>): boolean {
  const hosae = shared.newHosae;
  if (!Array.isArray(hosae) || hosae.length === 0) return false;
  const scope = readScope(shared);
  if (isLatestAvailableScope(scope)) return true;
  for (const raw of hosae) {
    if (raw && typeof raw === 'object' && isLatestAvailableScope(readScope(raw as Record<string, unknown>))) {
      return true;
    }
  }
  return false;
}

export function formatPolicyNews(shared: Record<string, unknown>): string {
  const news = shared.newPolicyNews;
  if (!Array.isArray(news) || news.length === 0) return '이번 주 신규 없음';

  let listScope = readScope(shared);
  const lines: string[] = [];

  for (const raw of news.slice(0, 2)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    listScope ??= readScope(item);
    const title = item.title?.toString().trim();
    if (!title) continue;
    const source = item.source?.toString().trim();
    const date = formatDate(item.date);
    const meta = [source, date].filter(Boolean).join(' · ');
    lines.push(meta ? `${title}\n${meta}` : title);
  }

  if (lines.length === 0) return '이번 주 신규 없음';
  return withScopeHeader(listScope, lines.join('\n\n'));
}
