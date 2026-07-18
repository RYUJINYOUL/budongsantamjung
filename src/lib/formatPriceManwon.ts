/** 만원 단위 → N억 N,NNN (반올림 없음) */
export function formatPriceManwon(manwon: number | null | undefined): string | null {
  const n = Number(manwon);
  if (!n) return null;
  const eok = Math.floor(n / 10000);
  const rest = n % 10000;
  if (eok && rest) return `${eok}억 ${rest.toLocaleString()}`;
  if (eok) return `${eok}억`;
  return `${n.toLocaleString()}`;
}

export function formatPriceManwonLabel(manwon: number | null | undefined): string {
  const formatted = formatPriceManwon(manwon);
  return formatted ? `${formatted}만원` : '-';
}

/** YY.MM 거래일 표기 */
export function formatDealMonth(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const m = dateStr.match(/^(\d{4})-(\d{2})/);
  if (!m) return dateStr;
  return `${m[1].slice(2)}.${m[2]}`;
}
