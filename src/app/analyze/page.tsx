'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AnalyzePage() {
  const [selectedCompany, setSelectedCompany] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [terminalAddress, setTerminalAddress] = useState('');
  const [jobInfo, setJobInfo] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleWarningChange = (warning: string, checked: boolean) => {
    if (checked) {
      setWarnings([...warnings, warning]);
    } else {
      setWarnings(warnings.filter(w => w !== warning));
    }
  };

  const handleImageUpload = (files: FileList | null) => {
    if (files) {
      const newImages = Array.from(files).slice(0, 3 - uploadedImages.length);
      setUploadedImages([...uploadedImages, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!isFormValid) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 이미지를 base64로 변환
      const imagePromises = uploadedImages.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(imagePromises);

      // API 호출
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: selectedCompany,
          startAddress,
          terminalAddress,
          jobInfo,
          warnings,
          images: base64Images,
        }),
      });

      if (!response.ok) {
        throw new Error('분석 요청에 실패했습니다.');
      }

      const data = await response.json();

      // 결과 데이터를 상태에 반영하여 UI에 표시
      setAnalysisResult(data);

    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isFormValid = selectedCompany && uploadedImages.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
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
                    용카 라우트
                  </h1>
                </Link>
              </div>
            </div>
            <div className="text-center sm:text-left mt-2 mb-1 sm:mt-3 sm:mb-1">
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-300 leading-relaxed tracking-tight">
                택배 라우트 분석 - 지도와 구인정보를 입력하면<br className="sm:hidden" /> AI가 분석해 드립니다.
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
                <span className="text-xs">용카 소개</span>
              </span>
              <span className="text-center leading-tight">용카 기능 - 협력 업체 소개</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8 sm:mb-10">
          <div className="inline-flex bg-white/5 rounded-xl p-1 border border-white/10">
            <a
              href="/"
              className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 text-gray-400 hover:text-white"
            >
              분석 결과
            </a>
            <button className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 bg-blue-600 text-white shadow-lg">
              분석하기
            </button>
            <a
              href="/vote"
              className="px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 text-gray-400 hover:text-white"
            >
              갑질 투표
            </a>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          {/* Left Column - Input Forms */}
          <div className="space-y-6">
            {/* Image Upload Card */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">지도 이미지 업로드</h2>
                <p className="text-gray-400 text-xs sm:text-sm">
                  분석하고 싶은 지역의 지도를 최대 3장까지 업로드하세요<br className="hidden sm:block" />
                  <span className="text-xs opacity-75">(전체 지도 + 상세 골목 + 건물 현황 등)</span>
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">{uploadedImages.length}/3 이미지 업로드됨</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Uploaded Images */}
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative h-48 bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`업로드된 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Upload Areas */}
                  {Array.from({ length: 3 - uploadedImages.length }).map((_, index) => (
                    <label key={index} className="h-48 flex items-center justify-center cursor-pointer bg-gray-800/30 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 hover:bg-gray-800/40 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files)}
                      />
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4"></path>
                          </svg>
                        </div>
                        <p className="text-white font-medium text-sm mb-1">이미지 추가</p>
                        <p className="text-gray-500 text-xs">클릭 또는 드래그</p>
                      </div>
                    </label>
                  ))}
                </div>

                <p className="text-gray-500 text-xs text-center">
                  PNG, JPG, WEBP (각각 최대 10MB) • 전체 지도, 상세 골목, 건물 현황 등을 각각 업로드하세요
                </p>
              </div>
            </div>

            {/* Basic Info Card */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">기본 정보 입력</h2>
                <p className="text-gray-400 text-xs sm:text-sm">택배회사와 주소 정보를 입력하세요.</p>
              </div>

              {/* Company Selection */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm sm:text-base font-semibold text-white mb-2">
                  택배회사 선택 <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                >
                  <option value="">택배회사를 선택하세요</option>
                  <option value="씨제이">씨제이</option>
                  <option value="쿠팡주간">쿠팡주간</option>
                  <option value="쿠팡야간">쿠팡야간</option>
                  <option value="롯데">롯데</option>
                  <option value="한진">한진</option>
                  <option value="로젠">로젠</option>
                  <option value="씨제이오네">씨제이오네</option>
                  <option value="야간기타택배">야간기타택배</option>
                </select>
              </div>

              {/* Start Address */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm sm:text-base font-semibold text-white mb-2">출발 주소</label>
                <input
                  type="text"
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={startAddress}
                  onChange={(e) => setStartAddress(e.target.value)}
                />
              </div>

              {/* Terminal Address */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm sm:text-base font-semibold text-white mb-2">터미널 주소</label>
                <input
                  type="text"
                  placeholder="예: 경기도 수원시 영통구 월드컵로 456"
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={terminalAddress}
                  onChange={(e) => setTerminalAddress(e.target.value)}
                />
              </div>

              {/* Warnings */}
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm sm:text-base font-semibold text-white mb-3">주의사항 (선택항목)</label>
                <div className="space-y-2">
                  {[
                    "차량 구매 및 할부 유도",
                    "선입금 및 각종 비용 요구",
                    "비현실적 고수익 및 조건"
                  ].map((warning) => (
                    <label key={warning} className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        onChange={(e) => handleWarningChange(warning, e.target.checked)}
                      />
                      <span className="ml-3 text-sm sm:text-base text-gray-300 group-hover:text-white transition-colors">
                        {warning}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Job Info Card */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">구인 정보 입력</h2>
                <p className="text-gray-400 text-xs sm:text-sm">구인 정보를 복사 붙여 넣으세요.</p>
              </div>
              <textarea
                placeholder="수원 탑동, 단가 850원, 250개..."
                rows={6}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                value={jobInfo}
                onChange={(e) => setJobInfo(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleAnalyze}
              disabled={!isFormValid || isAnalyzing}
              className={`w-full text-base sm:text-lg lg:text-xl px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 ${isFormValid && !isAnalyzing
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
            >
              <span>{isAnalyzing ? 'AI 분석 중...' : '스마트 분석 시작하기'}</span>
            </button>
          </div>

          {/* Right Column - Analysis Result */}
          <div className="space-y-6">
            {isAnalyzing ? (
              <div className="bg-white/5 backdrop-blur-sm border border-blue-500/30 rounded-2xl text-center py-12 sm:py-16 lg:py-20 h-full min-h-[400px] flex flex-col justify-center animate-pulse">
                <div className="relative w-20 h-20 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-2xl"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-2xl animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src="/logo512.png" alt="용카" className="w-12 h-12 rounded-xl" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">용카 AI 분석 중</h3>
                <p className="text-blue-400 font-medium mb-4">지형 및 정보를 정밀 분석 중입니다</p>
                <div className="max-w-xs mx-auto w-full px-6">
                  <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[progress_2s_ease-in-out_infinite] w-1/3"></div>
                  </div>
                  <div className="flex justify-between mt-3 text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                    <span>Analyzing</span>
                    <span>Processing</span>
                  </div>
                </div>
              </div>
            ) : !analysisResult ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-center py-12 sm:py-16 lg:py-20 h-full min-h-[400px] flex flex-col justify-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">AI 분석 대기 중</h3>
                <p className="text-gray-400 text-base sm:text-lg max-w-md mx-auto leading-relaxed px-4">
                  지도 이미지와 구인 정보를 바탕으로<br />
                  <span className="font-semibold text-blue-400">용카 AI가 라우트를 정밀 분석</span>해드립니다
                </p>
                <div className="mt-8 flex justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse delay-75"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse delay-150"></span>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Result Header */}
                <div className="bg-blue-600/20 border-b border-white/10 p-6 sm:p-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-full border border-blue-500/30">
                      분석 완료
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {analysisResult.deliveryCompany} 라우트 리포트
                  </h3>
                  <p className="text-blue-400 font-medium flex items-center gap-2 text-sm sm:text-base">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {analysisResult.location?.name}
                  </p>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                  {/* Highlights */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <span className="text-xl">💬</span>
                      </div>
                      <p className="text-slate-200 text-sm sm:text-base italic leading-relaxed pt-1">
                        "{analysisResult.oneLiner}"
                      </p>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                        <span className="text-xl">✨</span>
                      </div>
                      <p className="text-indigo-100 font-bold text-base sm:text-lg pt-1">
                        {analysisResult.catchphrase}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-slate-400 text-xs mb-3 flex items-center gap-1">
                        <span>📊 종합 난이도</span>
                      </p>
                      <p className="text-amber-400 font-bold text-lg mb-2">{analysisResult.routeGrade?.overall}</p>
                      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full"
                          style={{ width: `${analysisResult.routeGrade?.fatigueScore}%` }}
                        ></div>
                      </div>
                      <p className="text-slate-500 text-[10px] mt-2 leading-tight">
                        {analysisResult.routeGrade?.reason}
                      </p>
                    </div>

                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-slate-400 text-xs mb-3">💰 실질 수익 (예상)</p>
                      <p className="text-emerald-400 font-bold text-lg mb-1">{analysisResult.realIncome}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>⛽ 유류비: {analysisResult.fuelCost?.dailyFuelCost}</span>
                      </div>
                      {analysisResult.fuelCost?.details && (
                        <p className="text-[10px] text-slate-600 mt-1 line-clamp-1 italic">{analysisResult.fuelCost.details}</p>
                      )}
                    </div>
                  </div>

                  {/* District Mix */}
                  <div className="bg-slate-800/30 p-5 rounded-xl border border-white/5">
                    <p className="text-slate-400 text-xs mb-4 uppercase tracking-widest font-semibold">House District Mix</p>
                    <div className="flex items-center gap-6">
                      <div className="flex-1 text-center">
                        <div className="text-xl font-bold text-blue-300 mb-1">{analysisResult.zoneRatio?.villa}%</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">빌라/지번</div>
                      </div>
                      <div className="w-px h-8 bg-white/10"></div>
                      <div className="flex-1 text-center">
                        <div className="text-xl font-bold text-indigo-300 mb-1">{analysisResult.zoneRatio?.apartment}%</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">아파트</div>
                      </div>
                    </div>
                  </div>

                  {/* Deep Analysis */}
                  <div>
                    <h4 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                      용카 AI 상세 리포트
                    </h4>
                    <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 max-h-[240px] overflow-y-auto custom-scrollbar">
                      <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                        {analysisResult.cafeText}
                      </p>
                    </div>
                  </div>

                  {/* Hazards */}
                  <div className="grid grid-cols-1 gap-2">
                    {analysisResult.warningPoints && Object.values(analysisResult.warningPoints).map((point: any, idx: number) => (
                      point && (
                        <div key={idx} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 flex gap-3">
                          <span className="text-red-400 shrink-0 select-none italic text-[10px] font-bold uppercase tracking-widest mt-0.5">Warning</span>
                          <p className="text-xs text-slate-300 leading-normal">{point.replace(/^⚠️\s*/, '')}</p>
                        </div>
                      )
                    ))}
                  </div>

                  {/* New Analysis Trigger */}
                  <button
                    onClick={() => {
                      setAnalysisResult(null);
                      setAnalysisError(null);
                    }}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-semibold rounded-xl border border-white/5 transition-all duration-200"
                  >
                    새로운 라우트 분석하기
                  </button>
                </div>
              </div>
            )}

            {!isAnalyzing && analysisError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                <span className="text-2xl mb-2 block">⚠️</span>
                <p className="text-red-400 text-sm mb-4">{analysisError}</p>
                <button
                  onClick={() => setAnalysisError(null)}
                  className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 text-xs font-bold rounded-lg transition-colors"
                >
                  확인
                </button>
              </div>
            )}
          </div>
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
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.92 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
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
                  <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
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


