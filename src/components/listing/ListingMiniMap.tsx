'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

export default function ListingMiniMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let attempts = 0;

    const init = () => {
      if (cancelled || !containerRef.current || !window.kakao?.maps) {
        if (attempts < 40) {
          attempts += 1;
          window.setTimeout(init, 150);
        }
        return;
      }

      const center = new window.kakao.maps.LatLng(lat, lng);

      if (!mapRef.current) {
        mapRef.current = new window.kakao.maps.Map(containerRef.current, {
          center,
          level: 3,
          draggable: true,
          scrollwheel: false,
          disableDoubleClickZoom: false,
        });
      } else {
        mapRef.current.relayout();
        mapRef.current.setCenter(center);
      }

      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }

      const markerEl = document.createElement('div');
      markerEl.className = 'flex flex-col items-center -translate-y-1/2';
      markerEl.innerHTML = `
        <div class="px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold shadow-lg whitespace-nowrap max-w-[160px] truncate">
          ${label || '매물 위치'}
        </div>
        <div class="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-md mt-1"></div>
      `;

      overlayRef.current = new window.kakao.maps.CustomOverlay({
        position: center,
        content: markerEl,
        yAnchor: 1,
      });
      overlayRef.current.setMap(mapRef.current);
    };

    init();

    return () => {
      cancelled = true;
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [lat, lng, label]);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={containerRef} className="w-full h-[160px] bg-slate-100" aria-label="매물 위치 지도" />
    </div>
  );
}
