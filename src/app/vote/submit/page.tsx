'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase-client';

// 갑질 및 이슈 제보 카테고리
const REPORT_CATEGORIES = [
  { id: 'abuse_power', label: '고객갑질' },
  { id: 'unpaid_fee', label: '지입사기' },
];

export default function SubmitAbuseReportPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [content, setContent] = useState('');
  const [additionalContent, setAdditionalContent] = useState('');
  const [category, setCategory] = useState('abuse_power'); // 기본값: 고객갑질
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [analyzingUrl, setAnalyzingUrl] = useState(false);
  const [urlAnalysis, setUrlAnalysis] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [analyzingImages, setAnalyzingImages] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<string>('');
  const [showAnalyzingDialog, setShowAnalyzingDialog] = useState(false);

  // 영상 및 음성 파일 상태 추가
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const [uploadedAudios, setUploadedAudios] = useState<File[]>([]);

  // 유튜브 제보 동의 여부 상태 추가
  const [youtubeConsent, setYoutubeConsent] = useState(false);

  // AI 제보 내용 정리 기능 - 간단하고 읽기 쉽게
  const generateContentSummary = () => {
    if (!title.trim() && !content.trim() && !additionalContent.trim()) return '';

    let summary = '';

    // 제목이 있으면 표시
    if (title.trim()) {
      summary += `${title}\n\n`;
    }

    // 메인 내용 정리
    if (content.trim()) {
      summary += `${content}\n\n`;
    }

    // 추가 내용이 있으면 추가
    if (additionalContent.trim()) {
      summary += `${additionalContent}\n\n`;
    }

    // 링크가 있으면 출처 표시
    if (originalUrl.trim()) {
      summary += `출처: ${originalUrl}`;
    }

    return summary.trim();
  };

  useEffect(() => {
    // URL 분석이나 이미지 분석 결과가 있으면 그것을 우선적으로 표시
    if (urlAnalysis || imageAnalysis) {
      setAiSummary(urlAnalysis || imageAnalysis);
    } else {
      setAiSummary(generateContentSummary());
    }
  }, [title, category, content, additionalContent, originalUrl, uploadedImages, uploadedVideos, uploadedAudios, urlAnalysis, imageAnalysis]);

  // URL 분석 함수
  const analyzeUrl = async (url: string) => {
    if (!url.trim()) return;

    setAnalyzingUrl(true);
    setShowAnalyzingDialog(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error('분석 요청 실패');

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setUrlAnalysis(data.yongcaSummary);
      setContent(data.extractedText);

    } catch (err: any) {
      setError(err.message || 'URL 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setAnalyzingUrl(false);
      setShowAnalyzingDialog(false);
    }
  };

  // URL 변경 시 자동 분석
  const handleUrlChange = (url: string) => {
    setOriginalUrl(url);
    if (url.trim() && (url.includes('http://') || url.includes('https://'))) {
      analyzeUrl(url);
    } else {
      setUrlAnalysis('');
    }
  };

  // 이미지 업로드 및 OCR 분석
  const handleImageUpload = async (files: FileList) => {
    if (files.length === 0) return;

    const newFiles = Array.from(files);
    const remainingSlots = 10 - uploadedImages.length;
    const selectedFiles = newFiles.slice(0, remainingSlots);

    if (selectedFiles.length === 0) {
      alert('최대 10장까지만 업로드할 수 있습니다.');
      return;
    }

    setUploadedImages(prev => [...prev, ...selectedFiles]);
    setAnalyzingImages(true);
    setShowAnalyzingDialog(true);

    try {
      // 1. 이미지를 Base64로 변환
      const filePromises = selectedFiles.map(async (file) => {
        return new Promise<{ name: string; data: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, data: reader.result as string });
          reader.readAsDataURL(file);
        });
      });

      const base64Files = await Promise.all(filePromises);

      // 2. API를 통해 Firebase Storage에 업로드
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: base64Files }),
      });

      if (!uploadResponse.ok) throw new Error('이미지 업로드 실패');

      const { urls } = await uploadResponse.json();
      setImageUrls(prev => [...prev, ...urls]);

      // 2. AI 분석 요청
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `이미지 데이터가 업로드되었습니다. ${selectedFiles.length}장의 사진 내용을 분석해 주세요.`,
          imageUrl: urls[0]
        }),
      });

      if (!response.ok) throw new Error('AI 분석 요청 실패');

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setImageAnalysis(data.yongcaSummary);
      setContent(prev => (prev ? prev + '\n\n' + data.extractedText : data.extractedText));
    } catch (err: any) {
      console.error('이미지 처리 오류:', err);
      setError(err.message || '이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setAnalyzingImages(false);
      setShowAnalyzingDialog(false);
    }
  };

  // 이미지 제거
  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    if (newImages.length === 0) {
      setImageAnalysis('');
    }
  };

  // 영상 업로드
  const handleVideoUpload = (files: FileList) => {
    if (files.length === 0) return;
    const selectedFiles = Array.from(files).slice(0, 3);
    setUploadedVideos(prev => [...prev, ...selectedFiles].slice(0, 3));
  };

  // 영상 제거
  const removeVideo = (index: number) => {
    const newVideos = uploadedVideos.filter((_, i) => i !== index);
    setUploadedVideos(newVideos);
  };

  // 음성 업로드
  const handleAudioUpload = (files: FileList) => {
    if (files.length === 0) return;
    const selectedFiles = Array.from(files).slice(0, 3);
    setUploadedAudios(prev => [...prev, ...selectedFiles].slice(0, 3));
  };

  // 음성 제거
  const removeAudio = (index: number) => {
    const newAudios = uploadedAudios.filter((_, i) => i !== index);
    setUploadedAudios(newAudios);
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Firebase Storage 업로드 함수 (실제 환경에서 활성화)
  /*
  const uploadFilesToStorage = async (files: File[], folder: string): Promise<string[]> => {
    const storage = getStorage();
    const uploadPromises = files.map(async (file) => {
      const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      return await getDownloadURL(snapshot.ref);
    });
    return await Promise.all(uploadPromises);
  };
  */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmissionLoading(true);
    setError(null);

    if (!originalUrl.trim() && !content.trim() && !additionalContent.trim() && uploadedImages.length === 0 && uploadedVideos.length === 0 && uploadedAudios.length === 0) {
      setError('제보 내용(링크, 사진, 영상, 음성, 혹은 글)을 하나 이상 입력해 주세요.');
      setSubmissionLoading(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newReportData = {
        title: title,
        summary: content.substring(0, 100) + '...',
        category: category,
        total_votes: 0,
        view_count: 0,
        // 갑질 판독을 위한 투표 옵션으로 변경
        vote_options: [
          { id: 'is_abuse', content: '명백한 갑질/사기다', votes: 0 },
          { id: 'not_sure', content: '애매하다/판단불가', votes: 0 },
          { id: 'is_normal', content: '흔히 있는 일이다', votes: 0 }
        ],
        created_at: serverTimestamp(),
        original_url: originalUrl || null,
        ai_summary: aiSummary,
        url_analysis: urlAnalysis || null,
        image_analysis: imageAnalysis || null,
        image_count: uploadedImages.length,
        video_count: uploadedVideos.length,
        audio_count: uploadedAudios.length,
        image_urls: imageUrls,
        video_urls: uploadedVideos.map((_, index) => `placeholder_video_${index + 1}.mp4`),
        audio_urls: uploadedAudios.map((_, index) => `placeholder_audio_${index + 1}.mp3`),
        full_content: content || null,
        additional_content: additionalContent || null,
        // 유튜브 콘텐츠 제작 희망 여부 저장
        is_youtube_candidate: youtubeConsent,
        status: 'pending_review' // 관리자 검토 후 노출
      };

      await addDoc(collection(db, 'abuse_reports'), newReportData);
      alert('갑질 제보가 완료되었습니다. 용카 AI가 내용을 검토 중입니다!');
      router.push('/vote');

    } catch (err) {
      setError('제보 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmissionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/20 to-indigo-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="p-1 bg-red-600 rounded-2xl animate-pulse">
              <img src="/logo512.png" alt="용카 로고" className="w-12 h-12 rounded-xl" />
            </div>
            <h1 className="text-2xl font-bold text-white">용카 갑질·사기 제보 센터</h1>
          </div>
          <p className="text-sm text-gray-300">억울한 일, 지입사기 의심 사례를 제보해 주세요. <br />익명을 철저히 보장하며 필요 시 유튜브 숏츠를 지원합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 space-y-6 shadow-2xl">
          {/* 제목 입력 */}
          <div>
            <label className="block text-red-400 font-bold mb-2">무슨 일이 있었나요?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 오늘 고객에게 어떤 갑질을 당하셨나요??"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-white"
              required
            />
          </div>

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-white font-medium mb-2">제보 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${category === cat.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 이미지/URL 업로드 */}
          <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-gray-400 mb-3"> 증거 사진(문자, 공문)이나 관련 링크를 첨부하면 AI 분석이 더 정확해집니다.</p>

            {/* URL 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">관련 링크 (선택)</label>
              <input
                type="url"
                value={originalUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://... (카페, 뉴스 등)"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white text-sm"
              />
              {analyzingUrl && (
                <p className="text-xs text-blue-400 mt-1">🔍 링크 분석 중...</p>
              )}
            </div>

            {/* 이미지 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📷 증거 사진 ({uploadedImages.length}/10장)
              </label>
              <div className="upload-area p-4 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                  disabled={uploadedImages.length >= 10}
                />
                <label htmlFor="image-upload" className={`cursor-pointer ${uploadedImages.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <div className="text-gray-400 text-sm">
                    {uploadedImages.length >= 10
                      ? '📷 최대 10장까지 업로드 가능'
                      : '📷 클릭하여 이미지 업로드 (JPG, PNG, WEBP)'
                    }
                  </div>
                </label>
              </div>

              {/* 업로드된 이미지 미리보기 */}
              {uploadedImages.length > 0 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {uploadedImages.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`업로드 ${index + 1}`}
                        className="w-full h-16 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {analyzingImages && (
                <p className="text-xs text-blue-400 mt-2">🔍 이미지 분석 중...</p>
              )}
            </div>

            {/* 영상 업로드 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">🎥 증거 영상 (최대 3개, 각 100MB 이하)</label>
              <div className="upload-area p-4 text-center">
                <input
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={(e) => e.target.files && handleVideoUpload(e.target.files)}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <div className="text-gray-400 text-sm">
                    🎥 클릭하여 영상 업로드 (MP4, MOV, AVI)
                  </div>
                </label>
              </div>

              {/* 업로드된 영상 목록 */}
              {uploadedVideos.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedVideos.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <span className="text-blue-400 text-xl">🎥</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{file.name}</p>
                          <p className="text-gray-400 text-xs">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 음성 업로드 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">🎤 증거 음성 (최대 3개, 각 50MB 이하)</label>
              <div className="upload-area p-4 text-center">
                <input
                  type="file"
                  multiple
                  accept="audio/*"
                  onChange={(e) => e.target.files && handleAudioUpload(e.target.files)}
                  className="hidden"
                  id="audio-upload"
                />
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <div className="text-gray-400 text-sm">
                    🎤 클릭하여 음성 업로드 (MP3, WAV, M4A)
                  </div>
                </label>
              </div>

              {/* 업로드된 음성 목록 */}
              {uploadedAudios.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedAudios.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                          <span className="text-green-400 text-xl">🎤</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{file.name}</p>
                          <p className="text-gray-400 text-xs">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAudio(index)}
                        className="w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 본문 입력 */}
          <div>
            <label className="block text-white font-medium mb-2">상세 제보 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="억울한 상황을 상세히 적어주세요. 용카 AI가 내용을 정리해드립니다."
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-white"
            />
          </div>

          {/* 추가 제보 내용 입력 */}
          <div>
            <label className="block text-white font-medium mb-2">추가 작성 제보 내용</label>
            <textarea
              value={additionalContent}
              onChange={(e) => setAdditionalContent(e.target.value)}
              rows={4}
              placeholder="추가로 전하고 싶은 내용이나 보충 설명을 작성해주세요. (선택사항)"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-white"
            />
            <p className="text-xs text-gray-400 mt-2">💡 추가 상황 설명, 요청사항, 기타 의견 등을 자유롭게 작성하세요.</p>
          </div>

          {/* 유튜브 제보 체크박스 - 핵심! */}
          <div className="flex items-start gap-3 p-4 bg-red-600/10 border border-red-500/30 rounded-xl">
            <input
              id="youtube"
              type="checkbox"
              checked={youtubeConsent}
              onChange={(e) => setYoutubeConsent(e.target.checked)}
              className="mt-1 w-5 h-5 accent-red-600"
            />
            <label htmlFor="youtube" className="text-sm cursor-pointer">
              <span className="font-bold text-red-400 block">유튜브 숏츠 제작 희망 (선택)</span>
              <span className="text-gray-400 text-xs">심각한 갑질로 판단될 경우, 용카 유튜브 채널 숏츠 업로드 합니다 100% 익명보장</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={submissionLoading}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 rounded-xl shadow-xl transition-all disabled:opacity-50"
          >
            {submissionLoading ? '용카 AI 분석 및 제보 중...' : '🔥 갑질 제보 (익명)'}
          </button>
        </form>

        {/* AI Content Summary Section */}
        {aiSummary && (
          <div className="mt-6 bg-slate-800 border-l-4 border-blue-500 rounded-r-xl p-5 shadow-lg">
            <h3 className="flex items-center gap-2 font-bold text-blue-400 mb-3">
              용카 AI 제보 내용 정리
            </h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* 하단 액션 버튼들 */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowDownloadDialog(true)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            용카 앱
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

        {/* AI 분석 중 다이얼로그 */}
        {showAnalyzingDialog && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse">
                  🤖
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">용카 AI 분석 중...</h3>
              <p className="text-gray-400 text-sm">
                이미지와 링크의 내용을 분석하여<br />핵심 내용을 정리하고 있습니다.
              </p>
              <div className="mt-6 flex justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></div>
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