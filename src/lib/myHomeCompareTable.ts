import { extractAptRegionLabel } from './apartmentTenYearStory';
import type { MyHomeCompareItem, MyHomeWorkplace } from './myHomeTypes';
import { formatMyHomePriceMan, formatMyHomeRise } from './myHomeApi';
import type { CompareScoringItem } from './apartmentCompareScoring';

export type MyHomeCompareTableLine =
  | { kind: 'group'; title: string }
  | { kind: 'field'; label: string; render: (c: MyHomeCompareItem) => string }
  | { kind: 'extended'; label: string; id: string };

const MY_HOME_MARKET_EXTENDED_ROWS: { id: string; label: string }[] = [
  { id: 'rone_price', label: '가격지수\n(부동산원)' },
  { id: 'rone_jeonse', label: '전세지수\n(부동산원)' },
  { id: 'rone_volume', label: '거래량\n(부동산원)' },
  { id: 'supply_unsold', label: '미분양\n(시군구)' },
  { id: 'supply_movein', label: '입주예정\n(시군구)' },
  { id: 'supply_planned', label: '분양예정\n(시군구)' },
  { id: 'redevelopment', label: '재건축·정비' },
  { id: 'population', label: '인구·이동' },
  { id: 'dynamic_news', label: '호재' },
  { id: 'academy_near', label: '주변 학원' },
];

const RONE_IDS = new Set(['rone_price', 'rone_jeonse', 'rone_volume']);
const SUPPLY_IDS = new Set(['supply_unsold', 'supply_movein', 'supply_planned']);

function formatArea(v: number | null | undefined) {
  if (v == null || v <= 0) return '-';
  return `${v.toFixed(1)}㎡`;
}

function formatPercent(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  return `${v.toFixed(1)}%`;
}

function formatCommute(m: number | null | undefined) {
  if (m == null || m <= 0) return '-';
  return `약 ${m}분`;
}

function formatAddressDong(shortAddress: string | null | undefined) {
  if (!shortAddress?.trim()) return '-';
  const parts = shortAddress.trim().split(/\s+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/[동읍면]$/.test(parts[i])) return parts[i];
  }
  return '-';
}

function formatHouseholdCount(v: number | null | undefined) {
  if (v == null || v <= 0) return '-';
  return String(v);
}

function formatParkingPerHousehold(v: number | null | undefined) {
  if (v == null) return '-';
  return `${v}대`;
}

function formatPriceMonth(v: string | null | undefined) {
  const raw = v?.trim() ?? '';
  if (!raw) return '-';
  const m = /^20(\d{2})/.exec(raw);
  if (!m) return raw;
  return raw.replace(/^20\d{2}/, m[1]);
}

function formatElementarySchoolShortName(name: string): string {
  return name.replace(/초등학교$/, '초등').trim();
}

function formatElementaryWalk(c: MyHomeCompareItem) {
  if (c.elementarySchoolNavMinutes == null || c.elementarySchoolNavMinutes <= 0) return '-';
  const name = c.elementarySchoolName?.trim();
  if (name) {
    return `${c.elementarySchoolNavMinutes}분\n${formatElementarySchoolShortName(name)}`;
  }
  return `${c.elementarySchoolNavMinutes}분`;
}

function compareTableExtendedValue(c: MyHomeCompareItem, id: string): string {
  const rows = c.extended?.rows;
  if (!rows) return '-';
  const row = rows.find((r) => r.id === id);
  return row?.value?.trim() || '-';
}

function splitRoneScoreAndTrend(raw: string): { score: string; trend: string } | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return null;
  let trend = '';
  for (const word of ['상승', '하락', '보합', '증가', '감소']) {
    if (trimmed.includes(word)) {
      trend = word;
      break;
    }
  }
  if (!trend) {
    if (trimmed.includes('↑') || trimmed.includes('▲')) trend = '상승';
    if (trimmed.includes('↓') || trimmed.includes('▼')) trend = '하락';
  }
  const numMatch = /[\d]+(?:\.[\d]+)?/.exec(trimmed);
  if (numMatch) return { score: numMatch[0], trend };
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return { score: parts[0], trend: parts.slice(1).join(' ') };
  return { score: trimmed, trend };
}

export function formatMyHomeExtendedCellValue(id: string, raw: string): string {
  if (raw === '-' || !raw.trim()) return '-';
  if (RONE_IDS.has(id)) {
    const split = splitRoneScoreAndTrend(raw);
    if (!split) return raw;
    return split.trend ? `${split.score}\n${split.trend}` : split.score;
  }
  if (SUPPLY_IDS.has(id)) return raw.replace(/세대/g, '').trim();
  return raw;
}

export function formatMyHomeAcademyCell(item: MyHomeCompareItem): string {
  const w1 = item.extended?.details?.academy?.within1km;
  const w2 = item.extended?.details?.academy?.within2km;
  if (w1 != null || w2 != null) {
    const lines = [
      w1 != null ? `1km ${w1.toLocaleString()}개` : null,
      w2 != null ? `2km ${w2.toLocaleString()}개` : null,
    ].filter(Boolean);
    return lines.length ? lines.join('\n') : '-';
  }

  const raw = compareTableExtendedValue(item, 'academy_near');
  if (raw === '-') return '-';

  const m1 = /1\s*km\s*([\d,]+)\s*개/i.exec(raw);
  const m2 = /2\s*km\s*([\d,]+)\s*개/i.exec(raw);
  if (m1 || m2) {
    const lines = [
      m1 ? `1km ${m1[1]}개` : null,
      m2 ? `2km ${m2[1]}개` : null,
    ].filter(Boolean);
    return lines.length ? lines.join('\n') : raw;
  }

  return raw;
}

export function formatMyHomeExtendedRowLabel(label: string) {
  if (label.includes('\n')) return label;
  return label
    .replace(/^R-one\s+/i, '')
    .replace(/\(시군구\)/g, '(지역)');
}

export function momentumFromScoring(
  scoring: CompareScoringItem | null | undefined,
): { yoy1y: number | null; cagr3y: number | null } {
  if (!scoring) return { yoy1y: null, cagr3y: null };
  let yoy1y: number | null = null;
  let cagr3y: number | null = null;
  for (const part of scoring.momentumBreakdown?.parts ?? []) {
    if (part.key === 'yoy1y' && part.ratePercent != null) yoy1y = part.ratePercent;
    if (part.key === 'cagr3y' && part.ratePercent != null) cagr3y = part.ratePercent;
  }
  if (cagr3y == null && scoring.pattern?.cagr3yPercent != null) {
    cagr3y = scoring.pattern.cagr3yPercent;
  }
  return { yoy1y, cagr3y };
}

export function buildMyHomeCompareTableLines(workplace: MyHomeWorkplace): MyHomeCompareTableLine[] {
  const lines: MyHomeCompareTableLine[] = [];
  const workSet = workplace.workLat != null && workplace.workLng != null;

  lines.push({ kind: 'group', title: '기본 정보' });
  lines.push({ kind: 'field', label: '주소', render: (c) => formatAddressDong(c.shortAddress) });
  lines.push({ kind: 'field', label: '평형', render: (c) => formatArea(c.exclusiveAreaM2) });
  lines.push({
    kind: 'field',
    label: '세대수',
    render: (c) => formatHouseholdCount(c.hardware?.householdCount ?? null),
  });
  lines.push({
    kind: 'field',
    label: '입주년차',
    render: (c) =>
      c.hardware?.buildingAgeYears != null ? `${c.hardware.buildingAgeYears}년` : '-',
  });
  lines.push({
    kind: 'field',
    label: '주차',
    render: (c) => formatParkingPerHousehold(c.hardware?.parkingPerHousehold ?? null),
  });

  lines.push({ kind: 'group', title: '가격/갭' });
  lines.push({ kind: 'field', label: '최근 평균', render: (c) => formatMyHomePriceMan(c.avgPrice1m) });
  lines.push({ kind: 'field', label: '전세가율', render: (c) => formatPercent(c.jeonseRatePercent) });
  lines.push({ kind: 'field', label: '상승률(6월)', render: (c) => formatMyHomeRise(c.riseRate6m) });
  lines.push({ kind: 'extended', label: '상승률(1년)', id: '__momentum_yoy1y__' });
  lines.push({ kind: 'extended', label: '상승률(3년)', id: '__momentum_cagr3y__' });
  lines.push({
    kind: 'field',
    label: '거래량(6월)',
    render: (c) => (c.tradeCount6m != null ? String(c.tradeCount6m) : '-'),
  });
  lines.push({ kind: 'field', label: '시세 기준', render: (c) => formatPriceMonth(c.avgPriceMonth) });

  lines.push({ kind: 'group', title: '입지/교통' });
  lines.push({ kind: 'field', label: '초품아(도보)', render: formatElementaryWalk });
  if (workSet) {
    lines.push({
      kind: 'field',
      label: '출근(교통)',
      render: (c) => formatCommute(c.commuteMinutesTransit),
    });
    lines.push({
      kind: 'field',
      label: '출근(승용)',
      render: (c) => formatCommute(c.commuteMinutesCar ?? c.commuteMinutes),
    });
  }

  lines.push({ kind: 'group', title: '시장/수급' });
  for (const row of MY_HOME_MARKET_EXTENDED_ROWS) {
    lines.push({ kind: 'extended', label: row.label, id: row.id });
  }

  return lines;
}

export function resolveMyHomeCompareCellValue(
  line: MyHomeCompareTableLine,
  item: MyHomeCompareItem | null | undefined,
  momentum?: { yoy1y?: number | null; cagr3y?: number | null },
): string {
  if (line.kind === 'group') return '';
  if (!item) return '-';

  if (line.kind === 'extended') {
    if (line.id === '__momentum_yoy1y__') return formatMyHomeRise(momentum?.yoy1y);
    if (line.id === '__momentum_cagr3y__') return formatMyHomeRise(momentum?.cagr3y);
    if (line.id === 'academy_near') return formatMyHomeAcademyCell(item);
    return formatMyHomeExtendedCellValue(line.id, compareTableExtendedValue(item, line.id));
  }

  return line.render(item);
}

export function myHomeCompareNewsItems(item: MyHomeCompareItem | null | undefined) {
  const items = item?.extended?.details?.dynamicNews?.items;
  if (!items?.length) return [];
  return items;
}

export function formatMyHomeComplexShortName(name: string | null | undefined) {
  const t = (name || '단지').replace(/\s/g, '');
  if (t.length <= 4) return t;
  return t.slice(0, 4);
}

export function formatMyHomeCompareAddressLabel(shortAddress: string | null | undefined) {
  const raw = shortAddress?.trim();
  if (!raw) return '-';
  return extractAptRegionLabel(raw) || raw;
}
