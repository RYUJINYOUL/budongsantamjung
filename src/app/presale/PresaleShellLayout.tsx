'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import SideNav from '../../components/SideNav';
import KakaoMap from '../../components/KakaoMap';
import { DEFAULT_MAP_POSITION } from '../../lib/timelineGeo';
import type { MapMarkerProperty } from '../../lib/mapMarkers';
import type { PresaleListItem } from '../../lib/presaleApi';
import {
  buildPresaleMarkers,
  filterMarkersInBounds,
  presaleItemToMarker,
  type MapBounds,
} from '../../lib/presaleMap';
import type { PresaleGeo } from '../../lib/presaleGeocode';

type PresaleShellContextValue = {
  isMobile: boolean;
  showMobileMap: boolean;
  setShowMobileMap: (v: boolean | ((prev: boolean) => boolean)) => void;
  leftPanelBodyClass: string;
  selectedPresaleId: string | null;
  selectPresale: (item: PresaleListItem, coords?: PresaleGeo | null) => void;
  clearMapSelection: () => void;
  registerListMarkers: (items: PresaleListItem[], coordsById: Record<string, PresaleGeo>) => void;
  registerDetailMarker: (item: PresaleListItem | null, coords?: PresaleGeo | null) => void;
  listItemsById: Record<string, PresaleListItem>;
  geocodedCount: number;
};

const PresaleShellContext = createContext<PresaleShellContextValue | null>(null);

export function usePresaleShell() {
  const ctx = useContext(PresaleShellContext);
  if (!ctx) throw new Error('usePresaleShell must be used within PresaleShellLayout');
  return ctx;
}

export default function PresaleShellLayout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const [listItems, setListItems] = useState<PresaleListItem[]>([]);
  const [listCoordsById, setListCoordsById] = useState<Record<string, PresaleGeo>>({});
  const [detailItem, setDetailItem] = useState<PresaleListItem | null>(null);
  const [detailCoords, setDetailCoords] = useState<PresaleGeo | null>(null);
  const [selectedPresaleId, setSelectedPresaleId] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const listItemsById = useMemo(() => {
    const map: Record<string, PresaleListItem> = {};
    for (const item of listItems) map[item.id] = item;
    if (detailItem) map[detailItem.id] = detailItem;
    return map;
  }, [listItems, detailItem]);

  const registerListMarkers = useCallback(
    (items: PresaleListItem[], coordsById: Record<string, PresaleGeo>) => {
      setDetailItem(null);
      setDetailCoords(null);
      setListItems(items);
      setListCoordsById(coordsById);
      setSelectedPresaleId(null);
    },
    [],
  );

  const registerDetailMarker = useCallback(
    (item: PresaleListItem | null, coords?: PresaleGeo | null) => {
      setDetailItem(item);
      setDetailCoords(coords ?? null);
      if (item && coords) {
        setSelectedPresaleId(item.id);
        setMapCenter(coords);
      } else {
        setSelectedPresaleId(null);
      }
    },
    [],
  );

  const selectPresale = useCallback(
    (item: PresaleListItem, coords?: PresaleGeo | null) => {
      const resolved = coords ?? listCoordsById[item.id] ?? null;
      setSelectedPresaleId(item.id);
      if (resolved) {
        setMapCenter(resolved);
      }
      if (isMobile) setShowMobileMap(true);
    },
    [isMobile, listCoordsById],
  );

  const clearMapSelection = useCallback(() => {
    setSelectedPresaleId(null);
  }, []);

  const allListMarkers = useMemo(
    () => buildPresaleMarkers(listItems, listCoordsById),
    [listItems, listCoordsById],
  );

  const detailMarker = useMemo((): MapMarkerProperty | null => {
    if (!detailItem || !detailCoords) return null;
    return presaleItemToMarker(detailItem, detailCoords);
  }, [detailItem, detailCoords]);

  const mapProperties = useMemo(() => {
    if (detailMarker) return [detailMarker];
    const inView = filterMarkersInBounds(allListMarkers, mapBounds);
    const base = inView.length > 0 ? inView : allListMarkers;
    if (!selectedPresaleId) return base;
    const selected = allListMarkers.find((m) => m.id === selectedPresaleId);
    if (selected && !base.some((m) => m.id === selectedPresaleId)) {
      return [...base, selected];
    }
    return base;
  }, [allListMarkers, detailMarker, mapBounds, selectedPresaleId]);

  const selectedMapProperty = useMemo(() => {
    if (!selectedPresaleId) return null;
    if (detailMarker?.id === selectedPresaleId) return detailMarker;
    return allListMarkers.find((m) => m.id === selectedPresaleId) ?? null;
  }, [selectedPresaleId, allListMarkers, detailMarker]);

  const leftPanelBodyClass = showMobileMap ? 'max-lg:hidden' : 'block';

  const ctx = useMemo<PresaleShellContextValue>(
    () => ({
      isMobile,
      showMobileMap,
      setShowMobileMap,
      leftPanelBodyClass,
      selectedPresaleId,
      selectPresale,
      clearMapSelection,
      registerListMarkers,
      registerDetailMarker,
      listItemsById,
      geocodedCount: Object.keys(listCoordsById).length,
    }),
    [
      isMobile,
      showMobileMap,
      leftPanelBodyClass,
      selectedPresaleId,
      selectPresale,
      clearMapSelection,
      registerListMarkers,
      registerDetailMarker,
      listItemsById,
      listCoordsById,
    ],
  );

  return (
    <PresaleShellContext.Provider value={ctx}>
      <div className="detective-bg min-h-screen text-slate-900 relative font-noto-sans-kr">
        <div className="noise-overlay" />
        <div className="scanline" />
        <SideNav />

        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] h-screen relative z-10 w-full overflow-hidden lg:pl-16">
          <div
            className={`w-full flex flex-col bg-gradient-to-b from-white to-slate-50/30 min-w-0 z-20 overflow-hidden lg:h-full lg:min-h-0 ${
              showMobileMap
                ? 'max-lg:shrink-0 max-lg:h-auto border-b lg:border-b-0 border-slate-200/50 shadow-sm lg:shadow-none'
                : 'flex-1 min-h-0'
            }`}
          >
            {children}
          </div>

          <div
            className={`w-full bg-gradient-to-br from-slate-50 to-slate-100 border-l border-slate-200/50 flex-1 lg:flex-none relative flex-col min-w-0 ${
              showMobileMap ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="h-full flex flex-col w-full">
              <div className="flex-1 relative min-h-[280px] lg:min-h-0">
                <KakaoMap
                  properties={mapProperties}
                  selectedProperty={selectedMapProperty}
                  isRankingMode
                  navigationZoomLevel={3}
                  initialCenter={mapCenter ?? { lat: DEFAULT_MAP_POSITION.lat, lng: DEFAULT_MAP_POSITION.lng }}
                  onPropertySelect={(property) => {
                    const item = listItemsById[property.id];
                    if (item) selectPresale(item, { lat: property.lat!, lng: property.lng! });
                  }}
                  onBoundsChanged={(bounds) => {
                    if (bounds) setMapBounds(bounds);
                  }}
                  onMapIdle={(pos) => setMapCenter({ lat: pos.lat, lng: pos.lng })}
                  onMapDrag={clearMapSelection}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PresaleShellContext.Provider>
  );
}
