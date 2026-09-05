import type { MapMarkerProperty } from './mapMarkers';

export type ListingCategory = 'land' | 'house' | 'apartment' | 'store' | 'building';

export type ListingMeta = {
  title?: string | null;
  jimok?: string | null;
  zoning?: string | null;
  roadCondition?: string | null;
  buildingUse?: string | null;
  buildingScale?: string | null;
  buildingAge?: string | null;
  brokerName?: string | null;
  brokerPhone?: string | null;
  brokerOffice?: string | null;
  externalListingId?: string | null;
  description?: string | null;
  r114PropId?: string | null;
};

export type ListingLiteLandSpec = {
  jimok?: string | null;
  zoning?: string | null;
  roadCondition?: string | null;
  landUse?: string | null;
  landShape?: string | null;
  topography?: string | null;
  areaM2?: number | null;
  pyeong?: number | null;
  officialPricePerSqm?: number | null;
  officialPricePerPyeong?: number | null;
  dataSource?: string | null;
};

export type ListingLiteBuildingMetrics = {
  landPyeong?: number | null;
  landUnitPricePerPyeongWon?: number | null;
  totalFloorPyeong?: number | null;
  buildingUnitPricePerPyeongWon?: number | null;
  exclusiveAreaPyeong?: number | null;
  floor?: string | null;
  scale?: string | null;
  ageLabel?: string | null;
};

export type ListingLiteBuildingSpec = {
  dongName?: string | null;
  mainPurpose?: string | null;
  structure?: string | null;
  approvalDate?: string | null;
  archAreaM2?: number | null;
  archAreaPyeong?: number | null;
  totalFloorM2?: number | null;
  totalFloorPyeong?: number | null;
  coverageRatio?: number | null;
  floorAreaRatio?: number | null;
  scale?: string | null;
  ageLabel?: string | null;
  floorCount?: number | null;
  officialHousePriceWon?: number | null;
  officialHousePricePerPyeong?: number | null;
  officialHouseAreaM2?: number | null;
};

export type ListingLiteBuildingPastTrade = {
  label: string;
  buildingUse?: string | null;
  dealAmountMan?: number | null;
  dealYear?: number | null;
  dealMonth?: number | null;
  dealDay?: number | null;
  dealDateShort?: string | null;
  landPricePerPyeongWon?: number | null;
  buildingPricePerPyeongWon?: number | null;
  landPriceChangePct?: number | null;
  buildingAr?: number | null;
  plottageAr?: number | null;
};

export type ListingLiteFacility = {
  id?: string;
  name: string;
  category?: string;
  address?: string;
  distance?: number;
  phone?: string;
  placeUrl?: string;
};

export type ListingLiteCohort = {
  status?: 'cohort' | 'cohort_relaxed' | 'rule_fallback';
  level?: string;
  usedFilter?: boolean;
  cohortSampleCount?: number;
  filteredSampleCount?: number;
  appliedMultiplier?: number | null;
  estimatedTotal?: number | null;
  estimatedPerSqm?: number | null;
  officialPerSqm?: number | null;
  officialTotal?: number | null;
  confidenceGrade?: string | null;
  cohortKey?: string | null;
  tradeSamples?: Record<string, unknown>[];
};

export type ListingLiteContext = {
  listingId: string;
  category: ListingCategory;
  lat: number | null;
  lng: number | null;
  address: string;
  pnu?: string | null;
  landSpec?: ListingLiteLandSpec | null;
  buildingSpec?: ListingLiteBuildingSpec | null;
  buildingMetrics?: ListingLiteBuildingMetrics | null;
  buildingPastTrades?: ListingLiteBuildingPastTrade[];
  cohort?: ListingLiteCohort | null;
  parcelTrades?: Record<string, unknown>[];
  nearbyTrades?: { rows: Record<string, unknown>[]; relaxLevel: number };
  dealVolumeStats?: Record<string, unknown>[];
  facilities?: Record<string, ListingLiteFacility[]> | null;
  cachedAt?: string;
};

export type ListingItem = {
  id: string;
  category: ListingCategory;
  categoryLabel: string;
  address: string;
  lat: number | null;
  lng: number | null;
  priceWon: number | null;
  budgetMan: number | null;
  areaM2: number | null;
  pyeong: number | null;
  floor?: string | null;
  pnu?: string | null;
  publishStatus: 'private' | 'lite' | 'recom';
  aiAnalysisStatus: string;
  aiScore: number | null;
  recomApprovedAt?: string | null;
  recomEligible?: boolean;
  propertyTitle: string;
  detectiveNote?: string | null;
  oneLiner?: string | null;
  specialNotes?: string | null;
  listingMeta: ListingMeta;
  createdAt?: string;
  updatedAt?: string;
  analyzedAt?: string | null;
  hasReport: boolean;
};

export type CreateListingPayload = {
  category: ListingCategory;
  address: string;
  lat: number;
  lng: number;
  primaryPnu?: string | null;
  pnuList?: string[];
  priceMan?: number;
  storeData?: Record<string, unknown>;
  specialNotes?: string;
};

export function formatPriceEok(man: number | null | undefined): string {
  if (man == null || !Number.isFinite(man) || man <= 0) return '-';
  if (man >= 10000) {
    const eok = man / 10000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  return `${man.toLocaleString()}만`;
}

export function formatPricePerPyeong(man: number | null | undefined, pyeong: number | null | undefined): string {
  if (man == null || pyeong == null || pyeong <= 0) return '-';
  const per = Math.round(man / pyeong);
  return `${per.toLocaleString()}만/평`;
}

export function listingToMapMarker(item: ListingItem): MapMarkerProperty {
  return {
    id: item.id,
    address: item.address,
    propertyTitle: item.listingMeta?.title || item.propertyTitle,
    category: item.category,
    riskScore: item.aiScore ?? 0,
    lat: item.lat ?? undefined,
    lng: item.lng ?? undefined,
    pendingAi: !item.hasReport || item.aiScore == null || item.aiScore <= 0,
  };
}

export async function fetchListings(options?: {
  category?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ items: ListingItem[]; meta?: Record<string, unknown> }> {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  if (options?.lat != null) params.set('lat', String(options.lat));
  if (options?.lng != null) params.set('lng', String(options.lng));
  if (options?.radiusKm != null) params.set('radius', String(options.radiusKm));
  if (options?.limit != null) params.set('limit', String(options.limit));

  const res = await fetch(`/api/land/detective/listings?${params}`, {
    cache: 'no-store',
    signal: options?.signal,
  });
  if (!res.ok) return { items: [] };
  const data = await res.json();
  return { items: Array.isArray(data.items) ? data.items : [], meta: data.meta };
}

export async function fetchListingLiteContext(
  id: string,
  options?: { includeFacilities?: boolean; signal?: AbortSignal },
): Promise<ListingLiteContext | null> {
  const params = new URLSearchParams();
  if (options?.includeFacilities === false) {
    params.set('includeFacilities', '0');
  }
  const qs = params.toString();
  const res = await fetch(
    `/api/land/detective/listings/${id}/lite-context${qs ? `?${qs}` : ''}`,
    { cache: 'no-store', signal: options?.signal },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.context ?? null;
}

export async function fetchListingDetail(id: string): Promise<ListingItem | null> {
  const res = await fetch(`/api/land/detective/listings/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.item ?? null;
}

export async function createAdminListing(
  token: string,
  payload: CreateListingPayload,
): Promise<{ success: boolean; item?: ListingItem; error?: string }> {
  const res = await fetch('/api/land/detective/admin/listings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: data.error || '매물 등록에 실패했습니다.' };
  }
  return { success: true, item: data.item };
}

export async function approveListingRecom(
  token: string,
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/land/detective/admin/listings/${id}/recom-approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.error || '추천 등록에 실패했습니다.' };
  return { success: true };
}

export async function rejectListingRecom(
  token: string,
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/land/detective/admin/listings/${id}/recom-reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.error || '처리에 실패했습니다.' };
  return { success: true };
}
