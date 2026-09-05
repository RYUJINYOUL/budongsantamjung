'use client';

import { useEffect, useState } from 'react';
import type { ZoningChangePermitItem } from '../lib/analysisV31Extractors';
import { geocodePresaleAddress } from '../lib/presaleGeocode';

export type ZoningChangeMapMarker = {
  lat: number;
  lng: number;
  platPlc: string;
  address: string;
  mainPurpsCdNm: string;
  archPmsDay: string;
};

function buildPermitKey(permits: ZoningChangePermitItem[]): string {
  return permits.map((p) => `${p.address}|${p.permitDate}|${p.purpose}`).join(';');
}

export function useZoningChangeMapMarkers(permits: ZoningChangePermitItem[]) {
  const permitKey = buildPermitKey(permits);
  const [markers, setMarkers] = useState<ZoningChangeMapMarker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!permitKey) {
      setMarkers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const next: ZoningChangeMapMarker[] = [];
      for (const p of permits.slice(0, 8)) {
        const geo = await geocodePresaleAddress(p.address);
        if (cancelled) return;
        if (geo) {
          next.push({
            lat: geo.lat,
            lng: geo.lng,
            platPlc: p.address,
            address: p.address,
            mainPurpsCdNm: p.purpose,
            archPmsDay: p.permitDate.replace(/\./g, ''),
          });
        }
      }
      if (!cancelled) {
        setMarkers(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // permitKey만 의존 — permits 배열은 매 렌더 새 참조라 포함 시 무한 루프
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permitKey]);

  return { markers, loading };
}
