/** 건축물대장 기반 단지 타입 (rawData.vitals.building.areaMapping) */
export interface ApartmentAreaType {
    type?: string;
    exclusiveArea: number;
    supplyArea?: number;
    pyeong?: number;
}

export function parseAreaMapping(raw: unknown): ApartmentAreaType[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item: Record<string, unknown>) => ({
            type: typeof item.type === 'string' ? item.type : undefined,
            exclusiveArea: Number(item.exclusiveArea),
            supplyArea: item.supplyArea != null ? Number(item.supplyArea) : undefined,
            pyeong: item.pyeong != null ? Number(item.pyeong) : undefined,
        }))
        .filter((item) => Number.isFinite(item.exclusiveArea) && item.exclusiveArea > 0)
        .sort((a, b) => a.exclusiveArea - b.exclusiveArea);
}

/** RTMS 전용㎡ 또는 분기 버킷 → 가장 가까운 공식 타입 */
export function matchAreaType(areaM2: number, mapping: ApartmentAreaType[]): ApartmentAreaType | null {
    if (!mapping.length || !Number.isFinite(areaM2) || areaM2 <= 0) return null;

    let best = mapping[0];
    let bestDiff = Math.abs(areaM2 - best.exclusiveArea);
    for (const item of mapping) {
        const diff = Math.abs(areaM2 - item.exclusiveArea);
        if (diff < bestDiff) {
            best = item;
            bestDiff = diff;
        }
    }

    // 버킷(84/102) ↔ 대장(84.99) 오차 허용
    if (bestDiff > Math.max(2.5, areaM2 * 0.04)) return null;
    return best;
}

export function formatPyeongLabel(pyeong?: number): string {
    if (pyeong == null || !Number.isFinite(pyeong)) return '';
    return `${Math.round(pyeong)}평`;
}

/** 면적 탭 버튼 — "33평" 또는 폴백 "전용 84㎡" */
export function formatAreaTabLabel(areaM2: number, mapping: ApartmentAreaType[]): string {
    const matched = matchAreaType(areaM2, mapping);
    if (matched?.pyeong) return formatPyeongLabel(matched.pyeong);
    return `전용 ${areaM2}㎡`;
}

/** 카드 헤더 — "33평 · 전용 84㎡" */
export function formatAreaTypeHeader(areaM2: number, mapping: ApartmentAreaType[]): string {
    const matched = matchAreaType(areaM2, mapping);
    if (matched?.pyeong) {
        const excl =
            matched.exclusiveArea % 1 === 0
                ? String(matched.exclusiveArea)
                : matched.exclusiveArea.toFixed(2).replace(/\.?0+$/, '');
        return `${formatPyeongLabel(matched.pyeong)} · 전용 ${excl}㎡`;
    }
    return `전용 ${areaM2}㎡`;
}

/** 실거래 전용㎡ → 그룹핑 키 (타입 있으면 대장 전용㎡ 기준) */
export function resolveAreaGroupKey(areaM2: number, mapping: ApartmentAreaType[]): number {
    const matched = matchAreaType(areaM2, mapping);
    if (matched) return matched.exclusiveArea;
    return Math.round(areaM2 * 100) / 100;
}
