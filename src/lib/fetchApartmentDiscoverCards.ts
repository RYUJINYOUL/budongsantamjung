import type { ApartmentCardSnapshot } from './apartmentDiscoverFilters';

export async function fetchApartmentCardSnapshot(
  aptKey: string,
  areaM2: number | null,
): Promise<ApartmentCardSnapshot | null> {
  const params = new URLSearchParams();
  if (areaM2 != null && areaM2 > 0) params.set('area', String(areaM2));
  const res = await fetch(
    `/api/land/detective/apartment/${encodeURIComponent(aptKey)}/card?${params.toString()}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const card = data.card ?? data;
  if (!card || typeof card !== 'object') return null;
  return card as ApartmentCardSnapshot;
}
