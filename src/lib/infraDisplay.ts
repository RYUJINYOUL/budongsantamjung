import type { InfraCategory } from './infrastructureMap';

export type InfraDistanceMode = 'walk' | 'straight';

export interface InfraDistanceFields {
  distanceM: number;
  walkMin?: number | null;
  distanceMode?: InfraDistanceMode;
  walkable?: boolean;
  category?: InfraCategory | string;
  name?: string;
}

export function formatInfraDistanceLabel(item: InfraDistanceFields): string {
  const m = item.distanceM;
  const dist = m >= 1000 ? `직선 ${(m / 1000).toFixed(1)}km` : `직선 ${m}m`;

  if (item.distanceMode === 'straight' || item.walkMin == null) {
    return `노선 인접 ${dist}`;
  }

  const walkDist = m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
  return `${walkDist}, ${item.walkMin}분`;
}
