'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { isAdminUser } from '../../../lib/adminUids';
import SideNav from '../../../components/SideNav';
import AnalyzePanel from '../../../components/AnalyzePanel';
import KakaoMap from '../../../components/KakaoMap';
import { parseParcelPolygonFromVworldResponse } from '../../../lib/parcelGeometry';
import { extractPropertyFromUrl, type UrlExtractPrefill } from '../../../lib/urlPropertyExtract';
import {
  PAGE_HEADER_TITLE,
  PAGE_STICKY_HEADER,
  PANEL_CARD,
  PANEL_INPUT,
  PANEL_INPUT_WRAP,
  PANEL_SECTION_DESC,
  PANEL_SECTION_LABEL,
} from '../../../components/analyzePanelFormStyles';

const SUPPORTED_URL_HINTS = [
  { label: '호갱노노', example: 'hogangnono.com/.../item-catalog/...' },
  { label: '땅야', example: 'ddangya.com/meamul/detail/...' },
  { label: '밸류맵 매물', example: 'valueupmap.com/properties/items/70363' },
  { label: '밸류맵 실거래', example: 'valueupmap.com/properties/trades/{pnu}' },
  { label: '밸류맵 상가', example: 'valueupmap.com/properties/trades-partitions/{pnu}' },
];

export default function AdminAnalyzePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState('');
  const [isUrlExtracting, setIsUrlExtracting] = useState(false);
  const [urlExtractError, setUrlExtractError] = useState('');
  const [urlExtractSuccess, setUrlExtractSuccess] = useState('');
  const [urlPrefill, setUrlPrefill] = useState<UrlExtractPrefill | null>(null);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [primaryPolygon, setPrimaryPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
  const [additionalPolygons, setAdditionalPolygons] = useState<{ lat: number; lng: number }[][]>([]);
  const [externalClickParcel, setExternalClickParcel] = useState<{
    lat: number;
    lng: number;
    address: string;
    pnu: string | null;
    polygon: { lat: number; lng: number }[] | null;
    timestamp: number;
  } | null>(null);

  const isAdmin = isAdminUser(user?.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleUrlExtract = async () => {
    if (!propertyUrl.trim()) {
      setUrlExtractError('URL을 입력해주세요.');
      return;
    }

    setIsUrlExtracting(true);
    setUrlExtractError('');
    setUrlExtractSuccess('');

    try {
      const prefill = await extractPropertyFromUrl(propertyUrl.trim());
      setUrlPrefill(prefill);
      setExternalClickParcel({
        lat: prefill.lat,
        lng: prefill.lng,
        address: prefill.address,
        pnu: prefill.pnu,
        polygon: prefill.polygon,
        timestamp: prefill.timestamp,
      });
      setMapCenter({ lat: prefill.lat, lng: prefill.lng });
      setPrimaryPolygon(prefill.polygon);
      setUrlExtractSuccess(`✅ ${prefill.summary} — 입력창이 채워졌습니다.`);
    } catch (error) {
      setUrlExtractError(error instanceof Error ? error.message : 'URL 추출 중 오류가 발생했습니다.');
    } finally {
      setIsUrlExtracting(false);
    }
  };

  const handleMapClick = useCallback(async (latVal: number, lngVal: number) => {
    if (typeof window === 'undefined' || !window.kakao?.maps?.services) return;

    const { kakao } = window;
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lngVal, latVal, async (result: any, status: any) => {
      if (status !== kakao.maps.services.Status.OK) return;

      const addr =
        result[0]?.road_address?.address_name || result[0]?.address?.address_name || '';
      let pnu: string | null = null;
      let polygon: { lat: number; lng: number }[] | null = null;

      try {
        const res = await fetch(`/api/vworld?lat=${latVal}&lng=${lngVal}`);
        if (res.ok) {
          const data = await res.json();
          const features = data?.response?.result?.featureCollection?.features;
          if (features?.length > 0) {
            pnu = features[0]?.properties?.pnu?.toString() || null;
            polygon = parseParcelPolygonFromVworldResponse(data);
          }
        }
      } catch {
        // 지도 클릭은 주소만으로도 진행 가능
      }

      setExternalClickParcel({
        lat: latVal,
        lng: lngVal,
        address: addr,
        pnu,
        polygon,
        timestamp: Date.now(),
      });
      setMapCenter({ lat: latVal, lng: lngVal });
      setPrimaryPolygon(polygon);
    });
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className={`${PANEL_CARD} max-w-sm w-full text-center`}>
          <p className="text-sm font-extrabold text-slate-900 mb-2">관리자 로그인 필요</p>
          <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed">
            관리자 전용 샘플 분석 페이지입니다.
          </p>
          <Link
            href="/login?return=/admin/analyze"
            className="inline-block w-full py-3 bg-emerald-500 text-white font-extrabold rounded-xl text-xs hover:bg-emerald-600 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className={`${PANEL_CARD} max-w-sm w-full text-center`}>
          <p className="text-sm font-extrabold text-rose-600 mb-2">접근 권한 없음</p>
          <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed">
            이 페이지는 관리자 계정만 이용할 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 bg-slate-800 text-white font-extrabold rounded-xl text-xs hover:bg-slate-900 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className={`${PANEL_CARD} max-w-sm w-full text-center`}>
          <p className="text-sm font-extrabold text-slate-900 mb-2">PC에서만 이용 가능</p>
          <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed">
            관리자 샘플 분석은 데스크톱(1024px 이상)에서만 이용할 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 bg-emerald-500 text-white font-extrabold rounded-xl text-xs hover:bg-emerald-600 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <SideNav />

      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] h-screen relative z-10 w-full overflow-hidden lg:pl-16">
        {/* 왼쪽: URL 가져오기 + 분석 폼 */}
        <div className="w-full flex flex-col bg-gradient-to-b from-white to-slate-50/30 min-w-0 z-20 overflow-hidden lg:h-full lg:min-h-0 flex-1 min-h-0">
          <header className={PAGE_STICKY_HEADER}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className={PAGE_HEADER_TITLE}>관리자 샘플 분석</h1>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  URL 자동 입력 · 공공데이터 수집 후 AI 분석까지 한 번에
                </p>
              </div>
              <Link
                href="/"
                className="shrink-0 text-[10px] font-bold text-slate-500 hover:text-emerald-600 transition-colors"
              >
                홈 →
              </Link>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {/* URL 가져오기 (연동은 추후) */}
            <section className="px-4 lg:px-5 py-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-violet-500 text-white text-[9px] font-extrabold tracking-wide">
                  ADMIN
                </span>
                <p className={PANEL_SECTION_LABEL}>매물 URL 가져오기</p>
              </div>
              <p className={PANEL_SECTION_DESC}>
                호갱노노 · 땅야 · 밸류맵 URL을 붙여넣으면 카테고리·주소·가격·면적이 자동 입력됩니다.
              </p>

              <div className={`${PANEL_INPUT_WRAP} mt-3`}>
                <input
                  type="url"
                  value={propertyUrl}
                  onChange={(e) => {
                    setPropertyUrl(e.target.value);
                    setUrlExtractError('');
                    setUrlExtractSuccess('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleUrlExtract();
                  }}
                  placeholder="https://ddangya.com/meamul/detail/..."
                  className={PANEL_INPUT}
                  disabled={isUrlExtracting}
                />
                <button
                  type="button"
                  onClick={() => void handleUrlExtract()}
                  disabled={isUrlExtracting || !propertyUrl.trim()}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-[10px] font-extrabold hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isUrlExtracting ? '...' : '가져오기'}
                </button>
              </div>

              {urlExtractError && (
                <p className="mt-2 text-[10px] font-bold text-rose-600 leading-relaxed">{urlExtractError}</p>
              )}
              {urlExtractSuccess && (
                <p className="mt-2 text-[10px] font-bold text-emerald-600 leading-relaxed">{urlExtractSuccess}</p>
              )}

              {urlPrefill?.specialNotes && (
                <details className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden">
                  <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50">
                    AI 특이사항 prefill (땅야 Q&A · 호갱노노 매물설명 · 밸류맵 업종현황 → 분석 후 AI 모달)
                  </summary>
                  <textarea
                    readOnly
                    value={urlPrefill.specialNotes}
                    rows={8}
                    className="w-full px-3 py-2 text-[10px] text-slate-700 bg-white border-t border-emerald-100 resize-y focus:outline-none leading-relaxed"
                  />
                </details>
              )}

              {urlPrefill?.rawAdText && (
                <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
                  <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-100/80">
                    땅야 상세 rawAdText (POI·Q&A·경매 부가정보 등)
                  </summary>
                  <textarea
                    readOnly
                    value={urlPrefill.rawAdText}
                    rows={12}
                    className="w-full px-3 py-2 text-[10px] font-mono text-slate-700 bg-white border-t border-slate-200 resize-y focus:outline-none"
                  />
                </details>
              )}

              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {SUPPORTED_URL_HINTS.map((item) => (
                  <span
                    key={item.label}
                    className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </section>

            <AnalyzePanel
              adminSampleMode
              onLocationSelect={(lat, lng, address, polygon) => {
                setMapCenter({ lat, lng });
                setPrimaryPolygon(polygon || null);
              }}
              onLocationClear={() => {
                setPrimaryPolygon(null);
                setAdditionalPolygons([]);
              }}
              onAdditionalParcelsChange={(parcels) => {
                const polys = parcels
                  .map((p) => p.polygon)
                  .filter((p): p is { lat: number; lng: number }[] => !!p);
                setAdditionalPolygons(polys);
              }}
              externalClickParcel={externalClickParcel}
              urlPrefill={urlPrefill}
            />
          </div>
        </div>

        {/* 오른쪽: 지도 */}
        <div className="hidden lg:flex w-full bg-gradient-to-br from-slate-50 to-slate-100 border-l border-slate-200/50 relative flex-col min-w-0">
          <KakaoMap
            properties={[]}
            initialCenter={mapCenter}
            isAnalyzeMode
            primaryPolygon={primaryPolygon}
            additionalPolygons={additionalPolygons}
            onMapClick={handleMapClick}
          />
        </div>
      </div>
    </div>
  );
}
