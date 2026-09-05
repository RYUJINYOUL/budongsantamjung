'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SideNav from '../../components/SideNav';
import MyHomeWeeklyReportList from '../../components/my-home/MyHomeWeeklyReportList';
import { makeAnalyzeSlug } from '../../lib/slug';
import { fetchMyHomeWeeklyReports } from '../../lib/myHomeFirestore';
import { saveLastSeen } from '../../lib/myHomeReportUnread';
import type { MyHomeWeeklyReport } from '../../lib/myHomeTypes';
import PropertyCard from '../../components/PropertyCard';
import ApartmentCompareBasketBars, { ApartmentCompareBasketBar, useCompareBasketKeys } from '../../components/ApartmentCompareBasket';
import ApartmentAreaPickModal, { type ApartmentComparePickPayload } from '../../components/ApartmentAreaPickModal';
import { compareItemKey } from '../../lib/apartmentCompareBasket';
import { isAdminUser } from '../../lib/adminUids';

import AnalyzePanel from '../../components/AnalyzePanel';

type Tab = 'profile' | 'favorites' | 'my-analyses' | 'my-discoveries' | 'my-home' | 'admin-analyses' | 'admin-sourcing' | 'admin-listings';

const PROFILE_TABS: Tab[] = ['favorites', 'my-analyses', 'my-discoveries', 'my-home', 'admin-analyses', 'admin-sourcing', 'admin-listings'];

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
    aptSeq?: string | null;
    pnu?: string | null;
    riseRate6m?: number | null;
    avgPrice1m?: number | null;
    minArea?: number | null;
    maxArea?: number | null;
    exclusiveArea?: number | null;
    area?: number | null;
}

interface ApartmentGroup {
    groupKey: string;
    aptSeq?: number | null;
    pnu?: string | null;
    aptName: string;
    address?: string | null;
    reportCount: number;
    latestReportAt?: string | null;
    latestAiStatus?: string;
    latestReportId?: string | null;
}

interface ApartmentGroupReport {
    id: string;
    bldNm?: string | null;
    area?: string | number | null;
    price?: string | number | null;
    aiAnalysisStatus?: string;
    createdAt?: string | null;
}

interface AdminDigestItem {
    id: string;
    bldNm?: string | null;
    propertyTitle?: string;
    category?: string;
    address?: string;
    isFree?: boolean;
    isPaid?: boolean;
    isAdminReport?: boolean;
    riskScore?: string | null;
    analyzedAt?: string;
    createdAt?: string;
}

interface AdminDigestSummary {
    total: number;
    freeCount: number;
    paidCount: number;
    adminCount: number;
}

interface ListingRequestRow {
    id: number;
    category: string;
    sourceType: string;
    sourceId?: string | null;
    complexName?: string | null;
    address?: string | null;
    pyeongApprox?: number | null;
    budgetMan?: number | null;
    moveInTiming?: string | null;
    contactName: string;
    contactPhone: string;
    prefilledPriceMan?: number | null;
    status: string;
    createdAt?: string;
}

interface SourcingCandidateRow {
    reportId: string;
    address?: string | null;
    bldNm?: string | null;
    budgetMan?: number | null;
    aiScore?: number;
}

type AdminDigestFilter = 'all' | 'exclude_admin';
type SourcingCategory = 'land' | 'building';
type SourcingSort = 'ai_score_desc' | 'ai_score_asc' | 'price_desc' | 'price_asc';

function todayKstDateParts() {
    const iso = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
    const [year, month, day] = iso.split('-');
    return { year, month, day };
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

function buildAdminDateString(year: string, month: string, day: string) {
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function formatDateTime(dateString?: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
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
    if (!score || Number.isNaN(n) || n <= 0) return '준비';
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

const isApartmentCategory = (category?: string) =>
    category === '아파트' || category === 'apartment';

const compareKeyFromCard = (item: AnalysisCard) =>
    compareItemKey({
        masterId: item.aptSeq && !String(item.aptSeq).includes('-') ? item.aptSeq : undefined,
        rtmsAptSeq: item.aptSeq?.includes('-') ? item.aptSeq : undefined,
        exclusiveAreaM2: item.exclusiveArea ?? item.area ?? null,
    });

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
        if (queryTab && PROFILE_TABS.includes(queryTab)) {
            return queryTab;
        }
        return 'favorites';
    });

    useEffect(() => {
        const queryTab = searchParams.get('tab') as Tab;
        if (queryTab && PROFILE_TABS.includes(queryTab)) {
            setActiveTab(queryTab);
            if (queryTab === 'my-home') {
                setShowMobileHistory(true);
            }
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

    const [aptGroups, setAptGroups] = useState<ApartmentGroup[]>([]);
    const [aptGroupPage, setAptGroupPage] = useState(1);
    const [aptGroupTotalPages, setAptGroupTotalPages] = useState(1);
    const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
    const [expandedReports, setExpandedReports] = useState<ApartmentGroupReport[] | null>(null);
    const [loadingGroupReports, setLoadingGroupReports] = useState(false);

    const [myDiscoveries, setMyDiscoveries] = useState<any[]>([]);
    const [discLoading, setDiscLoading] = useState(false);

    const [weeklyReports, setWeeklyReports] = useState<MyHomeWeeklyReport[]>([]);
    const [weeklyReportsLoading, setWeeklyReportsLoading] = useState(false);

    const isAdmin = isAdminUser(user?.uid);
    const initialKst = todayKstDateParts();
    const [adminYear, setAdminYear] = useState(initialKst.year);
    const [adminMonth, setAdminMonth] = useState(initialKst.month);
    const [adminDay, setAdminDay] = useState(initialKst.day);
    const [adminFilter, setAdminFilter] = useState<AdminDigestFilter>('all');
    const [adminAnalyses, setAdminAnalyses] = useState<AdminDigestItem[]>([]);
    const [adminSummary, setAdminSummary] = useState<AdminDigestSummary | null>(null);
    const [adminLoading, setAdminLoading] = useState(false);
    const [adminPage, setAdminPage] = useState(1);
    const [adminTotalPages, setAdminTotalPages] = useState(1);

    const [sourcingCategory, setSourcingCategory] = useState<SourcingCategory>('land');
    const [sourcingSort, setSourcingSort] = useState<SourcingSort>('ai_score_desc');
    const [listingRequests, setListingRequests] = useState<ListingRequestRow[]>([]);
    const [listingRequestsLoading, setListingRequestsLoading] = useState(false);
    const [listingRequestsPage, setListingRequestsPage] = useState(1);
    const [listingRequestsTotalPages, setListingRequestsTotalPages] = useState(1);
    const [sourcingCandidates, setSourcingCandidates] = useState<SourcingCandidateRow[]>([]);
    const [sourcingCandidatesLoading, setSourcingCandidatesLoading] = useState(false);
    const [sourcingCandidatesPage, setSourcingCandidatesPage] = useState(1);
    const [sourcingCandidatesTotalPages, setSourcingCandidatesTotalPages] = useState(1);

    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const compareBasketKeys = useCompareBasketKeys();
    const [comparePickPending, setComparePickPending] = useState<ApartmentComparePickPayload | null>(null);
    const [compareToast, setCompareToast] = useState<string | null>(null);

    const handleAddApartmentToCompare = useCallback((item: AnalysisCard) => {
        const areaRaw = item.exclusiveArea ?? item.area;
        const exclusiveAreaM2 = areaRaw != null ? Number(areaRaw) : null;
        const rtms = item.aptSeq?.includes('-') ? item.aptSeq : undefined;
        const masterId = item.aptSeq && !item.aptSeq.includes('-') ? item.aptSeq : undefined;
        setComparePickPending({
            masterId: masterId ? String(masterId) : undefined,
            rtmsAptSeq: rtms ? String(rtms) : undefined,
            complexName: item.bldNm || item.propertyTitle || undefined,
            suggestedAreaM2: Number.isFinite(exclusiveAreaM2) ? exclusiveAreaM2 : null,
        });
    }, []);

    const handleCompareBasketFeedback = useCallback((message: string) => {
        setCompareToast(message);
        window.setTimeout(() => setCompareToast(null), 2800);
    }, []);

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
        if (!user) return;
        if (activeTab === 'favorites') {
            loadFavorites();
        } else if (activeTab === 'my-analyses') {
            loadMyAnalyses();
        } else if (activeTab === 'my-discoveries') {
            loadMyDiscoveries();
        } else if (activeTab === 'my-home') {
            loadWeeklyReports();
        } else if (activeTab === 'admin-analyses' && isAdmin) {
            loadAdminAnalyses(adminPage);
        } else if (activeTab === 'admin-sourcing' && isAdmin) {
            loadAdminListingRequests(listingRequestsPage);
            loadAdminSourcingCandidates(sourcingCandidatesPage);
        }
    }, [user, activeTab, isAdmin, adminPage, adminYear, adminMonth, adminDay, adminFilter, listingRequestsPage, sourcingCandidatesPage, sourcingCategory, sourcingSort]);

    const loadAdminListingRequests = async (page = 1) => {
        if (!user || !isAdmin) return;
        setListingRequestsLoading(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(
                `/api/land/detective/admin/listing-requests?page=${page}&limit=20`,
                { headers: { Authorization: `Bearer ${idToken}` } },
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '조회 실패');
            setListingRequests(data.requests || []);
            setListingRequestsPage(data.page || 1);
            setListingRequestsTotalPages(data.totalPages || 1);
        } catch {
            setListingRequests([]);
        } finally {
            setListingRequestsLoading(false);
        }
    };

    const loadAdminSourcingCandidates = async (page = 1) => {
        if (!user || !isAdmin) return;
        setSourcingCandidatesLoading(true);
        try {
            const idToken = await user.getIdToken();
            const params = new URLSearchParams({
                category: sourcingCategory,
                sortBy: sourcingSort,
                page: String(page),
                limit: '20',
            });
            const res = await fetch(
                `/api/land/detective/admin/sourcing-candidates?${params}`,
                { headers: { Authorization: `Bearer ${idToken}` } },
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '조회 실패');
            setSourcingCandidates(data.items || []);
            setSourcingCandidatesPage(data.page || 1);
            setSourcingCandidatesTotalPages(data.totalPages || 1);
        } catch {
            setSourcingCandidates([]);
        } finally {
            setSourcingCandidatesLoading(false);
        }
    };

    const loadAdminAnalyses = async (page = 1) => {
        if (!user || !isAdmin) return;
        setAdminLoading(true);
        try {
            const date = buildAdminDateString(adminYear, adminMonth, adminDay);
            const excludeAdmin = adminFilter === 'exclude_admin' ? '1' : '0';
            const idToken = await user.getIdToken();
            const res = await fetch(
                `/api/land/detective/admin/analyses-by-date?date=${date}&page=${page}&limit=20&excludeAdmin=${excludeAdmin}`,
                { headers: { Authorization: `Bearer ${idToken}` } },
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '조회 실패');
            setAdminAnalyses(data.analyses || []);
            setAdminSummary(data.summary || null);
            setAdminPage(data.page || 1);
            setAdminTotalPages(data.totalPages || 1);
        } catch {
            setAdminAnalyses([]);
            setAdminSummary(null);
        } finally {
            setAdminLoading(false);
        }
    };

    const handleAdminDatePartChange = (part: 'year' | 'month' | 'day', value: string) => {
        let nextYear = adminYear;
        let nextMonth = adminMonth;
        let nextDay = adminDay;
        if (part === 'year') nextYear = value;
        if (part === 'month') nextMonth = value.padStart(2, '0');
        if (part === 'day') nextDay = value.padStart(2, '0');
        const maxDay = daysInMonth(Number(nextYear), Number(nextMonth));
        if (Number(nextDay) > maxDay) {
            nextDay = String(maxDay).padStart(2, '0');
        }
        setAdminYear(nextYear);
        setAdminMonth(nextMonth);
        setAdminDay(nextDay);
        setAdminPage(1);
    };

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

    const loadApartmentGroups = async (page = 1) => {
        if (!user) return;
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/land/detective/apartment-groups?page=${page}&limit=20`, {
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await res.json();
            setAptGroups(data.groups || []);
            setAptGroupPage(data.page || 1);
            setAptGroupTotalPages(data.totalPages || 1);
        } catch {
            setAptGroups([]);
        }
    };

    const loadOtherAnalyses = async (page = 1) => {
        if (!user) return;
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/land/detective/my-reports?page=${page}&limit=20`, {
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await res.json();
            const allAnalyses = data.analyses || [];
            setMyAnalyses(allAnalyses);
            setMyPage(data.page || 1);
            setMyTotalPages(data.totalPages || 1);
            setMyTotalCount(data.total || 0);
        } catch {
            setMyAnalyses([]);
        }
    };

    const loadMyAnalyses = async () => {
        if (!user) return;
        setMyLoading(true);
        try {
            await loadOtherAnalyses(myPage);
        } finally {
            setMyLoading(false);
        }
    };

    const loadApartmentGroupReports = async (groupKey: string) => {
        if (!user) return;
        setLoadingGroupReports(true);
        try {
            const idToken = await user.getIdToken();
            const encoded = encodeURIComponent(groupKey);
            const res = await fetch(`/api/land/detective/apartment-groups/${encoded}/reports?scope=mine`, {
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await res.json();
            setExpandedReports(data.reports || []);
        } catch {
            setExpandedReports([]);
        } finally {
            setLoadingGroupReports(false);
        }
    };

    const toggleApartmentGroup = async (group: ApartmentGroup) => {
        if (expandedGroupKey === group.groupKey) {
            setExpandedGroupKey(null);
            setExpandedReports(null);
            return;
        }
        setExpandedGroupKey(group.groupKey);
        setExpandedReports(null);
        await loadApartmentGroupReports(group.groupKey);
    };

    const openApartmentPage = (group: ApartmentGroup) => {
        if (group.latestReportId) {
            router.push(`/analyze/${makeAnalyzeSlug(group.latestReportId)}`);
            return;
        }
        router.push('/?category=아파트');
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

    const loadWeeklyReports = async () => {
        if (!user) return;
        setWeeklyReportsLoading(true);
        try {
            const reps = await fetchMyHomeWeeklyReports(user.uid, 12);
            setWeeklyReports(reps);
            if (reps.length > 0) {
                saveLastSeen(reps[0].weekKey, reps[0].createdAtMs);
            }
        } catch {
            setWeeklyReports([]);
        } finally {
            setWeeklyReportsLoading(false);
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
                                    { key: 'my-home' as Tab, label: '우리집' },
                                    { key: 'favorites' as Tab, label: '찜한 매물' },
                                    { key: 'my-analyses' as Tab, label: '내 분석 내역' },
                                    { key: 'my-discoveries' as Tab, label: '발견 기록' },
                                    ...(isAdmin ? [
                                        { key: 'admin-listings' as Tab, label: '매물 등록' },
                                        { key: 'admin-analyses' as Tab, label: 'AI 분석 현황' },
                                        { key: 'admin-sourcing' as Tab, label: '매물 소싱' },
                                    ] : []),
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

                        {/* 우리집 · 주간 리포트 */}
                        {activeTab === 'my-home' && (
                            <div className="space-y-4">
                                <MyHomeWeeklyReportList
                                    reports={weeklyReports}
                                    loading={weeklyReportsLoading}
                                    title="우리집 · 주간 AI 리포트"
                                />

                                {!weeklyReportsLoading && weeklyReports.length === 0 && (
                                    <div className="text-center py-12 bg-white border border-slate-200/80 rounded-2xl shadow-sm px-5">
                                        <p className="text-slate-900 font-bold text-sm mb-2">주간 AI 리포트가 없어요</p>
                                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto mb-4">
                                            우리집을 등록하면 매주 AI 주간 리포트를 받을 수 있어요.
                                        </p>
                                    </div>
                                )}

                                <div className="text-center py-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm px-5">
                                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto mb-4">
                                        우리집 등록, 비교 단지 설정은 우리집 페이지에서 관리합니다.
                                    </p>
                                    <Link
                                        href="/my-home"
                                        className="inline-block px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold rounded-xl transition-all shadow-sm shadow-emerald-500/20"
                                    >
                                        우리집 페이지 열기
                                    </Link>
                                </div>
                            </div>
                        )}

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
                                        <ApartmentCompareBasketBar anchor="inline" />
                                        {favorites.map((item) => {
                                            const isApartment = isApartmentCategory(item.category);
                                            return (
                                            <PropertyCard
                                                key={item.id}
                                                data={{
                                                    id: item.id!,
                                                    bldNm: item.bldNm,
                                                    propertyTitle: item.propertyTitle,
                                                    location: item.location,
                                                    category: item.category,
                                                    detectiveNote: item.detectiveNote,
                                                    propertyGrade: item.propertyGrade,
                                                    likes: item.likes,
                                                    createdAt: item.createdAt,
                                                    riseRate6m: item.riseRate6m,
                                                    avgPrice1m: item.avgPrice1m,
                                                    minArea: item.minArea,
                                                    maxArea: item.maxArea,
                                                    exclusiveArea: item.exclusiveArea,
                                                    area: item.area,
                                                }}
                                                currentUid={user?.uid}
                                                inCompareBasket={isApartment && compareBasketKeys.has(compareKeyFromCard(item))}
                                                onAddToCompare={isApartment ? () => handleAddApartmentToCompare(item) : undefined}
                                                onLikeToggle={(id, e) => toggleLike(id)}
                                                onClick={() => {
                                                    router.push(`/analyze/${makeAnalyzeSlug(item.id!, item.bldNm)}`);
                                                }}
                                            />
                                            );
                                        })}
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
                                    <div className="space-y-6">
                                        <ApartmentCompareBasketBar anchor="inline" />
                                        <div className="space-y-3">
                                            {myAnalyses.map((item) => {
                                                const isApartment = isApartmentCategory(item.category);
                                                return (
                                                <PropertyCard
                                                    key={item.id}
                                                    data={{
                                                        id: item.id!,
                                                        bldNm: item.bldNm,
                                                        propertyTitle: item.propertyTitle,
                                                        location: item.location,
                                                        category: item.category,
                                                        detectiveNote: item.detectiveNote,
                                                        propertyGrade: item.propertyGrade,
                                                        likes: item.likes,
                                                        createdAt: item.createdAt,
                                                        riseRate6m: item.riseRate6m,
                                                        avgPrice1m: item.avgPrice1m,
                                                        minArea: item.minArea,
                                                        maxArea: item.maxArea,
                                                        exclusiveArea: item.exclusiveArea,
                                                        area: item.area,
                                                    }}
                                                    currentUid={user?.uid}
                                                    inCompareBasket={isApartment && compareBasketKeys.has(compareKeyFromCard(item))}
                                                    onAddToCompare={isApartment ? () => handleAddApartmentToCompare(item) : undefined}
                                                    onLikeToggle={(id, e) => toggleLike(id)}
                                                    onClick={() => {
                                                        router.push(`/analyze/${makeAnalyzeSlug(item.id!, item.bldNm)}`);
                                                    }}
                                                />
                                                );
                                            })}
                                        </div>
                                        <Pagination
                                            page={myPage}
                                            totalPages={myTotalPages}
                                            onPageChange={async (p) => {
                                                setMyPage(p);
                                                setMyLoading(true);
                                                await loadOtherAnalyses(p);
                                                setMyLoading(false);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 관리자 — 날짜별 AI 분석 */}
                        {activeTab === 'admin-listings' && isAdmin && (
                            <div className="space-y-4 max-w-lg">
                                <div className="h-[min(720px,75vh)] border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                    <AnalyzePanel listingRegisterMode />
                                </div>
                                <div className="text-center py-2">
                                    <Link
                                        href="/listings"
                                        className="text-sm font-bold text-emerald-600 hover:underline"
                                    >
                                        등록된 매물 목록 보기 →
                                    </Link>
                                </div>
                            </div>
                        )}

                        {activeTab === 'admin-analyses' && isAdmin && (
                            <div className="space-y-4">
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
                                    <div>
                                        <p className="text-xs font-black text-slate-800 mb-1">날짜 선택 (KST)</p>
                                        <p className="text-[10px] text-slate-450 font-semibold mb-3">AI 분석 완료 · <span className="text-slate-500">무료=하루 1회, 유료=2회째·일일패스·결제</span></p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                value={adminYear}
                                                onChange={(e) => handleAdminDatePartChange('year', e.target.value)}
                                                className="h-9 px-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                                            >
                                                {Array.from({ length: 4 }, (_, i) => {
                                                    const y = String(Number(initialKst.year) - 2 + i);
                                                    return <option key={y} value={y}>{y}년</option>;
                                                })}
                                            </select>
                                            <select
                                                value={adminMonth}
                                                onChange={(e) => handleAdminDatePartChange('month', e.target.value)}
                                                className="h-9 px-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                                            >
                                                {Array.from({ length: 12 }, (_, i) => {
                                                    const m = String(i + 1).padStart(2, '0');
                                                    return <option key={m} value={m}>{Number(m)}월</option>;
                                                })}
                                            </select>
                                            <select
                                                value={adminDay}
                                                onChange={(e) => handleAdminDatePartChange('day', e.target.value)}
                                                className="h-9 px-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                                            >
                                                {Array.from({ length: daysInMonth(Number(adminYear), Number(adminMonth)) }, (_, i) => {
                                                    const d = String(i + 1).padStart(2, '0');
                                                    return <option key={d} value={d}>{Number(d)}일</option>;
                                                })}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setAdminFilter('all'); setAdminPage(1); }}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-colors ${adminFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            전체
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setAdminFilter('exclude_admin'); setAdminPage(1); }}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-colors ${adminFilter === 'exclude_admin' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                        >
                                            관리자분석제외
                                        </button>
                                    </div>

                                    {adminSummary && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2 text-center">
                                                <p className="text-sm font-black text-slate-800">{adminSummary.total}</p>
                                                <p className="text-[9px] font-bold text-slate-400">총 분석</p>
                                            </div>
                                            <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 px-3 py-2 text-center">
                                                <p className="text-sm font-black text-emerald-700">{adminSummary.freeCount}</p>
                                                <p className="text-[9px] font-bold text-emerald-600">무료</p>
                                            </div>
                                            <div className="rounded-xl bg-sky-50/70 border border-sky-100 px-3 py-2 text-center">
                                                <p className="text-sm font-black text-sky-700">{adminSummary.paidCount}</p>
                                                <p className="text-[9px] font-bold text-sky-600">유료</p>
                                            </div>
                                            <div className="rounded-xl bg-violet-50/70 border border-violet-100 px-3 py-2 text-center">
                                                <p className="text-sm font-black text-violet-700">{adminSummary.adminCount}</p>
                                                <p className="text-[9px] font-bold text-violet-600">관리자</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {adminLoading ? (
                                    <div className="flex justify-center py-16">
                                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : adminAnalyses.length === 0 ? (
                                    <div className="text-center py-14 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                                        <p className="text-slate-800 font-bold text-xs">해당 날짜에 AI 분석 완료 건이 없습니다</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {adminAnalyses.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => router.push(`/analyze/${makeAnalyzeSlug(item.id, item.bldNm || item.propertyTitle)}`)}
                                                className="w-full text-left bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-black text-slate-900 truncate">
                                                            {item.bldNm || item.propertyTitle || '매물'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">{item.address}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-1">{formatDateTime(item.analyzedAt || item.createdAt)}</p>
                                                    </div>
                                                    <div className="shrink-0 flex flex-col items-end gap-1">
                                                        {item.riskScore && (
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${getScoreBadgeClasses(item.riskScore)}`}>
                                                                AI {formatScoreLabel(item.riskScore)}
                                                            </span>
                                                        )}
                                                        <div className="flex flex-wrap justify-end gap-1">
                                                            {item.isFree ? (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">무료</span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600 border border-sky-100">유료</span>
                                                            )}
                                                            {item.isAdminReport && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-100">관리자</span>
                                                            )}
                                                            {item.category && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{item.category}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        <Pagination
                                            page={adminPage}
                                            totalPages={adminTotalPages}
                                            onPageChange={(p) => setAdminPage(p)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 관리자 — 매물 소싱 */}
                        {activeTab === 'admin-sourcing' && isAdmin && (
                            <div className="space-y-6">
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
                                    <div>
                                        <p className="text-xs font-black text-slate-800 mb-1">소싱 의뢰 큐</p>
                                        <p className="text-[10px] text-slate-450 font-semibold">Lite · AI 상세 CTA에서 접수된 의뢰</p>
                                    </div>
                                    {listingRequestsLoading ? (
                                        <div className="flex justify-center py-10">
                                            <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : listingRequests.length === 0 ? (
                                        <p className="text-center text-[11px] text-slate-500 font-semibold py-8">접수된 의뢰가 없습니다</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {listingRequests.map((req) => (
                                                <div
                                                    key={req.id}
                                                    className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-3"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-slate-900 truncate">
                                                                {req.complexName || req.address || '매물'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                                                {req.category} · {req.contactName} · {req.contactPhone}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold mt-1">
                                                                {formatDateTime(req.createdAt)}
                                                                {req.budgetMan ? ` · 예산 ${formatBudget(req.budgetMan)}` : ''}
                                                                {req.pyeongApprox ? ` · ${req.pyeongApprox}평` : ''}
                                                                {req.moveInTiming ? ` · ${req.moveInTiming}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            {req.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            <Pagination
                                                page={listingRequestsPage}
                                                totalPages={listingRequestsTotalPages}
                                                onPageChange={(p) => setListingRequestsPage(p)}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
                                    <div>
                                        <p className="text-xs font-black text-slate-800 mb-1">소싱 후보 (토지·빌딩)</p>
                                        <p className="text-[10px] text-slate-450 font-semibold">AI 분석 완료 · AI점수·예산 기준</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(['land', 'building'] as SourcingCategory[]).map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => { setSourcingCategory(cat); setSourcingCandidatesPage(1); }}
                                                className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-colors ${sourcingCategory === cat ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {cat === 'land' ? '토지' : '빌딩'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {([
                                            { key: 'ai_score_desc' as SourcingSort, label: 'AI점수 ↓' },
                                            { key: 'price_desc' as SourcingSort, label: '예산 ↓' },
                                            { key: 'price_asc' as SourcingSort, label: '예산 ↑' },
                                        ]).map((opt) => (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => { setSourcingSort(opt.key); setSourcingCandidatesPage(1); }}
                                                className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-colors ${sourcingSort === opt.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {sourcingCandidatesLoading ? (
                                        <div className="flex justify-center py-10">
                                            <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : sourcingCandidates.length === 0 ? (
                                        <p className="text-center text-[11px] text-slate-500 font-semibold py-8">후보가 없습니다</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {sourcingCandidates.map((item) => (
                                                <button
                                                    key={item.reportId}
                                                    type="button"
                                                    onClick={() => router.push(`/analyze/${makeAnalyzeSlug(item.reportId, item.bldNm || item.address)}`)}
                                                    className="w-full text-left bg-slate-50/50 border border-slate-100 rounded-xl p-3 hover:border-emerald-200 transition-all"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-slate-900 truncate">{item.bldNm || item.address || '매물'}</p>
                                                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">{item.address}</p>
                                                            {item.budgetMan ? (
                                                                <p className="text-[10px] text-slate-400 font-bold mt-1">예산 {formatBudget(item.budgetMan)}</p>
                                                            ) : null}
                                                        </div>
                                                        {item.aiScore != null && item.aiScore > 0 && (
                                                            <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg border ${getScoreBadgeClasses(String(item.aiScore))}`}>
                                                                AI {formatScoreLabel(String(item.aiScore))}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                            <Pagination
                                                page={sourcingCandidatesPage}
                                                totalPages={sourcingCandidatesTotalPages}
                                                onPageChange={(p) => setSourcingCandidatesPage(p)}
                                            />
                                        </div>
                                    )}
                                </div>
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
                                        <p className="text-slate-800 font-bold text-xs mb-1">저장된 기록이 없습니다</p>
                                        <p className="text-[10px] text-slate-450 font-semibold mb-4">아파트 비교에서 「저장하기」로 비교 세트를 보관할 수 있습니다.</p>
                                        <Link
                                            href="/compare/apartments"
                                            className="inline-block px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold rounded-xl transition-all shadow-sm"
                                        >
                                            단지 비교하러 가기
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {myDiscoveries.map((item: any, idx: number) => {
                                            const id = item.id || item.historyId;
                                            const isCompare = item.category === 'apartment_compare';
                                            const region = isCompare
                                                ? (item.propertyTitle || item.property_title || '아파트 단지 비교')
                                                : (item.query?.sggNm || item.region || '지역 정보 없음');
                                            const budget = item.budget || item.query?.budget;
                                            const direction = item.direction || item.analysis?.regionalOutlook?.direction || '';
                                            const createdAt = item.created_at || item.createdAt;
                                            const href = isCompare
                                                ? `/compare/apartments?saved=${id}`
                                                : `/discover/${id}`;
                                            return (
                                                <div
                                                    key={id || idx}
                                                    className="bg-white border border-slate-100 hover:border-emerald-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden min-w-0"
                                                    onClick={() => router.push(href)}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center p-2">
                                                            <img
                                                                src={isCompare ? '/apart.svg' : (catIconMap[item.category || ''] || '/land.svg')}
                                                                alt=""
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1 min-w-0 flex-1">
                                                                    {!isCompare && (
                                                                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    </svg>
                                                                    )}
                                                                    <span className="truncate">{region}</span>
                                                                </h3>
                                                                
                                                                {createdAt && (
                                                                    <span className="text-[9px] text-slate-355 font-bold shrink-0">{formatDate(createdAt)}</span>
                                                                )}
                                                            </div>

                                                            {isCompare ? (
                                                                <p className="text-xs text-slate-400 font-semibold mb-2">
                                                                    {direction || '단지 비교'} · 다시 비교하기
                                                                </p>
                                                            ) : budget ? (
                                                                <p className="text-xs text-slate-400 font-semibold mb-2">
                                                                    예산 {budget >= 10000 ? `${(budget / 10000).toFixed(0)}억원` : `${budget.toLocaleString()}만원`}
                                                                </p>
                                                            ) : null}

                                                            {!isCompare && direction && (
                                                                <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5 mb-2.5">
                                                                    <p className="text-[11px] text-emerald-800 font-bold line-clamp-2 leading-relaxed">
                                                                        {direction}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2">
                                                                {isCompare ? (
                                                                    <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                                        단지 비교
                                                                    </span>
                                                                ) : item.category && item.category !== 'all' ? (
                                                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                                        {item.category === 'land' ? '토지' : item.category === 'house' ? '주택' : item.category === 'apartment' ? '아파트' : item.category === 'building' ? '빌딩' : item.category}
                                                                    </span>
                                                                ) : null}
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
            <ApartmentCompareBasketBars />
            <ApartmentAreaPickModal
                pending={comparePickPending}
                onClose={() => setComparePickPending(null)}
                onAdded={handleCompareBasketFeedback}
                onError={handleCompareBasketFeedback}
            />
            {compareToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg border border-white/10">
                    {compareToast}
                </div>
            )}
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
