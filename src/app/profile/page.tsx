'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SideNav from '../../components/SideNav';
import { makeAnalyzeSlug } from '../../lib/slug';

type Tab = 'profile' | 'favorites' | 'my-analyses' | 'my-discoveries';

interface AnalysisCard {
    analysisId?: string;
    id?: string;
    bldNm?: string;
    propertyTitle?: string;
    location?: { name?: string; address?: string };
    category?: string;
    riskScore?: string;
    detectiveNote?: string;
    oneLiner?: string;
    propertyGrade?: { riskScore?: string; overall?: string };
    createdAt?: string;
    likes?: string[];
}

const getScoreBadgeClasses = (score: string | undefined | null) => {
    const n = parseFloat(score || '0');
    // 높은 점수 = 우수(녹색), 중간 = 보통(황색), 낮은 점수 = 주의(적색)
    if (n >= 70) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (n >= 40) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (n > 0) return 'bg-rose-50 text-rose-600 border-rose-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
};

const formatScoreLabel = (score: string | undefined | null) => {
    const n = parseFloat(score || '0');
    if (!score || Number.isNaN(n) || n <= 0) return null;
    return `${Math.round(n)}점`;
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
};

const formatBudget = (b?: number) => { 
    if (!b) return ''; 
    return b >= 10000 ? `${(b / 10000).toFixed(1)}억원` : `${b.toLocaleString()}만원`; 
};

const catIconMap: Record<string, string> = {
  'land': '/land.svg',
  '토지': '/land.svg',
  'house': '/jutack.svg',
  '주택': '/jutack.svg',
  'apartment': '/apart.svg',
  '아파트': '/apart.svg',
  'building': '/build.svg',
  '빌딩': '/build.svg'
};

const Pagination = ({ page, totalPages, onPageChange }: { page: number, totalPages: number, onPageChange: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center gap-4 mt-6 py-4">
            <button 
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 transition-all focus:outline-none"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-xs font-bold text-slate-500">
                <span className="text-emerald-600">{page}</span> / {totalPages}
            </span>
            <button 
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 transition-all focus:outline-none"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
};

function ProfilePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>(() => {
        const queryTab = searchParams.get('tab') as Tab;
        if (queryTab && ['favorites', 'my-analyses', 'my-discoveries'].includes(queryTab)) {
            return queryTab;
        }
        return 'favorites';
    });

    useEffect(() => {
        const queryTab = searchParams.get('tab') as Tab;
        if (queryTab && ['favorites', 'my-analyses', 'my-discoveries'].includes(queryTab)) {
            setActiveTab(queryTab);
        }
    }, [searchParams]);
    const [showMobileHistory, setShowMobileHistory] = useState(false);

    const [favorites, setFavorites] = useState<AnalysisCard[]>([]);
    const [favLoading, setFavLoading] = useState(false);
    const [favPage, setFavPage] = useState(1);
    const [favTotalPages, setFavTotalPages] = useState(1);
    const [favTotalCount, setFavTotalCount] = useState(0);

    const [myAnalyses, setMyAnalyses] = useState<AnalysisCard[]>([]);
    const [myLoading, setMyLoading] = useState(false);
    const [myPage, setMyPage] = useState(1);
    const [myTotalPages, setMyTotalPages] = useState(1);
    const [myTotalCount, setMyTotalCount] = useState(0);

    const [myDiscoveries, setMyDiscoveries] = useState<any[]>([]);
    const [discLoading, setDiscLoading] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
            if (!currentUser) {
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (user) {
            loadFavorites();
            loadMyAnalyses();
            loadMyDiscoveries();
        }
    }, [user]);

    useEffect(() => {
        if (user && activeTab === 'favorites') {
            loadFavorites();
        }
        if (user && activeTab === 'my-analyses') {
            loadMyAnalyses();
        }
        if (user && activeTab === 'my-discoveries') {
            loadMyDiscoveries();
        }
    }, [activeTab]);

    const loadFavorites = async (page = 1) => {
        if (!user) return;
        setFavLoading(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/land/detective/my-favorites?page=${page}&limit=20`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });
            const data = await res.json();
            setFavorites(data.favorites || []);
            setFavPage(data.page || 1);
            setFavTotalPages(data.totalPages || 1);
            setFavTotalCount(data.total || 0);
        } catch {
            setFavorites([]);
        } finally {
            setFavLoading(false);
        }
    };

    const loadMyAnalyses = async (page = 1) => {
        if (!user) return;
        setMyLoading(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/land/detective/my-reports?page=${page}&limit=20`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });
            const data = await res.json();
            setMyAnalyses(data.analyses || []);
            setMyPage(data.page || 1);
            setMyTotalPages(data.totalPages || 1);
            setMyTotalCount(data.total || 0);
        } catch {
            setMyAnalyses([]);
        } finally {
            setMyLoading(false);
        }
    };

    const loadMyDiscoveries = async () => {
        if (!user) return;
        setDiscLoading(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/land/detective/my-discoveries`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            const data = await res.json();
            setMyDiscoveries(data.list || []);
        } catch {
            setMyDiscoveries([]);
        } finally {
            setDiscLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 5 * 1024 * 1024) {
            setUploadMsg('이미지는 5MB 이하만 가능합니다.');
            return;
        }

        setUploading(true);
        setUploadMsg(null);
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `profile-images/${user.uid}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            await updateProfile(user, { photoURL: downloadURL });
            await user.reload();
            setUser({ ...user, photoURL: downloadURL } as User);
            setUploadMsg('업로드 완료되었습니다!');
        } catch (err: any) {
            setUploadMsg('업로드 실패: ' + (err.message || '다시 시도해주세요.'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleLike = async (analysisId: string) => {
        if (!user) return;

        const updater = (prev: AnalysisCard[]) => prev.map(a => {
            if ((a.id || a.analysisId) === analysisId) {
                const isLiked = a.likes?.includes(user.uid);
                const newLikes = isLiked 
                    ? a.likes?.filter(uid => uid !== user.uid) || []
                    : [...(a.likes || []), user.uid];
                return { ...a, likes: newLikes };
            }
            return a;
        });

        setFavorites(updater);
        setMyAnalyses(updater);

        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/land/detective/reports/${analysisId}/like`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });
            const data = await res.json();
            if (data.success && data.likes) {
                const finalUpdater = (prev: AnalysisCard[]) => prev.map(a => {
                    const currentId = a.id?.toString() || a.analysisId?.toString();
                    return currentId === analysisId.toString() ? { ...a, likes: data.likes } : a;
                });
                setFavorites(finalUpdater);
                setMyAnalyses(finalUpdater);
            }
        } catch (e) {
            console.error("찜 토글 실패:", e);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen text-slate-900 relative bg-white flex overflow-x-hidden">
            <SideNav />

            <div className="lg:pl-16 flex-1 flex flex-col lg:grid lg:grid-cols-[minmax(0,25%)_minmax(0,75%)] min-h-screen min-w-0 overflow-x-hidden">
                
                {/* ── 좌측 패널 (3) ── */}
                <div className={`w-full bg-white border-b lg:border-b-0 lg:border-r border-slate-200/50 flex flex-col h-auto lg:h-screen lg:sticky lg:top-0 overflow-y-auto min-w-0 ${showMobileHistory ? 'hidden lg:flex' : 'flex'}`}>
                    <header className="px-4 lg:px-6 py-3 border-b border-slate-200/50 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 shrink-0 lg:hidden" />
                                <h1 className="text-lg font-black tracking-tighter text-black leading-none">
                                    내 기록
                                </h1>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setShowMobileHistory(true)}
                                    className="lg:hidden bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95"
                                >
                                    내역
                                </button>
                                <button
                                    onClick={() => {
                                        auth.signOut().then(() => router.replace('/login'));
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl border border-slate-250 text-slate-500 hover:text-rose-500 hover:border-rose-250 transition-colors text-[10px] font-extrabold tracking-tight"
                                >
                                    로그아웃
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* 본문 프로필 */}
                    <div className="p-5 space-y-6">
                        {/* 이미지 섹션 */}
                        <div className="flex flex-col items-center p-5 bg-slate-50/50 border border-slate-200/60 rounded-2xl">
                            <div className="relative mb-3.5">
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt="프로필"
                                        className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500/10 shadow-sm"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 text-2xl font-bold">
                                        {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-slate-950/40 rounded-full flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-extrabold rounded-xl transition-all shadow-sm"
                            >
                                {uploading ? '업로드 중...' : '이미지 수정'}
                            </button>

                            {uploadMsg && (
                                <p className={`text-[10px] font-bold mt-2.5 ${uploadMsg.startsWith('업로드 실패') ? 'text-rose-500' : 'text-emerald-600'}`}>
                                    {uploadMsg}
                                </p>
                            )}
                            <p className="text-[9px] text-slate-400 font-semibold mt-2.5">JPG, PNG, WEBP · 최대 5MB</p>
                        </div>

                        {/* 계정 텍스트 */}
                        <div className="space-y-3">
                            <h3 className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">계정 정보</h3>
                            
                            <div className="bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-2.5">
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">이름</label>
                                <p className="text-xs font-bold text-slate-800">{user.displayName || '이름 없음'}</p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-2.5">
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">이메일 주소</label>
                                <p className="text-xs font-bold text-slate-800">{user.email}</p>
                            </div>
                        </div>

                        {/* 활동 요약 */}
                        <div className="space-y-3">
                            <h3 className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">활동 요약</h3>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                                    <p className="text-xs font-black text-slate-800">{favTotalCount}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">찜 목록</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                                    <p className="text-xs font-black text-slate-800">{myTotalCount}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">분석 내역</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                                    <p className="text-xs font-black text-slate-800">{myDiscoveries.length}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">발견 기록</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── 우측 패널 (7) ── */}
                <div className={`w-full flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 min-w-0 max-w-full ${!showMobileHistory ? 'hidden lg:flex' : 'flex'}`}>
                    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/50 px-4 lg:px-6 pt-3.5 pb-3 lg:py-3 shrink-0 sticky top-0 z-50 min-w-0 max-w-full overflow-hidden">
                        <div className="flex items-center justify-between gap-3 mb-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-9 shrink-0 lg:hidden" />
                                <h2 className="text-lg font-black tracking-tighter text-black leading-none truncate">활동 내역</h2>
                            </div>
                            <button
                                onClick={() => setShowMobileHistory(false)}
                                className="lg:hidden bg-emerald-400 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all active:scale-95 shrink-0"
                            >
                                내 기록
                            </button>
                        </div>
                        
                        {/* 탭 — 모바일 가로 스크롤 (3탭 고정 배치 시 viewport 초과 방지) */}
                        <div className="min-w-0 -mx-4 px-4 lg:-mx-6 lg:px-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <div className="flex flex-nowrap border-b border-slate-100 w-max min-w-full">
                                {([
                                    { key: 'favorites', label: '찜한 매물' },
                                    { key: 'my-analyses', label: '내 분석 내역' },
                                    { key: 'my-discoveries', label: '발견 기록' },
                                ] as { key: Tab; label: string }[]).map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            setActiveTab(tab.key);
                                            router.replace(`/profile?tab=${tab.key}`);
                                        }}
                                        className={`shrink-0 whitespace-nowrap px-3 sm:px-5 py-2.5 text-xs font-extrabold border-b-2 transition-all -mb-px ${activeTab === tab.key ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    {/* 리스트 본문 */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 lg:px-6 py-5 pb-24 min-w-0">
                        
                        {/* 찜한 매물 */}
                        {activeTab === 'favorites' && (
                            <div>
                                {favLoading ? (
                                    <div className="flex justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : favorites.length === 0 ? (
                                    <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                                        <p className="text-slate-800 font-bold text-xs mb-1">찜한 매물이 없습니다</p>
                                        <p className="text-[10px] text-slate-450 font-semibold">매물 상세 페이지에서 하트 아이콘을 눌러 추가해보세요.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {favorites.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-white border border-slate-100 hover:border-emerald-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden min-w-0"
                                                onClick={() => router.push(`/analyze/${makeAnalyzeSlug(item.id!, item.bldNm)}`)}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center p-2">
                                                        <img src={catIconMap[item.category || ''] || '/land.svg'} alt="" className="w-full h-full object-contain" />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                                            <h3 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                                                                {item.propertyTitle || '부동산탐정 판독'}
                                                            </h3>
                                                            
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {(item.propertyGrade?.riskScore || (item as any).riskScore) && formatScoreLabel(item.propertyGrade?.riskScore || (item as any).riskScore) && (
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getScoreBadgeClasses(item.propertyGrade?.riskScore || (item as any).riskScore)}`}>
                                                                        AI평가 {formatScoreLabel(item.propertyGrade?.riskScore || (item as any).riskScore)}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleLike(item.id!);
                                                                    }}
                                                                    className="flex items-center gap-1 group/like text-sm transition-all focus:outline-none"
                                                                >
                                                                    <span className="text-rose-500 hover:text-rose-600 transition-colors">♥</span>
                                                                    <span className="text-[10px] font-bold text-slate-450">{item.likes?.length || 0}</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {item.location?.name && (
                                                            <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1">
                                                                <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                {item.location.name}
                                                            </p>
                                                        )}

                                                        {item.detectiveNote && (
                                                            <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5 mb-2">
                                                                <p className="text-[11px] text-emerald-800 font-bold line-clamp-1">
                                                                    {item.detectiveNote}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-2">
                                                            {item.category && (
                                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                                    {item.category === 'land' ? '토지' : item.category === 'house' ? '주택' : item.category === 'apartment' ? '아파트' : item.category === 'building' ? '빌딩' : item.category}
                                                                </span>
                                                            )}
                                                            {item.createdAt && (
                                                                <span className="text-[9px] text-slate-350 font-bold ml-auto">
                                                                    {formatDate(item.createdAt)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <Pagination page={favPage} totalPages={favTotalPages} onPageChange={loadFavorites} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 내 분석 내역 */}
                        {activeTab === 'my-analyses' && (
                            <div>
                                {myLoading ? (
                                    <div className="flex justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : myAnalyses.length === 0 ? (
                                    <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                                        <p className="text-slate-800 font-bold text-xs mb-1">분석 내역이 없습니다</p>
                                        <p className="text-[10px] text-slate-450 font-semibold mb-4">새로운 부동산에 대한 분석을 시작해보세요.</p>
                                        <Link
                                            href="/analyze"
                                            className="inline-block px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold rounded-xl transition-all shadow-sm"
                                        >
                                            분석하러 가기
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {myAnalyses.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-white border border-slate-100 hover:border-emerald-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden min-w-0"
                                                onClick={() => router.push(`/analyze/${makeAnalyzeSlug(item.id!, item.bldNm)}`)}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center p-2">
                                                        <img src={catIconMap[item.category || ''] || '/land.svg'} alt="" className="w-full h-full object-contain" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                                            <h3 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                                                                {item.propertyTitle || '부동산탐정 판독'}
                                                            </h3>
                                                            
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {item.propertyGrade?.riskScore && formatScoreLabel(item.propertyGrade.riskScore) && (
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getScoreBadgeClasses(item.propertyGrade.riskScore)}`}>
                                                                        AI평가 {formatScoreLabel(item.propertyGrade.riskScore)}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleLike(item.id!);
                                                                    }}
                                                                    className="flex items-center gap-1 group/like text-sm transition-all focus:outline-none"
                                                                >
                                                                    <span className={item.likes?.includes(user?.uid || '') ? 'text-rose-500' : 'text-slate-300'}>♥</span>
                                                                    <span className="text-[10px] font-bold text-slate-400">{item.likes?.length || 0}</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {item.location?.name && (
                                                            <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1">
                                                                <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                {item.location.name}
                                                            </p>
                                                        )}

                                                        {item.detectiveNote && (
                                                            <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5 mb-2">
                                                                <p className="text-[11px] text-emerald-800 font-bold line-clamp-1">
                                                                    {item.detectiveNote}
                                                                </p>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-2">
                                                            {item.category && (
                                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                                    {item.category === 'land' ? '토지' : item.category === 'house' ? '주택' : item.category === 'apartment' ? '아파트' : item.category === 'building' ? '빌딩' : item.category}
                                                                </span>
                                                            )}
                                                            {item.createdAt && (
                                                                <span className="text-[9px] text-slate-350 font-bold ml-auto">
                                                                    {formatDate(item.createdAt)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <Pagination page={myPage} totalPages={myTotalPages} onPageChange={loadMyAnalyses} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 발견 기록 */}
                        {activeTab === 'my-discoveries' && (
                            <div>
                                {discLoading ? (
                                    <div className="flex justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : myDiscoveries.length === 0 ? (
                                    <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                                        <p className="text-slate-800 font-bold text-xs mb-1">발견 기록이 없습니다</p>
                                        <p className="text-[10px] text-slate-450 font-semibold mb-4">AI 투자처 발굴 서비스를 이용해 우수 매물을 탐색해보세요.</p>
                                        <Link
                                            href="/discover"
                                            className="inline-block px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold rounded-xl transition-all shadow-sm"
                                        >
                                            발견하러 가기
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {myDiscoveries.map((item: any, idx: number) => {
                                            const id = item.id || item.historyId;
                                            const region = item.query?.sggNm || item.region || '지역 정보 없음';
                                            const budget = item.budget || item.query?.budget;
                                            const direction = item.direction || item.analysis?.regionalOutlook?.direction || '';
                                            const createdAt = item.created_at || item.createdAt;
                                            return (
                                                <div
                                                    key={id || idx}
                                                    className="bg-white border border-slate-100 hover:border-emerald-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden min-w-0"
                                                    onClick={() => router.push(`/discover/${id}`)}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center p-2">
                                                            <img src={catIconMap[item.category || ''] || '/land.svg'} alt="" className="w-full h-full object-contain" />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1 min-w-0 flex-1">
                                                                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    </svg>
                                                                    <span className="truncate">{region}</span>
                                                                </h3>
                                                                
                                                                {createdAt && (
                                                                    <span className="text-[9px] text-slate-355 font-bold shrink-0">{formatDate(createdAt)}</span>
                                                                )}
                                                            </div>

                                                            {budget && (
                                                                <p className="text-xs text-slate-400 font-semibold mb-2">
                                                                    예산 {budget >= 10000 ? `${(budget / 10000).toFixed(0)}억원` : `${budget.toLocaleString()}만원`}
                                                                </p>
                                                            )}

                                                            {direction && (
                                                                <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5 mb-2.5">
                                                                    <p className="text-[11px] text-emerald-800 font-bold line-clamp-2 leading-relaxed">
                                                                        {direction}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2">
                                                                {item.category && item.category !== 'all' && (
                                                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                                        {item.category === 'land' ? '토지' : item.category === 'house' ? '주택' : item.category === 'apartment' ? '아파트' : item.category === 'building' ? '빌딩' : item.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ProfilePageContent />
        </Suspense>
    );
}
