/** 가용 자금(억) 입력 → 만원 단위 한글 표시 */
export function formatBudgetEokKorean(eokStr: string): string {
  const val = parseFloat(eokStr.trim());
  if (!Number.isFinite(val) || val <= 0) return '';
  const totalMan = Math.round(val * 10000);
  const eok = Math.floor(totalMan / 10000);
  const man = totalMan % 10000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok}억`);
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
  return parts.length > 0 ? `${parts.join(' ')}원` : '';
}

export function capEokFromMaxPurchMan(maxPurchMan: number | null): number | null {
  if (maxPurchMan == null || maxPurchMan <= 0) return null;
  return Math.round((maxPurchMan / 10000) * 10) / 10;
}
