'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// 갑질 제보 카테고리
const REPORT_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'abuse_power', label: '고객갑질' },
  { id: 'unpaid_fee', label: '지입사기' },
];

interface Report {
  id: string;
  title: string;
  summary: string;
  category: string;
  total_votes: number;
  view_count: number;
  vote_options: Array<{ id: string; content: string; votes: number }>;
  original_url?: string;
  created_at: string;
  ai_summary?: string;
  url_analysis?: string;
  image_analysis?: string;
  image_count?: number;
  video_count?: number;
  audio_count?: number;
  image_urls?: string[];
  video_urls?: string[];
  audio_urls?: string[];
  full_content?: string;
  is_youtube_candidate?: boolean;
  status?: string;
}

export default function AbuseReportPage() {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [newReportUrl, setNewReportUrl] = useState('');
  const [creatingReport, setCreatingReport] = useState(false);

  // Firestore에서 제보 데이터 로드
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        let q = query(collection(db, 'abuse_reports'));

        // 카테고리 필터링
        if (selectedCategory !== 'all') {
          q = query(q, where('category', '==', selectedCategory));
        }

        // 정렬
        if (sortBy === 'created_at_desc') {
          q = query(q, orderBy('created_at', 'desc'));
        } else if (sortBy === 'total_votes_desc') {
          q = query(q, orderBy('total_votes', 'desc'));
        }

        q = query(q, limit(20));

        const querySnapshot = await getDocs(q);
        const firestoreReports: Report[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as Report));

        // Firestore 데이터만 사용
        setReports(firestoreReports);

      } catch (error) {
        console.error('제보 데이터 로드 실패:', error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedCategory, sortBy]);

  // AI로 제보 생성
  const handleCreateAIReport = async () => {
    if (!newReportUrl.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    setCreatingReport(true);
    try {
      // 실제로는 AI API 호출
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 실제로는 AI API를 호출하여 URL 분석 후 제보 생성
      // 현재는 시뮬레이션으로 처리
      console.log('AI 제보 생성:', newReportUrl);

      setNewReportUrl('');
      alert('AI 제보 생성 기능은 준비 중입니다.');

    } catch (error) {
      alert('제보 생성 중 오류가 발생했습니다.');
    } finally {
      setCreatingReport(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInHours < 48) return '어제';
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getCategoryLabel = (categoryId: string) => {
    return REPORT_CATEGORIES.find(cat => cat.id === categoryId)?.label || '기타';
  };

  const getCategoryColor = (categoryId: string) => {
    const colors = {
      'abuse_power': 'bg-red-500/20 text-red-300 border-red-500/30',
      'scam_jiip': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'unpaid_fee': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'work_safety': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    };
    return colors[categoryId as keyof typeof colors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/10 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-center mb-6 sm:mb-8 gap-4 sm:gap-6">
              <img 
                src="/logo512.png" 
                alt="용카 로고" 
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-3xl shadow-2xl ring-2 ring-white/10"
              />
              <div className="text-center sm:text-left">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 sm:mb-3 tracking-tight">
                    용카 신고
                  </h1>
                </Link>
              </div>
            </div>
            <div className="text-center sm:text-left mt-2 mb-1 sm:mt-3 sm:mb-1">
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-300 leading-relaxed tracking-tight mb-10">
                택배 라우트 분석 - 택배 관련 갑질 제보 <br className="sm:hidden" /> - 용카 AI가 만들어 드립니다.
              </h1>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex justify-center mb-6">
              <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-2 border border-slate-700/50">
                <div className="flex space-x-1">
                  <Link 
                    href="/"
                    className="px-6 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
                  >
                    분석하기
                  </Link>
                  <Link 
                    href="/timeline"
                    className="px-6 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
                  >
                    분석 결과
                  </Link>
                  <div className="px-6 py-3 text-sm font-medium bg-red-600/20 text-red-300 rounded-xl border border-red-500/30">
                    갑질 제보
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI 제보 생성 섹션 */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-slate-800/30 backdrop-blur-md rounded-2xl p-6 border border-red-500/20">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-400 mb-2">용카 고객 갑질 제보 투표</h3>
                <p className="text-sm text-gray-400 mb-4">고객 갑질 내용을 업로드하여 투표로 만들어 보세요</p>
            
              </div>
              <div className="lg:ml-4">
                <Link
                  href="/vote/submit"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  제보 등록
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 및 정렬 */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2">
              {REPORT_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                      : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* 정렬 옵션 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="created_at_desc">최신순</option>
              <option value="total_votes_desc">투표 많은 순</option>
            </select>
          </div>
        </div>

        {/* 제보 목록 */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mb-4"></div>
              <p className="text-gray-400">갑질 제보를 불러오는 중...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">선택한 카테고리의 갑질 제보가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/vote/${report.id}`}
                  className="block bg-slate-800/30 backdrop-blur-md border border-slate-700/50 hover:border-red-500/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(report.category)}`}>
                        {getCategoryLabel(report.category)}
                      </span>
                      {report.is_youtube_candidate && (
                        <span className="px-2 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded-full text-xs font-medium">
                          📺 유튜브 후보
                        </span>
                      )}
                      {report.image_count && report.image_count > 0 && (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-medium">
                          📷 {report.image_count}장
                        </span>
                      )}
                      {report.video_count && report.video_count > 0 && (
                        <span className="px-2 py-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-medium">
                          🎥 {report.video_count}개
                        </span>
                      )}
                      {report.audio_count && report.audio_count > 0 && (
                        <span className="px-2 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded-full text-xs font-medium">
                          🎤 {report.audio_count}개
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(report.created_at)}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-red-300 transition-colors">
                    {report.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {report.summary}
                  </p>

                  {/* AI 총평 표시 */}
                  {report.ai_summary && (
                    <div className="bg-red-600/10 border border-red-500/20 rounded-lg p-3 mb-4">
                      <p className="text-red-300 text-sm">
                        {report.ai_summary.length > 100 ? `${report.ai_summary.substring(0, 100)}...` : report.ai_summary}
                      </p>
                    </div>
                  )}

                  {/* 투표 결과 미리보기 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        🗳️ {report.total_votes}표
                      </span>
                      <span className="flex items-center gap-1">
                        👁️ {report.view_count}
                      </span>
                    </div>
                    
                    {report.vote_options && report.total_votes > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        {report.vote_options.map((option, index) => {
                          const percentage = Math.round((option.votes / report.total_votes) * 100);
                          const colors = ['text-red-400', 'text-yellow-400', 'text-gray-400'];
                          return (
                            <span key={option.id} className={colors[index]}>
                              {option.content.split('/')[0]}: {percentage}%
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 하단 액션 버튼들 */}
        <div className="mt-12 flex flex-col sm:flex-row gap-3 max-w-4xl mx-auto">
          <button
            onClick={() => setShowDownloadDialog(true)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            용카 앱 다운로드
          </button>
          
          <Link 
            href="https://yongcar.com/"
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-center"
          >
            용카 홈페이지 
          </Link>
          
          <button className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            용카 대리점
          </button>
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
    </div>
  );
}