'use client';

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import KakaoMap from '../../components/KakaoMap';
import SideNav from '../../components/SideNav';
import RankingPanel from '../../components/RankingPanel';
import ComparePanel from '../../components/ComparePanel';
import { makeAnalyzeSlug } from '../../lib/slug';
import {
  DEFAULT_MAP_POSITION,
  type MapPosition,
} from '../../lib/timelineGeo';
import { getScoreColors } from '../../lib/mapMarkers';
import {
  PAGE_STICKY_HEADER,
  PAGE_HEADER_TITLE,
  PAGE_SUBHEADER,
  PAGE_SUBHEADER_TITLE,
  PANEL_SECTION_DESC,
} from '../../components/analyzePanelFormStyles';

export default function RankingClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(true);

  // 상급지 비교 결과 오버레이 상태
  const [showCompareResult, setShowCompareResult] = useState(false);

  // 활성화된 패널 판별 ('ranking' | 'compare')
  const activeSubPanel = searchParams.get('sub') || 'ranking';

  // 랭킹 마커 상태들
  const [rankingProperties, setRankingProperties] = useState<any[]>([]);
  const [rankingGosiPoints, setRankingGosiPoints] = useState<any[]>([]);
  const [selectedRankingApt, setSelectedRankingApt] = useState<any | null>(null);
  const [selectedGosiPoint, setSelectedGosiPoint] = useState<any | null>(null);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapBounds, setMapBounds] = useState<{ neLat: number; neLng: number; swLat: number; swLng: number } | null>(null);
  const [mapPosition, setMapPosition] = useState<MapPosition>(DEFAULT_MAP_POSITION);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 모바일 탭 상태 처리
  const mobileTab = searchParams.get('tab') || 'list'; // 'map' | 'list' (분석 탭과 동일하게 목록 우선 노출)
  useEffect(() => {
    if (mobileTab === 'list') {
      setShowMobileMap(false);
    } else {
      setShowMobileMap(true);
    }
  }, [mobileTab]);

  // 지도 마커 Properties 매핑
  const mapProperties = useMemo(() => {
    const apts = rankingProperties
      .filter(apt => apt.lat && apt.lng)
      .map(apt => ({
        id: apt.reportId,
        address: apt.address || '',
        riskScore: apt.riskScore || 50,
        lat: apt.lat,
        lng: apt.lng,
        category: 'apartment',
        propertyTitle: apt.bldNm || apt.address || '',
        rank: apt.rank,
      }));

    const uniqueGosi = Array.from(
      new Map(rankingGosiPoints.filter(g => g.lat && g.lng).map(g => [g.title || `${g.lat}-${g.lng}`, g])).values()
    );

    const gosis = uniqueGosi.map((g: any, idx) => {
      const cleanTitle = (g.title || '')
        .replace(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*[가-힣]*(시|군|구)?\s*/g, '')
        .replace(/^[가-힣]+(?:특별자치시|특별자치도|광역시|북도|남도|도|시|군|구)\s*/g, '')
        .replace(/^[가-힣]{2,4}\s+(?=도시관리계획|도시계획|도로구역|일반산업|공원조성|제\d+일반산업단지|도시계획시설)/g, '')
        .trim();

      const truncatedTitle = cleanTitle.length > 12 ? cleanTitle.slice(0, 12) + '...' : cleanTitle;

      return {
        id: `gosi-${idx}`,
        address: g.address || '개발호재 위치',
        riskScore: 0,
        lat: g.lat,
        lng: g.lng,
        category: 'gosi',
        propertyTitle: truncatedTitle || '개발호재',
        displayTitle: cleanTitle,
      };
    });

    return [...apts, ...gosis];
  }, [rankingProperties, rankingGosiPoints]);

  // 선택 마커
  const selectedMapProperty = useMemo(() => {
    if (selectedRankingApt) {
      return mapProperties.find(p => p.id === selectedRankingApt.reportId) || null;
    }
    if (selectedGosiPoint) {
      const uniqueGosi = Array.from(
        new Map(rankingGosiPoints.filter(g => g.lat && g.lng).map(g => [g.title || `${g.lat}-${g.lng}`, g])).values()
      );
      const idx = uniqueGosi.findIndex(g => g.title === selectedGosiPoint.title && g.lat === selectedGosiPoint.lat);
      if (idx !== -1) return mapProperties.find(p => p.id === `gosi-${idx}`) || null;
    }
    return null;
  }, [selectedRankingApt, selectedGosiPoint, mapProperties, rankingGosiPoints]);

  return (
    <div className="detective-bg min-h-screen text-slate-900 relative font-noto-sans-kr antialiased">
      <div className="noise-overlay" />
      <div className="scanline" />

      {/* 사이드 내비게이션 */}
      <SideNav />

      {/* 메인 레이아웃: 홈 페이지의 25% : 75% 그리드 폭 비율 및 스페이싱 통일 */}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] h-screen relative z-10 w-full overflow-hidden lg:pl-16">
        
        {/* 좌측 패널 */}
        <div className={`w-full flex flex-col bg-gradient-to-b from-white to-slate-50/30 min-w-0 z-20 overflow-hidden lg:h-full lg:min-h-0 ${
          (activeSubPanel === 'compare' && showCompareResult)
            ? 'max-lg:hidden lg:flex lg:flex-col'
            : showMobileMap
            ? 'max-lg:shrink-0 max-lg:h-auto border-b lg:border-b-0 border-slate-200/50 shadow-sm lg:shadow-none'
            : 'flex-1 min-h-0'
        }`}>
          {/* 공통 상단 헤더 — 홈·매물분석과 동일한 카테고리 타이틀 */}
          <header className={PAGE_STICKY_HEADER}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 lg:hidden" />
                <h1 className={PAGE_HEADER_TITLE}>부동산랭킹</h1>
              </div>
              {isMobile && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('tab', mobileTab === 'map' ? 'list' : 'map');
                    router.replace(`/ranking?${params.toString()}`);
                  }}
                  className="bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95"
                >
                  {mobileTab === 'map' ? '목록보기' : '지도보기'}
                </button>
              )}
            </div>
          </header>

          <div className={PAGE_SUBHEADER}>
            <div className="flex w-full mb-4 bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('sub', 'ranking');
                  router.replace(`/ranking?${params.toString()}`);
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeSubPanel === 'ranking'
                    ? 'text-sm font-extrabold text-emerald-800 bg-emerald-50 shadow-sm'
                    : 'text-sm font-bold text-slate-500 hover:text-slate-800'
                }`}
              >
                AI 랭킹
              </button>
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('sub', 'compare');
                  router.replace(`/ranking?${params.toString()}`);
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeSubPanel === 'compare'
                    ? 'text-sm font-extrabold text-emerald-800 bg-emerald-50 shadow-sm'
                    : 'text-sm font-bold text-slate-500 hover:text-slate-800'
                }`}
              >
                지역 브리핑
              </button>
            </div>

            <h2 className={PAGE_SUBHEADER_TITLE}>
              {activeSubPanel === 'ranking' ? 'AI 랭킹' : '지역 브리핑'}
            </h2>
            <p className={PANEL_SECTION_DESC}>
              {activeSubPanel === 'ranking'
                ? '지역별 투자별 순위를 확인해보세요'
                : '지역별 분석 데이터를 선택하여 비교해보세요'}
            </p>
          </div>

          {/* 패널 본문 영역 */}
          <div className={`flex-1 min-h-0 overflow-hidden relative ${showMobileMap ? 'max-lg:hidden' : 'block'}`}>
            {activeSubPanel === 'ranking' ? (
              <RankingPanel
                hideHeader={true}
                onResultsChange={(results, gosiPoints) => {
                  setRankingProperties(results);
                  setRankingGosiPoints(gosiPoints || []);
                  if (results.length > 0 && results[0].lat && results[0].lng) {
                    setMapCenter({ lat: results[0].lat, lng: results[0].lng });
                  }
                }}
                urlPrefill={{
                  sigunguCd: searchParams.get('sigunguCd') || '',
                  sigunguName: searchParams.get('sigunguName') || '',
                  minPrice: Number(searchParams.get('minPrice')) || 0,
                  maxPrice: Number(searchParams.get('maxPrice')) || 0,
                  rankingType: searchParams.get('rankingType') || 'apartment',
                }}
              />
            ) : (
              <ComparePanel onShowResult={setShowCompareResult} hideHeader={true} />
            )}
          </div>
        </div>

        {/* 우측 패널: 지도 화면 (홈 페이지의 75% 비율 스페이스 통일) */}
        <div className={`w-full bg-gradient-to-br from-slate-50 to-slate-100 border-l border-slate-200/50 flex-1 lg:flex-none relative flex-col min-w-0 ${(activeSubPanel === 'compare' && showCompareResult) ? 'flex' : showMobileMap ? 'flex' : 'hidden lg:flex'}`}>
          <div className="h-full flex flex-col w-full">
            <div className="flex-1 relative">
              {/* 상급지 비교 결과 오버레이 — 지도 위에 전체를 덮음 (항상 마운트, hidden으로 가시성 제어) */}
              {activeSubPanel === 'compare' && (
                <div className={`absolute inset-0 z-30 ${showCompareResult ? '' : 'hidden'}`} id="compare-result-portal" />
              )}

              <KakaoMap
                properties={activeSubPanel === 'ranking' ? mapProperties : []}
                selectedProperty={activeSubPanel === 'ranking' ? selectedMapProperty : null}
                navigationZoomLevel={2}
                isRankingMode={true}
                initialCenter={mapCenter}
                onPropertySelect={property => {
                  if (activeSubPanel !== 'ranking') return;

                  if (String(property.id).startsWith('gosi-')) {
                    const idx = parseInt(String(property.id).replace('gosi-', ''), 10);
                    const uniqueGosi = Array.from(
                      new Map(rankingGosiPoints.filter(g => g.lat && g.lng).map(g => [g.title || `${g.lat}-${g.lng}`, g])).values()
                    );
                    const gosi = uniqueGosi[idx];
                    if (gosi) {
                      setSelectedGosiPoint(gosi);
                      setSelectedRankingApt(null);
                    }
                    return;
                  }
                  const apt = rankingProperties.find(a => a.reportId === property.id);
                  if (apt) {
                    setSelectedRankingApt(apt);
                    setSelectedGosiPoint(null);
                  }
                }}
                onBoundsChanged={bounds => setMapBounds(bounds)}
                onMapIdle={pos => setMapPosition(pos)}
                onMapDrag={() => {
                  setSelectedRankingApt(null);
                  setSelectedGosiPoint(null);
                }}
              />

              {/* 선택된 매물 간략 정보 팝업 오버레이 (카드 클릭 시 지도 하단 노출) */}
              {activeSubPanel === 'ranking' && selectedRankingApt && (
                (() => {
                  const apt = selectedRankingApt;
                  const scoreColor = getScoreColors(apt.riskScore || 50);
                  const rankColor = '#10b981'; // 웹사이트 브랜드 색상인 초록색으로 랭킹 배지 테두리 통일
                  const estimatedStr = apt.estimatedTotalPrice ? (Math.floor(apt.estimatedTotalPrice / 10000) >= 10000 ? `${Math.floor(apt.estimatedTotalPrice / 100000000)}억` : `${(apt.estimatedTotalPrice / 10000).toLocaleString()}만`) : null;
                  const trend = apt.priceTrendPercent;

                  return (
                    <div
                      className="absolute bottom-6 left-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-0.5 shadow-xl border border-slate-100 max-w-sm mx-auto cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200"
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (searchParams.get('sigunguCd')) params.set('sigunguCd', searchParams.get('sigunguCd')!);
                        if (searchParams.get('sigunguName')) params.set('sigunguName', searchParams.get('sigunguName')!);
                        if (searchParams.get('minPrice')) params.set('minPrice', searchParams.get('minPrice')!);
                        if (searchParams.get('maxPrice')) params.set('maxPrice', searchParams.get('maxPrice')!);
                        if (searchParams.get('rankingType')) params.set('rankingType', searchParams.get('rankingType')!);
                        const slug = makeAnalyzeSlug(apt.reportId, apt.bldNm);
                        router.push(`/analyze/${slug}?return=${encodeURIComponent('/ranking?' + params.toString())}`);
                      }}
                    >
                      {/* 닫기 버튼 */}
                      <button
                        className="absolute top-2.5 right-3 text-slate-355 hover:text-slate-500 text-lg leading-none"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedRankingApt(null);
                        }}
                      >
                        ✕
                      </button>

                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-xl border-2"
                            style={{ borderColor: rankColor, backgroundColor: `${rankColor}18` }}
                          >
                            <span className="text-[11px] font-black" style={{ color: rankColor }}>
                              {apt.rank}위
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-emerald-600 text-[10px] font-black">● 선택된 매물</span>
                            </div>
                            <p className="text-[15px] font-black text-slate-900 truncate">{apt.bldNm}</p>
                            {apt.targetArea > 0 && (
                              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{apt.targetArea}㎡</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {estimatedStr && (
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                              추정가 {estimatedStr}
                            </span>
                          )}
                          {trend !== null && trend !== undefined && (
                            <span
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                                trend > 0
                                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                                  : trend < 0
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}
                            >
                              6개월 {trend > 0 ? '+' : ''}{trend.toFixed(1)}% {trend > 0 ? '↑' : trend < 0 ? '↓' : '-'}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-semibold">매매 {apt.saleCount}건</span>
                        </div>

                        <p className="text-[10px] text-emerald-500 font-bold text-right mt-2">리포트 보기 →</p>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* 선택된 호재 정보 고시 팝업 오버레이 */}
              {activeSubPanel === 'ranking' && selectedGosiPoint && (
                <div className="absolute bottom-6 left-6 right-6 z-30 bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-xl border border-emerald-100 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <button
                    className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600 text-lg leading-none"
                    onClick={() => setSelectedGosiPoint(null)}
                  >
                    ✕
                  </button>

                  <div className="flex items-start gap-3">
                    <div className="shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-[11px] font-black text-emerald-600">호재</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-emerald-600 text-[10px] font-black">● 개발계획 고시 정보</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 leading-snug break-all">
                        {selectedGosiPoint.displayTitle || selectedGosiPoint.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 font-semibold truncate">
                        위치 : {selectedGosiPoint.address || '개발 계획 구역 내'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
