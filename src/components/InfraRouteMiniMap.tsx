'use client';

import { useEffect, useRef } from 'react';
import {
  INFRA_MAP_STYLE,
  InfrastructureProject,
  getInfraStations,
  parseInfraCoord,
  toKakaoPath,
} from '../lib/infrastructureMap';

interface InfraRouteMiniMapProps {
  item: InfrastructureProject;
  selectedStation: string;
}

export default function InfraRouteMiniMap({ item, selectedStation }: InfraRouteMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const itemIdRef = useRef<number | null>(null);
  const userMovedRef = useRef(false);
  const lastStationRef = useRef<string>('전체');

  useEffect(() => {
    if (!containerRef.current || !window.kakao?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 7,
        draggable: true,
        scrollwheel: true,
        disableDoubleClick: false,
        disableDoubleClickZoom: false,
        keyboardShortcuts: false,
      });

      window.kakao.maps.event.addListener(mapRef.current, 'dragend', () => {
        userMovedRef.current = true;
      });
      window.kakao.maps.event.addListener(mapRef.current, 'zoom_changed', () => {
        userMovedRef.current = true;
      });
    } else {
      mapRef.current.relayout();
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    const miniMap = mapRef.current;
    const style = INFRA_MAP_STYLE[item.category === 'road' ? 'road' : 'railway'];
    const stations = getInfraStations(item);
    const isNewItem = itemIdRef.current !== item.id;

    if (isNewItem) {
      itemIdRef.current = item.id;
      userMovedRef.current = false;
    }
    if (lastStationRef.current !== selectedStation) {
      lastStationRef.current = selectedStation;
      userMovedRef.current = false;
    }

    overlaysRef.current.forEach((ov) => ov.setMap(null));
    overlaysRef.current = [];

    const bounds = new window.kakao.maps.LatLngBounds();
    let hasBounds = false;

    for (const pl of item.polylines || []) {
      const path = toKakaoPath(window.kakao, pl.coordinates || []);
      if (path.length < 2) continue;
      path.forEach((p: any) => {
        bounds.extend(p);
        hasBounds = true;
      });
      const polyline = new window.kakao.maps.Polyline({
        path,
        strokeWeight: 4,
        strokeColor: style.lineColor,
        strokeOpacity: 0.95,
        clickable: false,
      });
      polyline.setMap(miniMap);
      overlaysRef.current.push(polyline);
    }

    stations.forEach((pt) => {
      const coord = parseInfraCoord(pt.lat, pt.lng);
      if (!coord) return;
      const pos = new window.kakao.maps.LatLng(coord.lat, coord.lng);
      bounds.extend(pos);
      hasBounds = true;

      const isActive = selectedStation !== '전체' && pt.name === selectedStation;
      const el = document.createElement('div');
      el.style.cssText = `
        padding: 2px 6px; border-radius: 999px; font-size: 8px; font-weight: 800; white-space: nowrap;
        transform: translate(-50%, -50%); pointer-events: none; user-select: none;
        background: ${isActive ? style.lineColor : '#fff'};
        color: ${isActive ? '#fff' : style.lineColor};
        border: 1.5px solid ${style.lineColor};
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      `;
      el.textContent = pt.name || '';
      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        xAnchor: 0.5,
        yAnchor: 0.5,
        clickable: false,
      });
      overlay.setMap(miniMap);
      overlaysRef.current.push(overlay);
    });

    if (!userMovedRef.current) {
      if (selectedStation !== '전체') {
        const station = stations.find((s) => s.name === selectedStation);
        const coord = station ? parseInfraCoord(station.lat, station.lng) : null;
        if (coord) {
          miniMap.setCenter(new window.kakao.maps.LatLng(coord.lat, coord.lng));
          miniMap.setLevel(5);
        }
      } else if (isNewItem && hasBounds) {
        miniMap.setBounds(bounds, 24, 24, 24, 24);
        window.setTimeout(() => {
          if (miniMap.getLevel() > 10) miniMap.setLevel(10);
        }, 50);
      }
    }
  }, [item, selectedStation]);

  return (
    <div
      className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full" aria-label="노선 미니 지도" />
      <div className="absolute bottom-1.5 right-1.5 z-10 pointer-events-none rounded bg-white/90 px-1.5 py-0.5 text-[8px] font-bold text-slate-500 shadow-sm">
        드래그·줌 가능
      </div>
    </div>
  );
}

declare global {
  interface Window {
    kakao: any;
  }
}
