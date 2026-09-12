/** 경매 주소에서 층·호 추출 (예: "4층401호" → floor 4) */
export function parseFloorFromAuctionAddress(address: string | null | undefined): string {
  if (!address) return '';
  const floorMatch = address.match(/(\d+)\s*층/);
  if (floorMatch) return floorMatch[1];
  return '';
}

export function buildAuctionSpecialNotes(ctx: {
  caseNumber?: string | null;
  courtName?: string | null;
  appraisalPriceMan?: number | null;
  minPriceMan?: number | null;
  failCount?: number;
  saleDate?: string | null;
}): string {
  const parts: string[] = ['[경매]'];
  if (ctx.courtName && ctx.caseNumber) parts.push(`${ctx.courtName} ${ctx.caseNumber}`);
  if (ctx.minPriceMan != null) parts.push(`최저입찰 ${ctx.minPriceMan.toLocaleString('ko-KR')}만원`);
  if (ctx.appraisalPriceMan != null) parts.push(`감정 ${ctx.appraisalPriceMan.toLocaleString('ko-KR')}만원`);
  if (ctx.failCount != null && ctx.failCount > 0) parts.push(`유찰 ${ctx.failCount}회`);
  if (ctx.saleDate) {
    const d = new Date(ctx.saleDate);
    if (!Number.isNaN(d.getTime())) {
      parts.push(`매각기일 ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }
  return parts.join(' · ');
}
