'use client';

import { useState, useEffect, useCallback } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

// 갑질 제보 카테고리
const REPORT_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'abuse_power', label: '고객갑질' },
  { id: 'scam_jiip', label: '본사갑질' },
  { id: 'unpaid_fee', label: '지입사기' },
  { id: 'work_safety', label: '기타갑질' },
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

interface Comment {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

export default function ReportClient({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      notFound();
      return;
    }

    const fetchReport = async () => {
      try {
        const reportRef = doc(db, 'abuse_reports', reportId);
        const reportSnap = await getDoc(reportRef);

        if (reportSnap.exists()) {
          const reportData = {
            id: reportSnap.id,
            ...reportSnap.data(),
            created_at: reportSnap.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
          } as Report;
          setReport(reportData);
        } else {
          // 제보를 찾을 수 없음
          notFound();
        }
      } catch (err) {
        console.error('제보 로드 실패:', err);
        setError('제보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const handleVote = useCallback(async (optionId: string) => {
    if (!report) return;

    const votedKey = `voted_report_${report.id}`;
    if (localStorage.getItem(votedKey)) {
      alert('이미 이 제보에 투표하셨습니다.');
      return;
    }

    try {
      const reportRef = doc(db, 'abuse_reports', report.id);
      
      const updatedOptions = report.vote_options.map(option =>
        option.id === optionId ? { ...option, votes: option.votes + 1 } : option
      );
      
      await updateDoc(reportRef, {
        vote_options: updatedOptions,
        total_votes: increment(1)
      });
      
      const updatedReport = {
        ...report,
        vote_options: updatedOptions,
        total_votes: report.total_votes + 1
      };
      
      setReport(updatedReport);
      localStorage.setItem(votedKey, 'true');
      alert('투표가 완료되었습니다!');
      
    } catch (err) {
      console.error('투표 실패:', err);
      alert('투표 중 오류가 발생했습니다.');
    }
  }, [report]);

  // 댓글 로드
  useEffect(() => {
    if (!report) return;

    // 실제 환경에서는 Firestore에서 댓글 로드
    const loadComments = async () => {
      try {
        // const commentsRef = collection(db, 'abuse_reports', report.id, 'comments');
        // const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
        // const commentsSnapshot = await getDocs(commentsQuery);
        // const commentsData = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // setComments(commentsData);
        
        // 현재는 빈 배열로 시작
        setComments([]);
      } catch (error) {
        console.error('댓글 로드 실패:', error);
        setComments([]);
      }
    };

    loadComments();
  }, [report?.id]);

  const handleCommentSubmit = useCallback(async () => {
    if (!report || !newCommentText.trim()) return;

    setCommentLoading(true);
    try {
      const newComment: Comment = {
        id: Date.now().toString(),
        text: newCommentText,
        authorName: '익명의 기사',
        createdAt: new Date().toISOString()
      };

      setComments(prev => [newComment, ...prev]);
      setNewCommentText('');
      
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setCommentLoading(false);
    }
  }, [report?.id, newCommentText]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/10 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mb-4"></div>
          <p className="text-gray-400">갑질 제보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/10 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || '제보를 찾을 수 없습니다.'}</p>
          <Link href="/vote" className="text-blue-400 hover:text-blue-300">
            제보 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/10 to-indigo-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src="/logo512.png" alt="용카 로고" className="w-12 h-12 rounded-xl" />
            <h1 className="text-2xl font-bold text-white">용카 갑질 제보</h1>
          </div>
        </div>

        {/* 제보 상세 정보 */}
        <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 mb-6">
          {/* 제목 및 메타 정보 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
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
            
            <h1 className="text-2xl font-bold text-white mb-2">{report.title}</h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>📅 {formatDate(report.created_at)}</span>
              <span>🗳️ {report.total_votes}표</span>
              <span>👁️ {report.view_count}회</span>
            </div>
          </div>

          {/* AI 총평 */}
          {report.ai_summary && (
            <div className="bg-red-600/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <h3 className="flex items-center gap-2 font-bold text-red-400 mb-2">
                <span className="text-xl">⚖️</span> 용카 AI 긴급 판독
              </h3>
              <p className="text-red-300 text-sm whitespace-pre-wrap">{report.ai_summary}</p>
            </div>
          )}

          {/* 제보 내용 */}
          {report.full_content && (
            <div className="bg-slate-900/30 border border-slate-600/30 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-white mb-3">📋 상세 제보 내용</h3>
              <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {report.full_content}
              </div>
            </div>
          )}

          {/* 원문 링크 */}
          {report.original_url && (
            <div className="mb-6">
              <h3 className="font-bold text-white mb-2">🔗 원문 링크</h3>
              <a 
                href={report.original_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm break-all"
              >
                {report.original_url}
              </a>
            </div>
          )}

          {/* 증거 이미지 섹션 */}
          {report.image_count && report.image_count > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-white mb-3">📷 증거 이미지 ({report.image_count}장)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: report.image_count }, (_, index) => {
                  // 실제 환경에서는 report.image_urls[index] 사용
                  const imageUrl = report.image_urls?.[index] || null;
                  
                  return (
                    <div key={index} className="relative group">
                      {imageUrl ? (
                        // 실제 이미지가 있는 경우
                        <div 
                          className="aspect-square bg-slate-800/50 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition-all duration-200 cursor-pointer overflow-hidden"
                          onClick={() => setSelectedImage(imageUrl)}
                        >
                          <img 
                            src={imageUrl} 
                            alt={`증거 이미지 ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <span className="text-white text-sm font-medium">🔍 확대보기</span>
                          </div>
                        </div>
                      ) : (
                        // 이미지 플레이스홀더
                        <div className="aspect-square bg-slate-800/50 rounded-lg p-4 text-center border border-slate-600/30 hover:border-blue-500/50 transition-all duration-200 flex flex-col items-center justify-center">
                          <div className="text-3xl mb-2">📷</div>
                          <p className="text-gray-400 text-xs mb-1">증거 이미지 {index + 1}</p>
                          <p className="text-gray-500 text-xs">로딩 중...</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* 이미지 업로드 상태 안내 */}
              {!report.image_urls && (
                <div className="mt-3 text-xs text-gray-400 bg-slate-800/30 p-3 rounded-lg">
                  💡 <strong>개발자 노트:</strong> 실제 환경에서는 Firebase Storage에 저장된 이미지가 표시됩니다. 
                  현재는 이미지 업로드 기능이 시뮬레이션 상태입니다.
                </div>
              )}
            </div>
          )}

          {/* 영상 재생 섹션 */}
          {report.video_count && report.video_count > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-white mb-3">🎥 증거 영상 ({report.video_count}개)</h3>
              <div className="space-y-3">
                {Array.from({ length: report.video_count }, (_, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">영상 {index + 1}</span>
                      <span className="text-xs text-gray-400">MP4 • 15.2MB</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-8 text-center">
                      <div className="text-4xl mb-2">🎥</div>
                      <p className="text-gray-400 text-sm mb-3">영상 미리보기</p>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        ▶️ 재생
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 음성 재생 섹션 */}
          {report.audio_count && report.audio_count > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-white mb-3">🎤 증거 음성 ({report.audio_count}개)</h3>
              <div className="space-y-3">
                {Array.from({ length: report.audio_count }, (_, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">음성 {index + 1}</span>
                      <span className="text-xs text-gray-400">MP3 • 3.7MB • 2:34</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center text-white transition-colors">
                        ▶️
                      </button>
                      <div className="flex-1">
                        <div className="bg-slate-700/50 rounded-full h-2 mb-1">
                          <div className="bg-green-500 h-2 rounded-full w-1/3"></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>0:52</span>
                          <span>2:34</span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-white transition-colors">
                        📥
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 투표 섹션 */}
        <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🗳️ 이 사례에 대한 의견을 투표해 주세요</h2>
          
          <div className="space-y-3">
            {report.vote_options.map((option) => {
              const percentage = report.total_votes > 0 ? Math.round((option.votes / report.total_votes) * 100) : 0;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  className="w-full text-left p-4 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 hover:border-red-500/50 rounded-lg transition-all duration-200"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{option.content}</span>
                    <span className="text-red-300 font-semibold">
                      {option.votes}표 ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-600/30 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              ※ 투표는 한 번만 가능하며, 결과는 실시간으로 반영됩니다.
            </p>
          </div>
        </div>

        {/* 공유 및 네비게이션 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={copyToClipboard}
            className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {copied ? '✅ 복사됨!' : '📋 제보 링크 공유'}
          </button>
          
          <Link
            href="/vote"
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all text-center"
          >
            📋 제보 목록으로 돌아가기
          </Link>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">💬 댓글 ({comments.length})</h2>
          
          {/* 댓글 작성 */}
          <div className="mb-6">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="이 제보에 대한 의견을 남겨주세요..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-white resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleCommentSubmit}
                disabled={commentLoading || !newCommentText.trim()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                {commentLoading ? '작성 중...' : '댓글 작성'}
              </button>
            </div>
          </div>

          {/* 댓글 목록 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-slate-900/30 border border-slate-600/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{comment.authorName}</span>
                    <span className="text-xs text-gray-400">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 하단 액션 버튼들 */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowDownloadDialog(true)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            📱 용카 앱 다운로드
          </button>
          
          <Link 
            href="https://yongcar.com/"
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-center"
          >
            🏠 용카 홈페이지 방문
          </Link>
          
          <button className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            🏢 투명대리점 - 용카 인증 구인 대리점
          </button>
        </div>

        {/* 이미지 확대 모달 */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-4xl max-h-full">
              <img 
                src={selectedImage} 
                alt="확대된 증거 이미지"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
              >
                ×
              </button>
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                클릭하여 닫기
              </div>
            </div>
          </div>
        )}

        {/* 앱 다운로드 다이얼로그 */}
        {showDownloadDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold text-white mb-4 text-center">용카 앱 다운로드</h3>
              <div className="space-y-3">
                <a
                  href="https://play.google.com/store/apps/details?id=com.yongcar.app&pcampaignid=web_share"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
                >
                  📱 안드로이드 다운로드
                </a>
                <a
                  href="https://apps.apple.com/kr/app/%EC%9A%A9%EC%B9%B4/id6758199533"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
                >
                  🍎 아이폰 다운로드
                </a>
              </div>
              <button
                onClick={() => setShowDownloadDialog(false)}
                className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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