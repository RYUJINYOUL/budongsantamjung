'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { isAdminUser } from '@/lib/adminUids';
import { makeAnalyzeSlug } from '@/lib/slug';
import {
  approveListingRecom,
  fetchListingDetail,
  formatPriceEok,
  formatPricePerPyeong,
  rejectListingRecom,
  type ListingItem,
} from '@/lib/listingInventory';

const RECOM_MIN_SCORE = 60;

function MapEmbed({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(address)},${lat},${lng}`;
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
      <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="block">
        <div className="aspect-[16/10] flex items-center justify-center text-slate-500 text-sm font-semibold">
          지도에서 위치 보기 →
        </div>
      </a>
    </div>
  );
}

function SpecGrid({ item }: { item: ListingItem }) {
  const meta = item.listingMeta || {};
  const specs = [
    { label: '지목', value: meta.jimok },
    { label: '용도지역', value: meta.zoning },
    { label: '거래면적', value: item.pyeong != null ? `${item.pyeong.toLocaleString()}평` : null },
    { label: '㎡', value: item.areaM2 != null ? `${item.areaM2.toLocaleString()}㎡` : null },
    { label: '평당가', value: formatPricePerPyeong(item.budgetMan, item.pyeong) },
    { label: '도로조건', value: meta.roadCondition },
    { label: '규모', value: meta.buildingScale },
    { label: '노후', value: meta.buildingAge },
    { label: '현재용도', value: meta.buildingUse },
    { label: '매물번호', value: meta.externalListingId },
  ].filter((s) => s.value);

  if (!specs.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {specs.map((s) => (
        <div key={s.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="text-[11px] text-slate-500 font-semibold">{s.label}</div>
          <div className="text-sm font-bold text-slate-900 mt-1">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function ListingDetailClient({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [item, setItem] = useState<ListingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecomModal, setShowRecomModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = isAdminUser(user?.uid);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetchListingDetail(reportId);
    if (!data) {
      setError('매물을 찾을 수 없습니다.');
      setItem(null);
    } else {
      setItem(data);
      if (
        isAdminUser(user?.uid)
        && data.hasReport
        && data.recomEligible
        && data.publishStatus === 'lite'
        && !data.recomApprovedAt
      ) {
        setShowRecomModal(true);
      }
    }
    setLoading(false);
  }, [reportId, user?.uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAnalyze = () => {
    if (!item) return;
    router.push(`/analyze/${makeAnalyzeSlug(item.id, item.propertyTitle)}`);
  };

  const handleRecomDecision = async (approve: boolean) => {
    if (!user || !item) return;
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      const result = approve
        ? await approveListingRecom(token, item.id)
        : await rejectListingRecom(token, item.id);
      if (!result.success) {
        alert(result.error || '처리 실패');
      } else {
        setShowRecomModal(false);
        await load();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-4">
        <p className="text-slate-600 font-semibold">{error || '매물 없음'}</p>
        <Link href="/listings" className="text-emerald-600 font-bold text-sm">매물 목록으로</Link>
      </div>
    );
  }

  const meta = item.listingMeta || {};
  const priceLabel = formatPriceEok(item.budgetMan);
  const statusBadge = item.publishStatus === 'recom'
    ? { text: '추천', className: 'bg-emerald-100 text-emerald-800' }
    : item.hasReport
      ? { text: '분석완료', className: 'bg-blue-100 text-blue-800' }
      : { text: '매매중', className: 'bg-amber-100 text-amber-800' };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {showRecomModal && item.aiScore != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">추천 페이지 등록</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              AI 분석 점수 <strong>{item.aiScore}점</strong>입니다.
              추천 페이지에 등록해 드릴까요?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecomDecision(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 text-sm"
              >
                아니오
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecomDecision(true)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 font-bold text-white text-sm"
              >
                예, 등록
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/listings" className="text-sm font-bold text-slate-500">← 매물</Link>
          <span className="text-xs font-extrabold text-emerald-600">부동산탐정 매물</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {item.categoryLabel}
            </span>
            {item.aiScore != null && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-800">
                AI {item.aiScore}점
              </span>
            )}
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-snug">
            {meta.title || item.propertyTitle}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{item.address}</p>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="text-2xl font-extrabold text-slate-900">{priceLabel}</div>
          {meta.zoning && (
            <p className="text-sm text-slate-600 mt-1">&quot;{meta.zoning}&quot;</p>
          )}
          {meta.jimok && (
            <p className="text-xs text-slate-500 mt-2">{meta.jimok}</p>
          )}
        </section>

        {item.lat != null && item.lng != null && (
          <MapEmbed lat={item.lat} lng={item.lng} address={item.address} />
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900">매물 정보</h2>
          <SpecGrid item={item} />
          {meta.description && (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{meta.description}</p>
          )}
        </section>

        {item.hasReport && (item.oneLiner || item.detectiveNote) && (
          <section className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-emerald-800 mb-2">탐정 요약</h2>
            {item.oneLiner && <p className="text-sm font-bold text-slate-800">{item.oneLiner}</p>}
            {item.detectiveNote && (
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.detectiveNote}</p>
            )}
            <Link
              href={`/analyze/${makeAnalyzeSlug(item.id, item.propertyTitle)}`}
              className="inline-block mt-4 text-sm font-bold text-emerald-600"
            >
              전체 분석 보기 →
            </Link>
          </section>
        )}

        {(meta.brokerName || meta.brokerOffice) && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900 mb-3">중개사</h2>
            <p className="text-sm font-bold text-slate-800">{meta.brokerOffice || meta.brokerName}</p>
            {meta.brokerName && meta.brokerOffice && (
              <p className="text-xs text-slate-500 mt-1">담당 {meta.brokerName}</p>
            )}
            {meta.brokerPhone && (
              <a href={`tel:${meta.brokerPhone}`} className="text-sm font-bold text-emerald-600 mt-2 inline-block">
                {meta.brokerPhone}
              </a>
            )}
          </section>
        )}


        <div className="sticky bottom-4 flex gap-2">
          {!item.hasReport ? (
            <button
              type="button"
              onClick={handleAnalyze}
              className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-extrabold text-sm shadow-lg"
            >
              AI 분석하기
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAnalyze}
              className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm shadow-lg"
            >
              분석 리포트 열기
            </button>
          )}
        </div>

        {isAdmin && item.hasReport && item.recomEligible && item.publishStatus !== 'recom' && (
          <button
            type="button"
            onClick={() => setShowRecomModal(true)}
            className="w-full py-3 rounded-xl border border-emerald-300 text-emerald-700 font-bold text-sm"
          >
            추천 등록 ({RECOM_MIN_SCORE}점+) 다시 묻기
          </button>
        )}

        <p className="text-[10px] text-slate-400 leading-relaxed text-center px-2">
          본 매물 정보는 협력 중개사 제공 자료이며, 정확한 지번·권리관계는 현장·등기 확인이 필요합니다.
        </p>
      </main>
    </div>
  );
}
