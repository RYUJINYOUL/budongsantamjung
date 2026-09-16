/** 만원 단위 → 표시 문자열 */
/** AI 추천 상한 — 없으면 분석대기중 */
export function formatSuggestedBidMan(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man)) return '분석대기중';
  return formatManwon(man);
}

export function formatManwon(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man)) return '-';
  if (man >= 10000) {
    const eok = man / 10000;
    return `${eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)}억`;
  }
  return `${man.toLocaleString('ko-KR')}만`;
}

export function formatSaleDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function meritLabelKo(label: 'high' | 'medium' | 'low' | null | undefined): string {
  if (label === 'high') return '매력';
  if (label === 'medium') return '보통';
  if (label === 'low') return '신중';
  return '분석중';
}

export function meritStyle(label: 'high' | 'medium' | 'low' | null | undefined): {
  bg: string;
  text: string;
  border: string;
} {
  if (label === 'high') {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' };
  }
  if (label === 'medium') {
    return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' };
  }
  if (label === 'low') {
    return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-100' };
  }
  return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' };
}
