import type { MyHomeWeeklyReport } from './myHomeTypes';

export const MY_HOME_REPORT_COMPLEX_LABEL_MAX_CHARS = 4;

export function shortMyHomeComplexLabel(name: string, maxChars = MY_HOME_REPORT_COMPLEX_LABEL_MAX_CHARS): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const chars = [...trimmed];
  if (chars.length <= maxChars) return trimmed;
  return chars.slice(0, maxChars).join('');
}

export function myHomeWeeklyReportComplexLabel(opts: {
  complexName?: string | null;
  homeComplexName?: string | null;
  compareComplexNames?: string[];
  index: number;
  isHome: boolean;
}): string {
  const { complexName, homeComplexName, compareComplexNames = [], index, isHome } = opts;

  let raw: string;
  if (isHome) {
    const name = complexName?.trim();
    if (name) raw = name;
    else if (homeComplexName?.trim()) raw = homeComplexName.trim();
    else raw = '우리집';
  } else {
    const name = complexName?.trim();
    if (name) raw = name;
    else {
      const compareIdx = index - 1;
      if (compareIdx >= 0 && compareIdx < compareComplexNames.length) {
        raw = compareComplexNames[compareIdx];
      } else {
        raw = `비교${compareIdx + 1}`;
      }
    }
  }

  const short = shortMyHomeComplexLabel(raw);
  return short || '우리집';
}

function parseMyHomeWeeklyReportDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dotted = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(trimmed);
  if (dotted) return new Date(Number(dotted[1]), Number(dotted[2]) - 1, Number(dotted[3]));

  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (compact) return new Date(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3]));

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function formatMyHomeWeeklyReportShortDate(date: Date): string {
  const year = date.getFullYear().toString();
  const shortYear = year.startsWith('20') && year.length === 4 ? year.slice(2) : year;
  return `${shortYear}.${date.getMonth() + 1}.${date.getDate()}`;
}

function myHomeWeeklyReportAnchorDate(report: MyHomeWeeklyReport): Date | null {
  const endRaw = report.period?.end;
  if (endRaw?.trim()) {
    const end = parseMyHomeWeeklyReportDate(endRaw);
    if (end) return end;
  }

  const startRaw = report.period?.start;
  if (startRaw?.trim()) {
    const start = parseMyHomeWeeklyReportDate(startRaw);
    if (start) {
      const d = new Date(start);
      d.setDate(d.getDate() + 5);
      return d;
    }
  }

  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(report.weekKey.trim());
  if (weekMatch) {
    const year = Number(weekMatch[1]);
    const week = Number(weekMatch[2]);
    const jan4 = new Date(year, 0, 4);
    const day = jan4.getDay() || 7;
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - (day - 1));
    const monday = new Date(mondayOfWeek1);
    monday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    monday.setDate(monday.getDate() + 5);
    return monday;
  }

  if (report.createdAtMs > 0) return new Date(report.createdAtMs);
  return null;
}

function myHomeWeekOfMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

/** 예: 8월 4주 리포트 */
export function formatMyHomeWeeklyReportWeekTitle(report: MyHomeWeeklyReport): string {
  const anchor = myHomeWeeklyReportAnchorDate(report);
  if (anchor) return `${anchor.getMonth() + 1}월 ${myHomeWeekOfMonth(anchor)}주 리포트`;
  return '주간 리포트';
}

/** 예: 26.8.17 ~ 26.8.23 */
export function formatMyHomeWeeklyReportPeriodShort(report: MyHomeWeeklyReport): string | null {
  const startRaw = report.period?.start;
  const endRaw = report.period?.end;
  if (startRaw?.trim() && endRaw?.trim()) {
    const start = parseMyHomeWeeklyReportDate(startRaw);
    const end = parseMyHomeWeeklyReportDate(endRaw);
    if (start && end) {
      return `${formatMyHomeWeeklyReportShortDate(start)} ~ ${formatMyHomeWeeklyReportShortDate(end)}`;
    }
  }

  if (report.createdAtMs > 0) {
    return formatMyHomeWeeklyReportShortDate(new Date(report.createdAtMs));
  }
  return null;
}

export function formatMyHomeWeeklyReportDate(report: MyHomeWeeklyReport): string {
  const periodShort = formatMyHomeWeeklyReportPeriodShort(report);
  if (periodShort) return periodShort;
  return formatMyHomeWeeklyReportWeekTitle(report);
}

export function formatMyHomeWeeklyReportListPreview(report: MyHomeWeeklyReport): string {
  if (report.skippedAi) return '변동 없음';
  if (report.summaryLines.length > 0) return report.summaryLines[0];
  if (report.weeklyHighlights) return `${report.homeComplexName || '우리집'} 주간 리포트`;
  return `우리집과 희망아파트 · ${formatMyHomeWeeklyReportWeekTitle(report)}`;
}

/** digest byItem 목록 — myHome 우선 정렬 */
export function orderedWeeklyHighlightItems(
  highlights: Record<string, unknown>,
): Record<string, unknown>[] {
  const byItem = highlights.byItem;
  if (!Array.isArray(byItem) || byItem.length === 0) return [];

  const parsed = byItem.filter(
    (raw): raw is Record<string, unknown> => !!raw && typeof raw === 'object',
  );
  if (parsed.length === 0) return [];

  return [...parsed].sort((a, b) => {
    if (a.role?.toString() === 'myHome') return -1;
    if (b.role?.toString() === 'myHome') return 1;
    return 0;
  });
}

export function sharedWeeklyHighlights(highlights: Record<string, unknown>): Record<string, unknown> {
  const shared = highlights.shared;
  if (shared && typeof shared === 'object') return shared as Record<string, unknown>;
  return {};
}
