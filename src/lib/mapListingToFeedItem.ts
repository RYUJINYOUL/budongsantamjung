import {
  formatPriceEok,
  formatPricePerPyeong,
  type ListingItem,
} from './listingInventory';

const CATEGORY_KO: Record<string, string> = {
  land: '토지',
  house: '주택',
  apartment: '아파트',
  store: '상가',
  building: '빌딩',
};

/** HomePageContent Analysis[] — PropertyCard 호환 */
export function mapListingToFeedItem(item: ListingItem) {
  const category = CATEGORY_KO[item.category] || item.categoryLabel || item.category;
  const meta = item.listingMeta || {};
  const priceStr = formatPriceEok(item.budgetMan);
  const areaParts: string[] = [];
  if (item.pyeong != null) areaParts.push(`${item.pyeong.toLocaleString()}평`);
  if (item.areaM2 != null) areaParts.push(`${item.areaM2.toLocaleString()}㎡`);
  const perPyeong = formatPricePerPyeong(item.budgetMan, item.pyeong);
  const summary = [
    priceStr,
    areaParts.join(' · '),
    perPyeong !== '-' ? perPyeong : null,
    meta.zoning,
    meta.jimok,
  ].filter(Boolean).join(' · ');

  const aiScore = item.aiScore ?? 0;

  return {
    id: item.id,
    category,
    propertyTitle: meta.title || item.propertyTitle || item.address,
    bldNm: meta.title || item.propertyTitle || undefined,
    location: { name: item.address, address: item.address },
    detectiveNote: item.detectiveNote || item.oneLiner || summary || undefined,
    propertyGrade: item.hasReport && item.aiScore != null
      ? {
          overall: aiScore >= 70 ? '우수' : aiScore >= 40 ? '보통' : '주의',
          reason: '',
          riskScore: String(aiScore),
        }
      : undefined,
    hasReport: item.hasReport,
    latestReportId: item.hasReport ? item.id : null,
    createdAt: item.createdAt || new Date().toISOString(),
    lat: item.lat ?? undefined,
    lng: item.lng ?? undefined,
    budgetMan: item.budgetMan,
    area: item.areaM2 ?? undefined,
    exclusiveArea: item.areaM2 ?? undefined,
    avgPrice1m: item.budgetMan ?? undefined,
    r114PropId: (meta as { r114PropId?: string | null }).r114PropId ?? null,
    pnu: item.pnu ?? undefined,
  };
}

export function listingCategoryToApi(category: string): string | undefined {
  const map: Record<string, string> = {
    아파트: 'apartment',
    토지: 'land',
    주택: 'house',
    상가: 'store',
    빌딩: 'building',
  };
  return map[category];
}
