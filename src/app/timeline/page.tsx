'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// SEO를 위한 메타데이터 (클라이언트 컴포넌트에서는 직접 설정)
if (typeof window !== 'undefined') {
  document.title = '택배 일자리 분석 결과 - 용카 라우트 | 실시간 택배 라우트 분석';
}

interface Analysis {
  id: string;
  deliveryCompany?: string;
  location?: {
    name: string;
    address: string;
  };
  oneLiner?: string;
  realIncome?: string;
  fuelCost?: {
    dailyFuelCost: string;
    roundTrips: string;
    dailyDistance: string;
  };
  routeGrade?: {
    overall: string;
    reason: string;
    fatigueScore: string;
  };
  warningFlags?: {
    vehiclePurchase: boolean;
    unrealisticIncome: boolean;
    advancePayment: boolean;
  };
  warningPoints?: {
    narrowAlley?: string;
    noElevator?: string;
    deadEnd?: string;
  };
  zoneRatio?: {
    villa?: number;
    apartment?: number;
  };
  cafeText?: string;
  createdAt: string;
}

export default function TimelinePage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const loadMore = () => {
    const increment = isMobile ? 15 : 20;
    setDisplayCount(prev => prev + increment);
  };

  const saveCardAsImage = async (cardId: string) => {
    const cardElement = document.getElementById(`card-${cardId}`);
    if (!cardElement) return;

    try {
      // html2canvas 동적 로드
      if (!(window as any).html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const html2canvas = (window as any).html2canvas;
      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#1e293b',
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      // 이미지 다운로드
      const link = document.createElement('a');
      link.download = `택배분석_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('이미지 저장 실패:', error);
      alert('이미지 저장에 실패했습니다. 브라우저에서 스크린샷 기능을 사용해주세요.');
    }
  };

  useEffect(() => {
    fetchAnalyses();
    
    // 화면 크기 감지
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      setDisplayCount(mobile ? 15 : 20); // 모바일: 15개, PC: 20개 (10줄)
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/timeline');
      if (!response.ok) throw new Error('데이터를 불러오는데 실패했습니다');
      const data = await response.json();
      setAnalyses(data.analyses || []);
      
      // 초기 표시 개수 설정 (데이터 로드 후)
      if (displayCount === 0) {
        const mobile = window.innerWidth < 1024;
        setDisplayCount(mobile ? 15 : 20);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return 'bg-gray-600';
    if (grade.includes('👍') || grade.includes('추천')) return 'bg-green-600';
    if (grade.includes('⚠️') || grade.includes('워밍업')) return 'bg-yellow-600';
    if (grade.includes('🚨') || grade.includes('비추')) return 'bg-red-600';
    return 'bg-blue-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-block mb-6 sm:mb-8 lg:mb-10">
            <div className="flex flex-col sm:flex-row items-center justify-center mb-6 sm:mb-8 gap-4 sm:gap-6">
              <img 
                src="/logo512.png" 
                alt="용카 로고" 
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-3xl shadow-2xl ring-2 ring-white/10"
              />
              <div className="text-center sm:text-left">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 sm:mb-3 tracking-tight">
                    용카 AI
                  </h1>
                </Link>
              </div>
            </div>
            <div className="text-center sm:text-left mt-2 mb-1 sm:mt-3 sm:mb-1">
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-300 leading-relaxed tracking-tight">
                택배 라우트 분석 - 택배 관련 갑질 투표 <br className="sm:hidden" /> - 용카 AI가 만들어 드립니다.
              </h1>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-3 mt-2 sm:mt-2">
            <button 
              onClick={() => setShowDownloadDialog(true)}
              className="inline-flex flex-col items-center justify-center w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-sm sm:text-base lg:text-lg px-4 sm:px-6 py-3 sm:py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <span className="flex items-left gap-2 mb-1">
                <span className="text-xs">앱 다운로드</span>
              </span>
              <span className="text-center leading-tight">
                <span className="block">택배기사 필수 앱 "용카"</span>
              </span>
            </button>
            <a 
              href="https://yongcar.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex flex-col items-center justify-center w-full sm:w-auto text-sm sm:text-base lg:text-lg px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-gray-900 transition-all duration-300 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 border border-yellow-400/30 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-2 mb-1">
                <span className="text-xs">웹페이지</span>
              </span>
              <span className="text-center leading-tight">용카 홈페이지 방문 클릭</span>
            </a>
            <a 
              href="#" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex flex-col items-center justify-center w-full sm:w-auto text-sm sm:text-base lg:text-lg px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border border-green-500/30 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-2 mb-1">
                <span className="text-xs">투명대리점</span>
              </span>
              <span className="text-center leading-tight">용카 인증 대리점 소개</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/5 rounded-xl p-1 border border-white/10">
            <div className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm bg-blue-600 text-white">
              분석 결과
            </div>
            <Link
              href="/analyze"
              className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm text-gray-400 hover:text-white transition-all"
            >
              분석하기
            </Link>
            <Link
              href="/vote"
              className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm text-gray-400 hover:text-white transition-all"
            >
              갑질 투표
            </Link>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-400 mt-4">분석 기록을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 text-lg mb-4">⚠️ {error}</p>
              <button
                onClick={fetchAnalyses}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : analyses.length === 0 ? (
             <div className="text-center py-12">
               <h2 className="text-2xl font-bold text-white mb-4">택배 일자리 분석 기록</h2>
               <p className="text-gray-400 text-lg mb-4">아직 분석된 택배 일자리 데이터가 없습니다.</p>
              <Link
                href="/"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                첫 분석 시작하기
              </Link>
            </div>
          ) : (
             <>
               <h2 className="text-2xl font-bold text-white mb-6">택배 일자리 분석 기록 ({analyses.length})</h2>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {analyses.slice(0, displayCount).map((analysis) => (
                   <div
                     key={analysis.id}
                     id={`card-${analysis.id}`}
                     className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 border border-slate-600 hover:border-blue-400 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-400/20 relative"
                   >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          택배 일자리 분석 - {analysis.deliveryCompany || '배송사 정보 없음'}
                        </h3>
                        <p className="text-blue-400 text-sm">
                          📍 {analysis.location?.name || '위치 정보 없음'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {formatDate(analysis.createdAt)}
                        </span>
                        <button
                          onClick={() => saveCardAsImage(analysis.id)}
                          className="p-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-500/30 transition-all duration-200 group"
                          title="이미지로 저장"
                        >
                          <svg className="w-4 h-4 text-blue-300 group-hover:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Default Message */}
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-200">택배도 연차가 있습니다. 처음부터 완벽한 라우트는 없습니다.</p>
                    </div>

                    {/* One Liner */}
                    {analysis.oneLiner && (
                      <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-200">{analysis.oneLiner}</p>
                      </div>
                    )}

                    {/* Route Grade */}
                    {analysis.routeGrade && (
                      <div className={`${getGradeColor(analysis.routeGrade.overall)} rounded-lg p-3 mb-4`}>
                        <p className="font-semibold text-white text-sm mb-1">
                          {analysis.routeGrade.overall}
                        </p>
                        {analysis.routeGrade.fatigueScore && (
                          <p className="text-xs text-white/80">
                            피로도: {analysis.routeGrade.fatigueScore}/100
                          </p>
                        )}
                      </div>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {analysis.realIncome && (
                        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                          <p className="text-xs text-blue-300 mb-1">💰 실수령액</p>
                          <p className="text-sm font-semibold text-white">{analysis.realIncome}</p>
                        </div>
                      )}
                      {analysis.fuelCost?.dailyFuelCost && (
                        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                          <p className="text-xs text-blue-300 mb-1">⛽ 유류비</p>
                          <p className="text-sm font-semibold text-white">{analysis.fuelCost.dailyFuelCost}</p>
                        </div>
                      )}
                    </div>

                    {/* Zone Ratio */}
                    {analysis.zoneRatio && (
                      <div className="mb-4">
                        <p className="text-xs text-blue-300 mb-2">🏘️ 구역 비율</p>
                        <div className="flex gap-2">
                          {analysis.zoneRatio.villa && (
                            <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-xs text-blue-300">
                              빌라 {analysis.zoneRatio.villa}%
                            </span>
                          )}
                          {analysis.zoneRatio.apartment && (
                            <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-xs text-blue-300">
                              아파트 {analysis.zoneRatio.apartment}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Warning Flags */}
                    {analysis.warningFlags && (
                      <div className="mb-4">
                        {(analysis.warningFlags.vehiclePurchase ||
                          analysis.warningFlags.unrealisticIncome ||
                          analysis.warningFlags.advancePayment) && (
                            <div className="flex flex-wrap gap-2">
                              {analysis.warningFlags.vehiclePurchase && (
                                <span className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-xs text-blue-300">
                                  🚨 차량구매
                                </span>
                              )}
                              {analysis.warningFlags.unrealisticIncome && (
                                <span className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-xs text-blue-300">
                                  🚨 비현실적수입
                                </span>
                              )}
                              {analysis.warningFlags.advancePayment && (
                                <span className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-xs text-blue-300">
                                  🚨 선납금
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Warning Points */}
                    {analysis.warningPoints && (
                      <div className="mb-4 space-y-2">
                        {Object.entries(analysis.warningPoints).map(([key, value]) => (
                          value && (
                            <div key={key} className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-2">
                              <p className="text-xs text-blue-300">⚠️ {value}</p>
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    {/* Expandable Details */}
                    {analysis.cafeText && (
                      <button
                        onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
                        className="w-full text-left text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {expandedId === analysis.id ? '▼ 원문 숨기기' : '▶ 원문 보기'}
                      </button>
                    )}

                    {expandedId === analysis.id && analysis.cafeText && (
                       <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-600">
                        <p className="text-xs text-gray-300 whitespace-pre-wrap">{analysis.cafeText}</p>
                      </div>
                    )}
                  </div>
                 ))}
               </div>
               
               {/* Load More Button */}
               {displayCount < analyses.length && (
                 <div className="flex justify-center mt-8">
                   <button
                     onClick={loadMore}
                     className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
                   >
                     <span>더보기</span>
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                     </svg>
                     <span className="text-sm text-blue-200">
                       ({displayCount}/{analyses.length})
                     </span>
                   </button>
                 </div>
               )}
             </>
           )}
        </div>
      </div>

      {/* Download Dialog */}
      {showDownloadDialog && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-blue-600/30 shadow-2xl">
            <div className="text-center mb-6">
              <img 
                src="/logo512.png" 
                alt="용카 로고" 
                className="w-16 h-16 mx-auto rounded-2xl shadow-lg mb-4"
              />
              <h3 className="text-2xl font-bold text-white mb-2">용카 앱 다운로드</h3>
              <p className="text-gray-400 text-sm">택배기사 필수 앱을 다운로드하세요</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <a
                href="https://play.google.com/store/apps/details?id=com.yongcar.app&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.92 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                Android 다운로드
              </a>
              
              <a
                href="https://apps.apple.com/kr/app/%EC%9A%A9%EC%B9%B4/id6758199533"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-600"
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                </svg>
                iPhone 다운로드
              </a>
            </div>
            
            <button
              onClick={() => setShowDownloadDialog(false)}
              className="w-full py-2 px-4 text-gray-400 hover:text-white transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}