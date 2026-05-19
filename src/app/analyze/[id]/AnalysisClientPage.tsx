'use client';

// 프리미엄 스크롤바 스타일 추가
const globalStyles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
`;

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell, Legend, BarChart as BarChart2,
    Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
    Home, Share2, AlertCircle, TrendingUp, MapPin, Building2,
    Landmark, Activity, FileText, CheckCircle2, ChevronRight,
    Camera, Info, ArrowUpRight, DollarSign, Ruler, Layers,
    ShieldCheck, Zap, Search, ArrowLeft, Plus, Heart,
    Clipboard, ExternalLink, ShieldAlert, Gavel, Check, Copy,
    Users, Map, Lightbulb, ShoppingBag, School, GraduationCap,
    Stethoscope, Trees, Train, Car, Tag, Clock
} from 'lucide-react';



// 타입 정의
interface ComprehensiveRisk {
    scoreItems: Record<string, { score: number | null; reason: string }>;
    totalScore: number;
    coreJudgement: string;
}

interface LandShapeAnalysis {
    developmentUtility: string;
    shapeDescription: string;
    photoAnalysis: string;
}

interface PriceAnalysisReport {
    landFiresaleSummary: string;
    buildingTradeVolume: string;
    comparableAnalysis: string;
}

interface AreaInfo {
    landArea: string;
    floorArea: string;
}

interface PriceReasonableness {
    opinion: string;
    conclusion: string;
}

interface InDepthReport {
    economy: string;
    defects: string;
    outlook: string;
}

interface AnalysisMetadata {
    comparableCount: number;
    conditionRelaxLevel: number;
    method: string;
    confidenceGrade: string;
    confidenceNote: string;
    officialPriceRatio?: {
        targetOfficialPerSqm?: number;
        targetOfficialPrice?: number;
        medianRatio: number | null;
        estimatedPerSqm?: number | null;
        estimatedPerPyeong?: number | null;
        estimatedPrice?: number | null;
        sampleCount: number;
    };
}

interface DetectiveReport {
    category: string;
    propertyTitle: string;
    "1_comprehensiveRisk"?: ComprehensiveRisk;
    "2_landShapeAnalysis"?: LandShapeAnalysis;
    "3_priceAnalysisReport"?: PriceAnalysisReport;
    "4_areaInfo"?: AreaInfo;
    "5_priceReasonableness"?: PriceReasonableness;
    "6_mustCheckList"?: string[];
    "7_inDepthReport"?: InDepthReport;
    "8_finalVerdict"?: string | { verdict?: string; investmentGrade?: string; reason?: string; condition?: string };
    "9_originalText"?: string;
    analysisMetadata?: AnalysisMetadata;
}

// ── Utility Components ──
const AnimNum = ({ value, duration = 1200, suffix = "", prefix = "" }: { value: number, duration?: number, suffix?: string, prefix?: string }) => {
    const [display, setDisplay] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !started.current) {
                started.current = true;
                const start = performance.now();
                const animate = (now: number) => {
                    const p = Math.min((now - start) / duration, 1);
                    const ease = 1 - Math.pow(1 - p, 3);
                    setDisplay(Math.round(value * ease));
                    if (p < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
            }
        }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [value, duration]);

    return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
};

const MiniBar = ({ score, max = 10 }: { score: number, max?: number }) => {
    const pct = (score / max) * 100;
    const color = score >= 8 ? "#22c55e" : score >= 5 ? "#eab308" : "#ef4444";
    return (
        <div className="flex items-center gap-2 w-full mt-2 mb-1">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div style={{ width: `${pct}%`, backgroundColor: color }} className="h-full rounded-full transition-all duration-1000 ease-out" />
            </div>
            <span style={{ color }} className="text-xs font-black min-w-[20px] text-right">{score}</span>
        </div>
    );
};

// 1. 타이핑 애니메이션 컴포넌트
const Typewriter = ({ text, delay = 30 }: { text: string; delay?: number }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex]);
                setCurrentIndex((prev) => prev + 1);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, text, delay]);

    return (
        <span className="inline-block">
            {displayedText}
            {currentIndex < text.length && (
                <span className="inline-block w-1.5 h-5 ml-1 bg-sky-500 animate-pulse align-middle" />
            )}
        </span>
    );
};

// 2. 원형 게이지 차트 컴포넌트
const RiskGauge = ({ score, grade }: { score: number; grade: string }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = () => {
        if (score >= 80) return '#39FF14'; // Neon Green
        if (score >= 40) return '#FFD700'; // Gold
        return '#FF0000'; // Vivid Red
    };

    const getBgColor = () => {
        if (score >= 80) return 'rgba(57, 255, 20, 0.1)';
        if (score >= 40) return 'rgba(255, 215, 0, 0.1)';
        return 'rgba(255, 0, 0, 0.1)';
    };

    return (
        <div className="relative flex items-center justify-center group">
            <svg className="w-48 h-48 transform -rotate-90">
                <circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="12"
                    fill="transparent"
                />
                <motion.circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke={getColor()}
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]"
                    style={{ filter: `drop-shadow(0 0 8px ${getColor()}80)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl font-black text-white"
                >
                    {score}
                </motion.span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Risk Score</span>
                <span
                    className="mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter"
                    style={{ backgroundColor: getBgColor(), color: getColor() }}
                >
                    {grade}
                </span>
            </div>
        </div>
    );
};

// 3. 가격 비교 바 컴포넌트
const PriceComparisonBar = ({ current, fair, bubble }: { current: string; fair: string; bubble: string }) => {
    // 수치 추출 (만원/억 단위 처리 필요하나 여기서는 퍼센트로 시각화 중심)
    const ratio = parseInt(bubble.replace(/[^0-9]/g, '')) || 0;
    const isOvervalued = ratio > 0;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">현재 호가 (Market Price)</p>
                    <p className="text-2xl font-black text-white">{current}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">AI 적정가 (Fair Value)</p>
                    <p className={`text-xl font-black ${isOvervalued ? 'text-slate-400' : 'text-[#39ff14]'}`}>{fair || '분석 중'}</p>
                </div>
            </div>

            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 group">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isOvervalued ? '100%' : '80%' }}
                    className={`h-full ${isOvervalued ? 'bg-gradient-to-r from-sky-500 to-red-500' : 'bg-gradient-to-r from-sky-500 to-neon-green'}`}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 group-hover:scale-110 transition-transform">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-lg ${isOvervalued ? 'bg-[#ff0000] text-white' : 'bg-[#39ff14] text-black'}`}>
                        {isOvervalued ? `거품 ${ratio}%` : '적정가 수준'}
                    </span>
                </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed italic">
                * 최근 3개월 실거래가 및 주변 매물 호가를 딥러닝 분석한 결과입니다.
            </p>
        </div>
    );
};

// 카카오 SDK 타입 정의
declare global {
    interface Window {
        Kakao: any;
    }
}

export default function AnalysisDetailPage({ initialData }: { initialData?: any }) {
    const { id } = useParams();
    const router = useRouter();
    const [analysisData, setAnalysisData] = useState<any>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const [shareToast, setShareToast] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<
        'report' | 'land' | 'building' | 'market' | 'regulatory' | 'population' | 'amenities' | 'properties'
    >('report');
    const [isFavorited, setIsFavorited] = useState(false);
    const [selectedChartFilter, setSelectedChartFilter] = useState('전체');



    // AI 분석 관련 상태
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [aiStep, setAiStep] = useState(0);
    const [aiElapsed, setAiElapsed] = useState(0);

    // AI 분석 제보용 입력 상태
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);
    const [price, setPrice] = useState<number | ''>('');
    const [deposit, setDeposit] = useState<number | ''>('');
    const [monthlyRent, setMonthlyRent] = useState<number | ''>('');
    const [floor, setFloor] = useState<number | ''>('');
    const [dong, setDong] = useState('');
    const [area, setArea] = useState<number | ''>('');
    const [specialNotes, setSpecialNotes] = useState('');
    const [uploadedImages, setUploadedImages] = useState<(File | null)[]>(Array(6).fill(null));
    const imgLabels = ['1번: 전경/지도', '2번: 외관1', '3번: 외관2', '4번: 내부1', '5번: 내부2', '6번: 등본/평면도'];

    // 결제 관련 상태
    const DEV_UID = process.env.NEXT_PUBLIC_DEV_UID;
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCheckingAccess, setIsCheckingAccess] = useState(false);
    const propertyId = analysisData?.report?.pnu as string | undefined;

    const aiSteps = [
        { icon: '🔍', label: '이미지 스캔 중', desc: '현장 사진 6장을 현미경처럼 분석합니다' },
        // { icon: '📋', label: '등기부 권리관계 진단', desc: '근저당·압류·가처분 여부를 확인합니다' },
        { icon: '📍', label: '입지 및 상권 분석', desc: '주변 유동인구와 배후 상권을 검토합니다' },
        { icon: '💰', label: '가격 거품 산정', desc: '공시지가 대비 호가의 거품률을 계산합니다' },
        { icon: '⚖️', label: '법적 리스크 교차검증', desc: '권리 관계와 행정 제약을 확인합니다' },
        { icon: '🏚️', label: '물리적 하자 탐지', desc: '시설 노후도와 수선 필요 비용을 추산합니다' },
        { icon: '📝', label: '네고 전략 수립', desc: '하자 근거로 협상 가능 금액을 산출합니다' },
        { icon: '🔐', label: '계약 방어 특약 생성', desc: '리스크를 막을 필수 특약 문구를 작성합니다' },
        { icon: '🧾', label: '최종 판독서 작성', desc: '탐정의 최종 판결을 정리합니다' },
    ];

    const { images: dataImages, report: dataReport, rawData } = analysisData || {};
    const report = dataReport || analysisData;
    const images = dataImages || analysisData?.images || [];

    const volumeTrendData = useMemo(() => {
        // 앱(Flutter)과 똑같이 rawData를 우선 참조합니다 (AI 분석 전에도 볼 수 있게)
        const stats = rawData?.dealVolumeStats || rawData?.nearbyData?.volumeStats || analysisData?.dealVolumeStats || analysisData?.nearbyData?.volumeStats || [];
        const monthlyCounts: Record<string, number> = {};

        stats.forEach((item: any) => {
            const jimok = item.jimok || '';
            const month = item.month || '';
            if (selectedChartFilter !== '전체' && jimok !== selectedChartFilter) return;
            if (!month) return;
            monthlyCounts[month] = (monthlyCounts[month] || 0) + (Number(item.count) || 0);
        });

        return Object.entries(monthlyCounts)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12);
    }, [rawData, analysisData, selectedChartFilter]);

    // 유틸리티 함수
    const formatPrice = (price: any) => {
        if (!price) return '정보없음';
        if (typeof price === 'string' && price.includes('억')) return price;
        const num = typeof price === 'string' ? parseInt(price.replace(/,/g, '')) : price;
        if (isNaN(num)) return price;
        if (num >= 10000) {
            const eok = Math.floor(num / 10000);
            const man = num % 10000;
            return `${eok}억${man > 0 ? ` ${man.toLocaleString()}만원` : '원'}`;
        }
        return `${num.toLocaleString()}만원`;
    };

    const formatArea = (area: any) => {
        if (!area) return '-';
        return `${area}`;
    };

    const formatDate = (dateStr: any) => {
        if (!dateStr) return '-';
        const str = String(dateStr);
        if (str.length === 8) return `${str.substring(0, 4)}.${str.substring(4, 6)}.${str.substring(6, 8)}`;
        if (str.length === 6) return `${str.substring(0, 4)}.${str.substring(4, 6)}`;
        return str;
    };

    useEffect(() => {
        if (id) {
            fetchAnalysis();
        }
    }, [id]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (analysisData && user) {
            // 백엔드에서 전달해주는 isLiked 값을 우선 사용
            if (analysisData.isLiked !== undefined) {
                setIsFavorited(analysisData.isLiked);
            } else {
                // 기존 likes 배열 구조 fallback
                const likesArray = analysisData.likes || analysisData.report?.likes;
                if (likesArray) {
                    setIsFavorited(likesArray.map((l: any) => l.toString()).includes(user.uid.toString()));
                }
            }
        }
    }, [analysisData, user]);

    const fetchAnalysis = async () => {
        try {
            setLoading(true);
            const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
            const headers: Record<string, string> = {};
            if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

            const response = await fetch(`/api/land/detective/report/${id}`, { headers });
            if (!response.ok) throw new Error('분석 결과를 불러오는데 실패했습니다');
            const data = await response.json();
            setAnalysisData(data);
        } catch (err: any) {
            setError(err.message);
            console.error("데이터 로딩 오류:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async () => {
        if (!user) {
            alert('로그인이 필요한 기능입니다.');
            return;
        }

        // Optimistic
        setIsFavorited(!isFavorited);
        setShareToast(!isFavorited ? '찜 목록에 추가되었습니다! ❤️' : '찜 취소되었습니다.');

        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/land/detective/reports/${id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });
            const data = await res.json();
            if (data.success) {
                // 서버의 응답 likes 배열이 있다면 반영, 아니면 isLiked 결과 기반으로 처리
                if (data.likes) {
                    setIsFavorited(data.likes.map((l: any) => l.toString()).includes(user.uid.toString()));
                } else if (data.isLiked !== undefined) {
                    setIsFavorited(data.isLiked);
                }
            }
        } catch (e) {
            console.error("찜하기 처리 오류:", e);
        }
        setTimeout(() => setShareToast(null), 3000);
    };

    const handleShare = async () => {
        const shareData = {
            title: `부동산탐정 AI 리포트 - ${analysisData?.report?.address}`,
            text: `부동산 매물 분석 결과를 확인해보세요`,
            url: window.location.href
        };

        try {
            if (navigator.share && /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                await navigator.share(shareData);
                setShareToast('공유가 완료되었습니다! 📱');
            } else {
                await navigator.clipboard.writeText(shareData.url);
                setShareToast('링크가 복사되었습니다! 📋');
            }
        } catch (error) {
            setShareToast('링크 복사 실패');
        }
        setTimeout(() => setShareToast(null), 3000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setShareToast('질문이 복사되었습니다! 📋');
        setTimeout(() => setShareToast(null), 2000);
    };

    // ── AI 분석 버튼 클릭 → 결제 확인 후 분기 ──
    const handleAiAnalysisClick = async () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }

        // 개발자 계정은 바로 통과
        if (user.uid === DEV_UID) {
            setIsInputModalOpen(true);
            return;
        }

        if (!propertyId) {
            // PNU 없으면 그냥 열기
            setIsInputModalOpen(true);
            return;
        }

        setIsCheckingAccess(true);
        try {
            const idToken = await user.getIdToken();
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
            const res = await fetch(
                `${backendUrl}/api/payment/check-access?userId=${user.uid}&propertyId=${propertyId}`,
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
            const data = await res.json();
            if (data.hasAccess) {
                setIsInputModalOpen(true);
            } else {
                setIsPaymentModalOpen(true);
            }
        } catch (e) {
            console.error('결제 확인 오류:', e);
            // 오류 시 결제 화면으로
            setIsPaymentModalOpen(true);
        } finally {
            setIsCheckingAccess(false);
        }
    };

    const runAiAnalysis = async () => {
        if (!id || !user) return;

        const isLand = report?.category === 'land';

        // 필수 값 검증
        if (isLand && !price) {
            alert('토지 분석은 매매가(가격) 입력이 필수입니다!');
            return;
        } else if (!isLand && !price && !deposit) {
            alert('가격을 입력해주세요.');
            return;
        }

        setIsInputModalOpen(false);
        setIsAiAnalyzing(true);
        setAiStep(0);
        setAiElapsed(0);

        const timer = setInterval(() => setAiElapsed(prev => prev + 1), 1000);
        const stepTimer = setInterval(() => {
            setAiStep(prev => (prev < aiSteps.length - 1 ? prev + 1 : prev));
        }, 5000);

        try {
            const idToken = await user.getIdToken();
            const formData = new FormData();
            formData.append('reportId', id as string);
            formData.append('price', (Number(price) * 10000).toString());
            formData.append('deposit', (Number(deposit) * 10000).toString());
            formData.append('monthlyRent', (Number(monthlyRent) * 10000).toString());
            formData.append('floor', floor.toString());
            formData.append('area', area.toString());
            formData.append('specialNotes', specialNotes);
            formData.append('dong', dong);

            const imageTypes: string[] = [];
            uploadedImages.forEach((file, originalIndex) => {
                if (file !== null) {
                    const type = originalIndex === 0 ? 'map'
                        : originalIndex === 5 ? 'document'
                            : originalIndex <= 2 ? 'exterior'
                                : 'interior';

                    // MIME 타입 명시 - 기본적으로 image/jpeg 보장
                    const extension = file.name.split('.').pop()?.toLowerCase();
                    const forceMimeType = file.type || (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
                    const safeFile = new File([file], file.name, { type: forceMimeType });

                    formData.append('images', safeFile);
                    imageTypes.push(type);
                }
            });
            formData.append('imageTypes', JSON.stringify(imageTypes));

            const response = await fetch(`/api/land/detective/analyze-ai-only`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('AI 분석 요청 실패');

            await fetchAnalysis();
            setShareToast('AI 탐정의 판독이 완료되었습니다! 🕵️');
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            clearInterval(timer);
            clearInterval(stepTimer);
            setIsAiAnalyzing(false);
        }
    };

    // 공시지가 차트 데이터 가공
    const chartData = useMemo(() => {
        // 1. officialLandPrice (8년치 데이터) 우선 확인
        if (analysisData?.rawData?.officialLandPrice && analysisData.rawData.officialLandPrice.length > 0) {
            return [...analysisData.rawData.officialLandPrice]
                .sort((a, b) => Number(a.year) - Number(b.year))
                .map((item: any) => ({
                    year: item.year,
                    price: Math.round((item.price || 0) / 10000) // 만원 단위 (만약 이미 만원이면 조정 필요)
                }));
        }

        // 2. 기존 vitals.officialPrice 확인
        if (!analysisData?.rawData?.vitals?.officialPrice) return [];
        return [...analysisData.rawData.vitals.officialPrice]
            .reverse()
            .map((item: any) => ({
                year: item.stdrYear,
                price: Math.round((item.pblntfPclnd || item.housePc || 0) / 10000) // 만원 단위
            }));
    }, [analysisData]);

    // AI 분석 데이터 파싱
    const reportData = useMemo<DetectiveReport | null>(() => {
        if (!analysisData) return null;

        const rawJsonString =
            analysisData.analysis?.recommendations ||
            analysisData.report?.ai_summary ||
            (typeof analysisData.analysis === 'string' ? analysisData.analysis : null);

        if (!rawJsonString) return null;

        try {
            let parsed: any;
            try {
                parsed = JSON.parse(rawJsonString);
            } catch (e) {
                console.error("JSON Parse Error on rawJsonString:", e);
                parsed = {};
            }

            return {
                ...parsed,
                propertyTitle: parsed.propertyTitle || analysisData.report?.address || "익명 매물",
            };
        } catch (e) {
            console.error("AI Analysis JSON Parsing Error:", e);
            return null;
        }
    }, [analysisData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-sky-500/20 rounded-full border-t-sky-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="w-6 h-6 text-sky-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-white text-lg mb-1">탐정 AI가 데이터를 분석 중입니다</p>
                        <p className="text-slate-400 text-sm animate-pulse">국가 기관 데이터 연동 중...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !analysisData) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl"
                >
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">분석 리포트 로드 실패</h2>
                    <p className="text-slate-400 mb-8">{error || '분석 결과를 찾을 수 없습니다.'}</p>
                    <button
                        onClick={() => router.back()}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> 리스트로 돌아가기
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-sky-500/30">
            <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
            {/* 고정 배경 효과 */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full"></div>
            </div>

            {/* 상단 네비게이션 */}
            <nav className="sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-3 text-slate-400 hover:text-white transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-105 transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="hidden md:inline font-bold">리포트 목록</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleFavorite}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${isFavorited ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                        >
                            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                        </button>
                        <button
                            onClick={handleShare}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">공유</span>
                        </button>
                        <button
                            onClick={handleAiAnalysisClick}
                            disabled={isCheckingAccess}
                            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
                        >
                            {isCheckingAccess ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>확인 중...</span></>
                            ) : (
                                <><span>AI 분석</span></>
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

                {/* 헤더: 매물 정보 */}
                <header className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-end justify-between gap-8"
                    >
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                                    부동산탐정 분석 사례{report.id}
                                </span>

                            </div>
                            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-6 leading-tight">
                                {reportData?.propertyTitle || report.address}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm font-bold text-slate-300">
                                    <MapPin className="w-4 h-4 text-sky-500" /> {report.dong || '주소지'}
                                </span>
                                <span className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-sm font-bold text-slate-300">
                                    <Building2 className="w-4 h-4 text-emerald-500" /> {report.category === 'land' ? '토지' : report.category === 'apartment' ? '아파트' : '상업용'}
                                </span>
                            </div>
                        </div>

                        {/* 리포트 무드 원라이너 */}
                        {reportData?.['5_priceReasonableness']?.conclusion && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[32px] overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 blur-3xl -z-10 group-hover:bg-sky-500/20 transition-all"></div>
                                <div className="flex items-center gap-3 mb-2 text-sky-400">
                                    <span className="text-xs font-extrabold uppercase tracking-widest font-inter">AI 평가 등급</span>
                                </div>
                                <p className="text-lg font-black text-white leading-tight">
                                    "{reportData['5_priceReasonableness'].conclusion}"
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                </header>

                {/* 고도화된 탭 네비게이션 */}
                <div className="flex items-center justify-start md:justify-center gap-2 mb-10 p-1.5 bg-white/5 rounded-2xl w-full border border-white/10 overflow-x-auto no-scrollbar scroll-smooth">
                    {[
                        { id: 'report', label: 'AI 분석' },
                        { id: 'land', label: '토지 상세' },
                        { id: 'building', label: '건물 상세' },
                        { id: 'market', label: '시장 동향' },
                        { id: 'regulatory', label: '주변 호재' },
                        { id: 'population', label: '인구 현황' },
                        { id: 'amenities', label: '주변 시설' },
                        { id: 'properties', label: '주변 매물' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 md:flex-initial text-center px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'report' && (
                        <motion.div
                            key="report"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* 메인 리포트 영역 */}
                                <div className="lg:col-span-2 space-y-8">

                                    {/* 종합 리스크 분석 */}
                                    <section className="relative overflow-hidden rounded-[40px] border border-white/5 bg-slate-900/40 p-8 sm:p-10 ring-1 ring-white/10">
                                        {(report?.ai_analysis_status || analysisData?.ai_analysis_status) !== 'completed' ? (
                                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                                <div className="w-20 h-20 bg-sky-500/10 rounded-full flex items-center justify-center mb-6 border border-sky-500/20">
                                                    <Zap className="w-10 h-10 text-sky-500" />
                                                </div>
                                                <h3 className="text-2xl font-black text-white mb-2">AI 정밀 판독 준비 완료</h3>
                                                <p className="text-slate-400 mb-8 max-w-md">
                                                    기초 데이터 수집이 완료되었습니다. <br />
                                                    AI 탐정을 가동하여 수익성, 리스크, 네고 전략을 분석하시겠습니까?
                                                </p>
                                                <button
                                                    onClick={handleAiAnalysisClick}
                                                    disabled={isCheckingAccess}
                                                    className="px-10 py-5 bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white font-black rounded-3xl shadow-2xl shadow-sky-500/40 transition-all flex items-center gap-3 active:scale-95"
                                                >
                                                    {isCheckingAccess ? (
                                                        <><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>결제 확인 중...</span></>
                                                    ) : (
                                                        <><Zap className="w-6 h-6" /><span>AI 심층 판독 시작하기 🔥</span></>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                                                <div className="md:col-span-4 flex justify-center">
                                                    <RiskGauge
                                                        score={reportData?.['1_comprehensiveRisk']?.totalScore || 0}
                                                        grade={reportData?.['5_priceReasonableness']?.conclusion || "분석중"}
                                                    />
                                                </div>
                                                <div className="md:col-span-8">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20">
                                                            <Search className="w-5 h-5 text-sky-500" />
                                                        </div>
                                                        <h3 className="text-xl font-black text-white">부동산탐정 AI 요약</h3>
                                                    </div>
                                                    <div className="text-lg text-slate-200 leading-relaxed font-medium min-h-[100px]">
                                                        {reportData?.['1_comprehensiveRisk']?.coreJudgement ? (
                                                            <Typewriter text={reportData['1_comprehensiveRisk'].coreJudgement} delay={40} />
                                                        ) : (
                                                            <span className="text-slate-500 italic">판독 데이터를 불러오는 중입니다...</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </section>

                                    {/* 세부 항목 스코어링 */}
                                    {reportData?.['1_comprehensiveRisk']?.scoreItems && (
                                        <section className="bg-slate-900/40 rounded-[40px] border border-white/5 p-8 sm:p-10 backdrop-blur-md">
                                            <h3 className="text-xl font-black text-white mb-8">세부 리스크 평가 항목</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {Object.entries(reportData['1_comprehensiveRisk'].scoreItems).map(([key, item]: [string, any], idx) => {
                                                    if (!item.score) return null;
                                                    const labelMap: Record<string, string> = {
                                                        'nearbySales': '인근 실거래가',
                                                        'tradeVolume': '거래량',
                                                        'amenities': '생활 편의시설',
                                                        'regulatoryOutlook': '규제 전망',
                                                        'population': '인구 현황',
                                                        'landRegulation': '토지 이용 규제',
                                                        'landShape': '토지 형상',
                                                        'buildingAgePhoto': '건물 노후도(사진)',
                                                        'buildingAgeRegister': '건물 노후도(대장)',
                                                        'rentProfitability': '임대 수익성'
                                                    };
                                                    const label = labelMap[key] || key;
                                                    return (
                                                        <div key={idx} className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 group hover:bg-white/5 transition-all">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">{label}</span>
                                                            </div>
                                                            <MiniBar score={item.score} />
                                                            <p className="text-xs text-slate-400 mt-3 leading-relaxed group-hover:text-slate-300 transition-colors">{item.reason}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {/* 가격 분석 및 적정성 */}
                                    <section className="bg-slate-900/40 rounded-[40px] border border-white/5 p-8 sm:p-10">
                                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                            <Gavel className="w-6 h-6 text-sky-500" />
                                            <span>가격 타당성 검증</span>
                                            {reportData?.analysisMetadata && (
                                                <span className={`ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${reportData.analysisMetadata.confidenceGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    reportData.analysisMetadata.confidenceGrade === 'B' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                        'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    신뢰도 {reportData.analysisMetadata.confidenceGrade}
                                                </span>
                                            )}
                                        </h3>
                                        <div className="mb-6 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
                                            <div className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" /> 판독 결론: {reportData?.['5_priceReasonableness']?.conclusion}
                                            </div>
                                            <p className="text-slate-200 leading-relaxed text-sm">
                                                {reportData?.['5_priceReasonableness']?.opinion}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                                <p className="text-sm font-bold text-slate-400 mb-2">실거래가 비교 요약</p>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    {reportData?.['3_priceAnalysisReport']?.landFiresaleSummary}
                                                </p>
                                            </div>
                                            {reportData?.['3_priceAnalysisReport']?.comparableAnalysis && (
                                                <div className="p-6 bg-sky-500/5 rounded-3xl border border-sky-500/10">
                                                    <p className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-2">
                                                        <Layers className="w-4 h-4" /> 비교사례 보정 분석
                                                    </p>
                                                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                                                        {reportData['3_priceAnalysisReport'].comparableAnalysis}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* 토지 및 현장 분석 */}
                                    <section className="bg-slate-900/40 rounded-[40px] border border-white/5 p-8 sm:p-10">
                                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                            <MapPin className="w-6 h-6 text-sky-500" />
                                            <span>토지 형태 및 개발 잠재력</span>
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="p-5 bg-white/5 rounded-3xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">개발 활용성</p>
                                                <p className="text-sm text-slate-200">{reportData?.['2_landShapeAnalysis']?.developmentUtility}</p>
                                            </div>
                                            <div className="p-5 bg-white/5 rounded-3xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">입지 및 소견</p>
                                                <p className="text-sm text-slate-200">{reportData?.['2_landShapeAnalysis']?.shapeDescription}</p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* 심층 리포트 */}
                                    {reportData?.['7_inDepthReport'] && (
                                        <div className="grid gap-6 mt-8">
                                            {[
                                                { icon: DollarSign, title: "경제성 및 수익성 분석", content: reportData['7_inDepthReport'].economy, accent: "#22c55e" },
                                                { icon: Layers, title: "구조 및 하자 분석", content: reportData['7_inDepthReport'].defects, accent: "#f59e0b" },
                                                { icon: TrendingUp, title: "미래 가치 및 전망", content: reportData['7_inDepthReport'].outlook, accent: "#38bdf8" },
                                            ].map((section, i) => (
                                                <section key={i} className="bg-slate-900/40 rounded-[40px] border border-white/5 p-8 sm:p-10 backdrop-blur-md hover:bg-slate-800/40 transition-all">
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: section.accent + '20', border: `1px solid ${section.accent}40` }}>
                                                            <section.icon className="w-6 h-6" style={{ color: section.accent }} />
                                                        </div>
                                                        <h3 className="text-xl font-black text-white">{section.title}</h3>
                                                    </div>
                                                    <p className="text-sm md:text-base font-medium text-slate-300 leading-loose">{section.content}</p>
                                                </section>
                                            ))}
                                        </div>
                                    )}

                                </div>

                                {/* 사이드바 영역 */}
                                <aside className="space-y-8">
                                    <div className="sticky top-24 space-y-8">

                                        {/* 최종 판결 */}
                                        <div className="bg-gradient-to-b from-red-500/20 to-transparent p-px rounded-[40px]">
                                            <div className="bg-[#111114] p-8 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>
                                                <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                    <ShieldAlert className="w-4 h-4" /> 종합 분석 결과
                                                </h3>
                                                <div className="text-sm text-slate-200 leading-relaxed font-medium py-2">
                                                    {(() => {
                                                        const fv = reportData?.['8_finalVerdict'];
                                                        if (!fv) return '최종 판결 대기중...';
                                                        if (typeof fv === 'string') return fv;
                                                        // 오브젝트 형태로 저장된 경우
                                                        return (
                                                            <div className="space-y-3">
                                                                {fv.verdict && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">판정</span>
                                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${fv.verdict === '매수' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : fv.verdict === '보류' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>{fv.verdict}</span>
                                                                        {fv.investmentGrade && <span className="text-xs font-bold text-slate-400">등급 {fv.investmentGrade}</span>}
                                                                    </div>
                                                                )}
                                                                {fv.reason && (
                                                                    <p className="text-sm text-slate-200 leading-relaxed">{fv.reason}</p>
                                                                )}
                                                                {fv.condition && (
                                                                    <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/10">
                                                                        <p className="text-[10px] font-black text-amber-400 mb-1">투자 조건</p>
                                                                        <p className="text-xs text-slate-300 leading-relaxed">{fv.condition}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 분석 메타데이터 (신뢰도 배지) */}
                                        {reportData?.analysisMetadata && (
                                            <div className="bg-slate-900 border border-white/5 p-6 rounded-[40px] shadow-2xl">
                                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4" /> 데이터 출처
                                                </h3>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-slate-500">분석 방식</span>
                                                        <span className="text-xs font-bold text-white">{reportData.analysisMetadata.method}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-slate-500">비교사례</span>
                                                        <span className="text-xs font-bold text-white">{reportData.analysisMetadata.comparableCount}건</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-slate-500">신뢰도</span>
                                                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${reportData.analysisMetadata.confidenceGrade === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            reportData.analysisMetadata.confidenceGrade === 'B' ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {reportData.analysisMetadata.confidenceGrade}등급
                                                        </span>
                                                    </div>
                                                    {reportData.analysisMetadata.conditionRelaxLevel > 0 && (
                                                        <div className="mt-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                                            <p className="text-[10px] text-amber-400 font-bold">
                                                                ⚠️ 조건 완화 Level {reportData.analysisMetadata.conditionRelaxLevel}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                {reportData.analysisMetadata.confidenceNote}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {reportData.analysisMetadata.officialPriceRatio?.medianRatio && (
                                                        <div className="mt-3 p-3 bg-sky-500/5 rounded-xl border border-sky-500/10">
                                                            <p className="text-[10px] text-sky-400 font-bold mb-2">
                                                                📊 공시가격 배율 분석
                                                            </p>
                                                            <div className="space-y-1.5">
                                                                <div className="flex justify-between">
                                                                    <span className="text-[10px] text-slate-500">배율 (중앙값)</span>
                                                                    <span className="text-[10px] font-bold text-white">{reportData.analysisMetadata.officialPriceRatio.medianRatio}배</span>
                                                                </div>
                                                                {reportData.analysisMetadata.officialPriceRatio.estimatedPerPyeong && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-[10px] text-slate-500">추정 평당가</span>
                                                                        <span className="text-[10px] font-bold text-white">{reportData.analysisMetadata.officialPriceRatio.estimatedPerPyeong?.toLocaleString()}만원</span>
                                                                    </div>
                                                                )}
                                                                {reportData.analysisMetadata.officialPriceRatio.estimatedPrice && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-[10px] text-slate-500">추정 시세</span>
                                                                        <span className="text-[10px] font-bold text-white">{(reportData.analysisMetadata.officialPriceRatio.estimatedPrice / 10000).toLocaleString()}만원</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between">
                                                                    <span className="text-[10px] text-slate-500">샘플 수</span>
                                                                    <span className="text-[10px] font-bold text-white">{reportData.analysisMetadata.officialPriceRatio.sampleCount}건</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 리스크 레이더 (사이드바로 이동) */}
                                        {reportData?.['1_comprehensiveRisk']?.scoreItems && (
                                            <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px] shadow-2xl flex flex-col items-center">
                                                <h3 className="text-xs font-black text-sky-500 uppercase tracking-widest self-start mb-6 flex items-center gap-2">
                                                    <Activity className="w-4 h-4" /> 위험 진단
                                                </h3>
                                                <div className="w-full h-[240px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RadarChart data={Object.entries(reportData['1_comprehensiveRisk'].scoreItems).map(([key, item]: any) => {
                                                            const labelMap: Record<string, string> = {
                                                                'nearbySales': '실거래',
                                                                'tradeVolume': '거래량',
                                                                'amenities': '편의',
                                                                'regulatoryOutlook': '규제',
                                                                'population': '인구',
                                                                'landRegulation': '토지규제',
                                                                'landShape': '형상',
                                                                'buildingAgePhoto': '노후도(사진)',
                                                                'buildingAgeRegister': '노후도(대장)',
                                                                'rentProfitability': '수익성'
                                                            };
                                                            return { subject: labelMap[key] || key, value: item.score || 0, fullMark: 10 };
                                                        })}>
                                                            <PolarGrid stroke="rgba(255,255,255,0.06)" />
                                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.6)", fontWeight: 700 }} />
                                                            <Radar name="Score" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} strokeWidth={2} />
                                                        </RadarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        )}

                                        {/* 필수 확인 체크리스트 */}
                                        {reportData?.['6_mustCheckList'] && (
                                            <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px] shadow-2xl">
                                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" /> 체크리스트
                                                </h3>
                                                <div className="space-y-4">
                                                    {reportData?.['6_mustCheckList'].map((question: string, i: number) => (
                                                        <div key={i} className="group relative">
                                                            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:border-sky-500/30 transition-all">
                                                                <div className="mt-0.5 w-5 h-5 bg-sky-500/10 rounded flex items-center justify-center shrink-0">
                                                                    <span className="text-xs font-black text-sky-500">{i + 1}</span>
                                                                </div>
                                                                <span className="text-xs text-slate-300 font-medium leading-relaxed">{question}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(question);
                                                                    alert('복사되었습니다.');
                                                                }}
                                                                className="absolute right-3 top-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 p-1.5 rounded-lg"
                                                            >
                                                                <Copy className="w-3.5 h-3.5 text-slate-300" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 기본 면적 정보 */}
                                        <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px] shadow-2xl">
                                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">면적 정보</h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                    <span className="text-xs font-bold text-slate-400">대지 면적</span>
                                                    <div className="text-right">
                                                        <span className="text-sm font-black text-white block">
                                                            {report.area ? `${report.area} ㎡` : (reportData?.['4_areaInfo']?.landArea || rawData?.vitals?.land?.characteristics?.area || '-')}
                                                            {report.area && <span className="ml-1 text-[10px] text-sky-500 font-bold">(제보)</span>}
                                                        </span>
                                                        {report.area && rawData?.vitals?.land?.characteristics?.area && report.area !== rawData.vitals.land.characteristics.area && (
                                                            <span className="text-[10px] text-slate-500 line-through">공식: {rawData.vitals.land.characteristics.area} ㎡</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                                    <span className="text-xs font-bold text-slate-400">연면적</span>
                                                    <span className="text-sm font-black text-white">{reportData?.['4_areaInfo']?.floorArea || rawData?.vitals?.building?.title?.[0]?.totArea || '-'} ㎡</span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </aside>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'land' && (
                        <motion.div key="land" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <h3 className="text-2xl font-black">토지 상세지표</h3>
                            {(() => {
                                const multiPnu = rawData?.vitals?.multiPnu;
                                const isMulti = multiPnu && multiPnu.parcelCount > 1;
                                const primaryLandData = rawData?.vitals?.land?.characteristics;

                                if (!primaryLandData && !isMulti) {
                                    return <div className="p-20 text-center text-slate-500">토지 데이터가 제공되지 않았습니다. 관련 지자체 문의</div>;
                                }

                                const parcelsToRender = isMulti ? (multiPnu.parcels || []) : [primaryLandData];
                                const usagePlans = primaryLandData?.usagePlansIncluded || [];

                                return (
                                    <>
                                        {isMulti && (
                                            <div className="text-sky-500 font-black text-lg">
                                                총 {multiPnu.parcelCount}개 필지 정보
                                            </div>
                                        )}
                                        {parcelsToRender.map((parcel: any, idx: number) => {
                                            const pnu = parcel.pnu || '';
                                            const isPrimary = !isMulti || parcel.isPrimary;

                                            let officialLandPriceRaw = isMulti && parcel.landPriceHistory
                                                ? Object.entries(parcel.landPriceHistory).map(([year, price]) => ({ year, price }))
                                                : (rawData?.officialLandPrice || rawData?.vitals?.land?.officialLandPrice || []);

                                            const officialLandPrice = [...officialLandPriceRaw].sort((a: any, b: any) => String(a.year).localeCompare(String(b.year)));

                                            return (
                                                <div key={idx} className="space-y-8 pb-12 mb-12 border-b border-white/5 last:border-0 last:pb-0 last:mb-0">
                                                    <div>
                                                        <h3 className="text-2xl font-black">토지 상세지표 {isMulti ? `(${idx + 1})` : ''}</h3>
                                                        {pnu && <p className="text-slate-500 text-xs mt-1 font-mono uppercase tracking-widest">PNU: {pnu}</p>}
                                                    </div>
                                                    <div className="bg-slate-900 border border-white/5 rounded-[40px] overflow-hidden">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
                                                            {[
                                                                { label: '지목', value: parcel.jimok },
                                                                {
                                                                    label: '면적',
                                                                    value: report.area && isPrimary ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sky-400">{report.area} ㎡ (제보)</span>
                                                                            {parcel.area && report.area !== parcel.area && (
                                                                                <span className="text-xs text-slate-500 line-through font-normal">공식: {parcel.area} ㎡</span>
                                                                            )}
                                                                        </div>
                                                                    ) : `${parcel.area || '-'} ㎡`
                                                                },
                                                                { label: '용도지역', value: parcel.zoning },
                                                                { label: '이용상황', value: parcel.landUse },
                                                                { label: '지형지세', value: parcel.topography },
                                                                { label: '도로접면', value: parcel.roadConnection },
                                                                { label: '형상', value: parcel.landShape },
                                                                { label: '공시지가', value: formatPrice(parcel.pnuPrice || parcel.latestOfficialPrice) },
                                                            ].map((item, i) => (
                                                                <div key={i} className="bg-[#0a0a0c] p-8">
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">{item.label}</p>
                                                                    <div className="text-lg font-black text-white">{item.value || '정보없음'}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-8 bg-white/[0.02]">
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">용도구역 및 규제사항</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {usagePlans?.map((plan: string, i: number) => {
                                                                    const isDanger = plan.includes("허가") || plan.includes("제한") || plan.includes("억제") || plan.includes("보호") || plan.includes("관리");
                                                                    return (
                                                                        <span key={i} className={`px-3 py-1.5 text-xs font-bold rounded-xl border ${isDanger ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/10 text-slate-300"}`}>
                                                                            {isDanger && "⚠️ "}{plan}
                                                                        </span>
                                                                    );
                                                                }) || '규제 정보 없음'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 공시지가 추이 (8년) */}
                                                    {officialLandPrice.length > 0 && (
                                                        <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-2xl">
                                                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                                                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                                                <span>최근 8년 공시지가 변동 추이 (Official Land Price History)</span>
                                                            </h4>
                                                            <div className="h-[300px] w-full">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <AreaChart data={officialLandPrice.map((d: any) => ({
                                                                        ...d,
                                                                        price: typeof d.price === 'string' ? Number(d.price.replace(/,/g, '')) : d.price
                                                                    }))}>
                                                                        <defs>
                                                                            <linearGradient id={isMulti ? `colorLandPrice-${idx}` : "colorLandPrice"} x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                                            </linearGradient>
                                                                        </defs>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                        <XAxis dataKey="year" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                                                        <YAxis
                                                                            stroke="#475569"
                                                                            fontSize={10}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                            tickFormatter={(val) => val.toLocaleString()}
                                                                        />
                                                                        <Tooltip
                                                                            contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px' }}
                                                                            formatter={(val: any) => [`${val.toLocaleString()}원`, "공시지가"]}
                                                                        />
                                                                        <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill={`url(#${isMulti ? `colorLandPrice-${idx}` : "colorLandPrice"})`} dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#10b981' }} />
                                                                    </AreaChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </section>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </motion.div>
                    )}

                    {activeTab === 'building' && (
                        <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            {(() => {
                                const multiPnu = rawData?.vitals?.multiPnu;
                                const isMulti = multiPnu && multiPnu.parcelCount > 1;
                                const primaryTitleList = rawData?.vitals?.building?.title || [];
                                const primaryTitle = primaryTitleList.length > 0 ? primaryTitleList[0] : {};

                                const buildingsToRender = isMulti && multiPnu.buildings?.length > 0
                                    ? multiPnu.buildings
                                    : (primaryTitle.bldNm || primaryTitle.strctCdNm ? [primaryTitle] : []);

                                if (buildingsToRender.length === 0) {
                                    return <div className="p-20 text-center text-slate-500 bg-slate-900 border border-white/5 rounded-[32px]">현재 토지에는 건축물이 없는 것으로 확인됩니다.</div>;
                                }

                                const primaryFloors = rawData?.vitals?.building?.floors || [];

                                return (
                                    <>
                                        {isMulti && (
                                            <div className="text-sky-500 font-black text-lg">
                                                총 {buildingsToRender.length}개 건물 정보
                                            </div>
                                        )}
                                        {buildingsToRender.map((title: any, idx: number) => {
                                            const isPrimary = (title.bldNm && primaryTitle.bldNm && title.bldNm === primaryTitle.bldNm) || (!isMulti) || (idx === 0);
                                            const floors = isPrimary ? primaryFloors : [];

                                            return (
                                                <div key={idx} className="space-y-8 pb-12 mb-12 border-b border-white/5 last:border-0 last:pb-0 last:mb-0">
                                                    <h3 className="text-2xl font-black">건물 상세지표 {isMulti ? `(${idx + 1})` : ''}</h3>
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                        <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 shadow-xl">
                                                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">표제부 정보</h4>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {[
                                                                    { label: '건축물명', value: title.bldNm || '명칭없음' },
                                                                    { label: '주구조', value: title.strctCdNm },
                                                                    { label: '주용도', value: title.mainPurpsCdNm },
                                                                    { label: '사용승인일', value: formatDate(title.useAprDay) },
                                                                    {
                                                                        label: '연면적',
                                                                        value: (report.area && report.category !== 'land' && isPrimary) ? (
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sky-400">{report.area} ㎡ (제보)</span>
                                                                                {title.totArea && report.area !== title.totArea && (
                                                                                    <span className="text-[10px] text-slate-500 line-through font-normal">공식: {title.totArea} ㎡</span>
                                                                                )}
                                                                            </div>
                                                                        ) : `${title.totArea || 0} ㎡`
                                                                    },
                                                                    { label: '건폐율 / 용적률', value: `${title.bcRat || '-'}% / ${title.vlRat || '-'}%` },
                                                                ].map((item, i) => (
                                                                    <div key={i} className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                                                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{item.label}</p>
                                                                        <div className="text-sm font-black text-white truncate">{item.value || '-'}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </section>
                                                        <section className="bg-slate-900 border border-white/5 rounded-[32px] p-6 shadow-xl flex flex-col">
                                                            <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-4">층별 현황</h4>
                                                            <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-2 custom-scrollbar">
                                                                {floors?.length > 0 ? floors.map((floor: any, i: number) => (
                                                                    <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-[10px] w-10 text-center font-black bg-sky-500/10 text-sky-500 py-1 rounded">{floor.flrNoNm || `${floor.flrNo}층`}</span>
                                                                            <p className="text-xs font-bold text-slate-200">{floor.etcPurps || floor.mainPurpsCdNm}</p>
                                                                        </div>
                                                                        <p className="text-xs font-black text-slate-400">{floor.area} ㎡</p>
                                                                    </div>
                                                                )) : <div className="h-full flex items-center justify-center"><p className="text-slate-500 text-xs">층별 데이터가 제공되지 않았습니다. 관련 지자체 문의</p></div>}
                                                            </div>
                                                        </section>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </motion.div>
                    )}

                    {activeTab === 'market' && (
                        <motion.div key="market" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <h3 className="text-2xl font-black">시장 동향 및 거래 데이터</h3>
                                <div className="p-1 px-4 bg-white/5 border border-white/10 rounded-full">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Intensity: Maximum</span>
                                </div>
                            </div>

                            {/* 지목별 거래량 (Volume Stats) - 상단 강조 */}
                            <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-2xl">
                                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <BarChart2 className="w-5 h-5 text-emerald-500" />
                                    <span>지목별 최근 거래량 추이 (Volume Statistics)</span>
                                </h4>

                                {/* 필터 UI */}
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {['전체', '대', '도로', '임야', '전', '답'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setSelectedChartFilter(f)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${selectedChartFilter === f
                                                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                                : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-[300px] w-full">
                                    {volumeTrendData && volumeTrendData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={volumeTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis
                                                    dataKey="month"
                                                    stroke="#475569"
                                                    fontSize={9}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(val) => {
                                                        const parts = val.split('-');
                                                        return parts.length === 2 ? `${parts[0].substring(2)}\`${parseInt(parts[1])}` : val;
                                                    }}
                                                />
                                                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                    contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '10px' }}
                                                    labelFormatter={(label) => `${label} 거래 현황`}
                                                    formatter={(val: any) => [`${val}건`, '거래량']}
                                                />
                                                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24}>
                                                    {volumeTrendData.map((entry: any, index: number) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={index === volumeTrendData.length - 1 ? '#10b981' : 'rgba(255,255,255,0.1)'}
                                                            stroke={index === volumeTrendData.length - 1 ? 'none' : 'rgba(255,255,255,0.05)'}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-slate-500 italic text-center py-20">최근 거래량 통계 부족</p>}
                                </div>
                            </section>

                            {/* 유형별 개별 시장 데이터 (아파트, 빌라 등 각각 개별 차트 및 리스트) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {rawData?.vitals?.regionalTrades && rawData.vitals.regionalTrades.length > 0 ? (
                                    rawData.vitals.regionalTrades.map((group: any, idx: number) => {
                                        // 차트 전용 데이터 가공 (콤마 제거 및 숫자 변환)
                                        const chartData = [...group.data].slice(0, 15).reverse().map((item: any) => ({
                                            ...item,
                                            dealAmount: item.dealAmount ? Number(String(item.dealAmount).replace(/,/g, '')) : 0,
                                            deposit: item.deposit ? Number(String(item.deposit).replace(/,/g, '')) : 0,
                                        }));
                                        const isRent = (group.type || '').includes('전월세');

                                        return (
                                            <section key={idx} className="bg-slate-900/40 border border-white/5 rounded-[40px] p-8 space-y-8 flex flex-col">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20">
                                                            <TrendingUp className="w-5 h-5 text-sky-500" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest">{group.type || '부동산 거래'}</h5>
                                                            <p className="text-lg font-black text-white">시세 및 거래 현황</p>
                                                        </div>
                                                    </div>
                                                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-black text-slate-400">
                                                        {group.data.length} Cases
                                                    </div>
                                                </div>

                                                {/* 개별 차트 */}
                                                <div className="h-[240px] w-full">
                                                    {group.data && group.data.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                <defs>
                                                                    <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor={
                                                                            (group.type || '').includes('아파트') ? '#0ea5e9' :
                                                                                (group.type || '').includes('연립') ? '#10b981' :
                                                                                    (group.type || '').includes('오피스텔') ? '#f59e0b' : '#f43f5e'
                                                                        } stopOpacity={0.4} />
                                                                        <stop offset="95%" stopColor={
                                                                            (group.type || '').includes('아파트') ? '#0ea5e9' :
                                                                                (group.type || '').includes('연립') ? '#10b981' :
                                                                                    (group.type || '').includes('오피스텔') ? '#f59e0b' : '#f43f5e'
                                                                        } stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                                <XAxis dataKey="dealDay" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}일`} />
                                                                <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(val) => {
                                                                    if (val >= 10000) return `${(val / 10000).toFixed(1)}억`;
                                                                    return `${val.toLocaleString()}만`;
                                                                }} />
                                                                <Tooltip contentStyle={{ backgroundColor: '#111114', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '11px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} labelFormatter={(label) => `${label}일 거래`} formatter={(val: any) => [`${Number(String(val).replace(/,/g, '')).toLocaleString()}만원`, '금액']} />
                                                                <Area type="monotone" dataKey={isRent ? 'deposit' : 'dealAmount'} stroke={
                                                                    (group.type || '').includes('아파트') ? '#0ea5e9' :
                                                                        (group.type || '').includes('연립') ? '#10b981' :
                                                                            (group.type || '').includes('오피스텔') ? '#f59e0b' : '#f43f5e'
                                                                } strokeWidth={4} fillOpacity={0.6} fill={`url(#gradient-${idx})`} animationDuration={1500} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    ) : <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">데이터 부족</div>}
                                                </div>

                                                {/* 상세 거래 리스트 */}
                                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                                    {group.data.map((trade: any, i: number) => {
                                                        const priceVal = isRent
                                                            ? `보증금 ${Number(trade.deposit?.replace(/,/g, '') || 0).toLocaleString()}${trade.monthlyRent && trade.monthlyRent !== '0' ? ` / 월 ${Number(trade.monthlyRent).toLocaleString()}` : ''}`
                                                            : `${Number(trade.dealAmount?.replace(/,/g, '') || 0).toLocaleString()}만원`;

                                                        return (
                                                            <div key={i} className="group p-4 bg-white/[0.02] hover:bg-white/5 rounded-2xl border border-white/5 transition-all">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-xs font-black text-white truncate max-w-[180px]">
                                                                        {trade.aptNm || trade.mhouseNm || trade.offiNm || trade.roadNm || trade.sggNm || '지정 건축물'}
                                                                    </p>
                                                                    <p className="text-xs font-black text-sky-400">{priceVal}</p>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-[10px] text-slate-500 font-bold">
                                                                        {trade.dealYear}.{trade.dealMonth}.{trade.dealDay} | {trade.floor ? `${trade.floor}층` : trade.buildYear ? `${trade.buildYear}년 준공` : '다중건물'} | 전용 {trade.excluUseAr || trade.exArea || trade.area || trade.excluUseAr || trade.plottage || trade.totArea || '-'}㎡
                                                                    </p>
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                                        <span className="text-[9px] text-slate-600 font-bold uppercase">{trade.contractType || '일반거래'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        );
                                    })
                                ) : <div className="col-span-full p-20 text-center text-slate-500">시장 통계 데이터가 제공되지 않았습니다. 관련 지자체 문의</div>}
                            </div>

                            {/* 토지 실거래 기록 (Fire Sales) - 별도 레이아웃 */}
                            <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8">
                                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <Activity className="w-5 h-5 text-orange-500" />
                                    <span>탐지된 토지 실거래 내역 (Recent Land Actual Sales)</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {rawData?.nearbyData?.firesales && rawData.nearbyData.firesales.length > 0 ? (
                                        rawData.nearbyData.firesales.slice(0, 12).map((sale: any, i: number) => (
                                            <div key={i} className="p-5 bg-orange-500/5 rounded-[32px] border border-orange-500/10 flex flex-col justify-between min-h-[140px]">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">{sale.jimok}</p>
                                                        <p className="text-sm font-black text-white">{sale.umdNm} {sale.jibun}</p>
                                                    </div>
                                                    <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/5 text-[9px] font-bold text-slate-500">
                                                        {sale.dealYear}.{sale.dealMonth}
                                                    </div>
                                                </div>
                                                <div className="flex items-end justify-between">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-500 font-bold">{sale.dealArea}㎡ | {sale.landUse}</p>
                                                        <p className="text-[10px] text-slate-400 font-black italic">{sale.posesnNm} 소유</p>
                                                    </div>
                                                    <p className="text-lg font-black text-orange-400">{Number(String(sale.dealAmount || 0).replace(/,/g, '')).toLocaleString()}만원</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : <p className="col-span-full text-center py-10 text-slate-500 italic">토지 실거래 기록이 없습니다.</p>}
                                </div>
                            </section>
                        </motion.div>
                    )}

                    {activeTab === 'regulatory' && (
                        <motion.div key="regulatory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <h3 className="text-2xl font-black">개발 호재 및 수사 데이터</h3>

                            {/* ── 결정/시행공고 (Gosi) ── 전체너비 전용 카드 */}
                            <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8 shadow-xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <Landmark className="w-5 h-5 text-orange-500" />
                                    <h4 className="text-sm font-black text-slate-200">결정/시행공고 (Gosi)</h4>
                                    {rawData?.regulatoryData?.gosi?.length > 0 && (
                                        <span className="ml-auto text-[10px] font-black text-orange-500/60 uppercase tracking-widest">
                                            {rawData.regulatoryData.gosi.length}건
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-3 overflow-y-auto max-h-[420px] pr-2 custom-scrollbar">
                                    {rawData?.regulatoryData?.gosi && rawData.regulatoryData.gosi.length > 0 ? (
                                        rawData.regulatoryData.gosi.slice(0, 15).map((item: any, i: number) => {
                                            const gosiDate = item.gosiDate || item.gosi_date || '';
                                            const formattedDate = gosiDate.length === 8
                                                ? `${gosiDate.slice(0, 4)}.${gosiDate.slice(4, 6)}.${gosiDate.slice(6, 8)}`
                                                : gosiDate;
                                            const url = item.url || '';
                                            const summary = item.summary || '';
                                            const title = item.title || '고시 내용';

                                            return (
                                                <div key={i} className="group p-5 bg-white/[0.02] hover:bg-orange-500/5 rounded-2xl border border-white/5 hover:border-orange-500/20 transition-all">
                                                    {/* 제목 */}
                                                    <p className="text-[12px] font-bold text-slate-100 leading-snug mb-2">{title}</p>

                                                    {/* 날짜 + 요약 */}
                                                    <div className="flex items-start gap-2 mb-3">
                                                        {formattedDate && (
                                                            <span className="shrink-0 text-[10px] font-black text-orange-500/80 bg-orange-500/10 px-2 py-0.5 rounded-lg">
                                                                {formattedDate}
                                                            </span>
                                                        )}
                                                        {summary && (
                                                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{summary}</p>
                                                        )}
                                                    </div>

                                                    {/* URL 이동 버튼 */}
                                                    {url && (
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-[10px] font-black text-orange-400 hover:text-orange-300 transition-colors group-hover:underline"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                            </svg>
                                                            고시 원문 보기 →
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-30">
                                            <Search className="w-8 h-8" />
                                            <p className="text-xs font-bold">진행 데이터 없음</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ── 상세 규제 및 호재 현황 (전체너비) ── */}
                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    { title: '인허가 현황 (Permits)', data: rawData?.regulatoryData?.permits, icon: FileText, color: 'text-sky-500' },
                                    { title: '도시정비사업 (재개발·재건축)', data: (rawData?.regulatoryData?.gosi || []).filter((g: any) => /재개발|재건축|정비/.test(g.title || '')), icon: Activity, color: 'text-orange-500' },
                                    { title: '지구단위계획', data: (rawData?.regulatoryData?.gosi || []).filter((g: any) => /지구단위/.test(g.title || '')), icon: Map, color: 'text-emerald-500' },
                                    { title: '실시계획인가', data: (rawData?.regulatoryData?.gosi || []).filter((g: any) => /실시계획|인가/.test(g.title || '')), icon: Activity, color: 'text-purple-500' },
                                ].map((box, idx) => (
                                    <section key={idx} className="bg-slate-900 border border-white/5 rounded-[40px] p-8 flex flex-col shadow-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <box.icon className={`w-5 h-5 ${box.color}`} />
                                            <h4 className="text-sm font-black text-slate-200">{box.title}</h4>
                                            {box.data && box.data.length > 0 && (
                                                <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${box.color}`}>
                                                    {box.data.length}건
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                            {box.data && box.data.length > 0 ? box.data.slice(0, 15).map((item: any, i: number) => (
                                                <div key={i} className="p-5 bg-white/[0.02] hover:bg-white/5 rounded-2xl border border-white/5 group transition-all">
                                                    {item.bldNm && item.bldNm.trim() !== "" && (
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-1 h-1 rounded-full bg-sky-500 animate-pulse"></div>
                                                            <p className="text-[10px] font-black text-sky-500 uppercase tracking-tighter">{item.bldNm}</p>
                                                        </div>
                                                    )}
                                                    <p className="text-[11px] font-bold text-slate-200 leading-snug mb-3">
                                                        {item.title || item.plan_nm || item.area_nm || item.zone_name || item.location_name || item.mainPurpsCdNm || '상세 규제 예정'}
                                                    </p>

                                                    {/* 인허가 특화 데이터 (면적, 단계, 좌표) */}
                                                    {(item.totArea || item.platArea || item.areaChange || item.area_change || item.address || (item.lat && item.lng)) && (
                                                        <div className="grid grid-cols-2 gap-2 mb-3 py-2 border-t border-b border-white/5">
                                                            {(item.totArea || item.platArea) && (
                                                                <>
                                                                    <div>
                                                                        <p className="text-[8px] text-slate-500 font-bold uppercase">연면적</p>
                                                                        <p className="text-[10px] font-black text-slate-300">{item.totArea?.toLocaleString() || item.platArea?.toLocaleString()}㎡</p>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {(item.areaChange || item.area_change) && (
                                                                <div>
                                                                    <p className="text-[8px] text-sky-500 font-bold uppercase">면적 변동</p>
                                                                    <p className="text-[10px] font-black text-sky-400">{(item.areaChange || item.area_change)}㎡</p>
                                                                </div>
                                                            )}
                                                            {(item.address || (item.lat && item.lng)) && (
                                                                <div className="col-span-2 mt-1">
                                                                    <p className="text-[8px] text-slate-500 font-bold uppercase mb-0.5 flex items-center gap-1">
                                                                        <MapPin className="w-2.5 h-2.5" /> 위치 정보
                                                                    </p>
                                                                    <p className="text-[10px] font-medium text-slate-400 truncate">
                                                                        {item.address || `${item.lat}, ${item.lng}`}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {formatDate(item.gosiDate || item.gosi_date || item.archPmsDay || item.plan_wrtg_de || item.sys_updt_dt || item.plan_year)}
                                                            </span>
                                                            <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400 font-bold">{item.projectType || item.archGbCdNm || item.prcs_stts_stcd || '진행중'}</span>
                                                        </div>
                                                        {item.useAprDay && item.useAprDay.trim() !== "" && (
                                                            <div className="flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                                <span className="text-[9px] text-emerald-500/80 font-black">승인완료</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
                                                    <Search className="w-8 h-8" />
                                                    <p className="text-xs font-bold">진행 데이터 없음</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'population' && (
                        <motion.div key="population" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <h3 className="text-2xl font-black">인구 및 수요 데이터 실황</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8">
                                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">최근 5년 지역 인구 증감 추이</h4>
                                    <div className="h-[300px] w-full mt-4">
                                        {rawData?.population?.trend?.trend && rawData.population.trend.trend.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={rawData.population.trend.trend}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis dataKey="year" stroke="#475569" fontSize={10} />
                                                    <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => `${val / 10000}만`} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }} />
                                                    <Line type="monotone" dataKey="population" stroke="#0ea5e9" strokeWidth={4} dot={{ r: 6, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                                                <Activity className="w-12 h-12 opacity-20" />
                                                <p className="italic">5년 인구 통계 데이터가 부족합니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                                <section className="bg-slate-900 border border-white/5 rounded-[40px] p-8">
                                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">최근 3개월 인입 인구 패턴 (전입/전출)</h4>
                                    <div className="h-[300px] w-full mt-4">
                                        {rawData?.population?.movement?.trend && rawData.population.movement.trend.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={rawData.population.movement.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="gradient-movein" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#39ff14" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#39ff14" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="gradient-moveout" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ff0000" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#ff0000" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis dataKey="yearMonth" stroke="#475569" fontSize={10} tickFormatter={(val) => val.substring(4)} />
                                                    <YAxis stroke="#475569" fontSize={10} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                                                    <Area type="monotone" dataKey="moveInCount" name="전입" stroke="#39ff14" strokeWidth={2} fill="url(#gradient-movein)" fillOpacity={1} />
                                                    <Area type="monotone" dataKey="moveOutCount" name="전출" stroke="#ff0000" strokeWidth={2} fill="url(#gradient-moveout)" fillOpacity={1} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                                                <Users className="w-12 h-12 opacity-20" />
                                                <p className="italic">최근 이동 통계 데이터가 부족합니다.</p>
                                            </div>
                                        )}
                                    </div>
                                    {rawData?.population?.movement?.trend && rawData.population.movement.trend.length > 0 && (
                                        <div className="grid grid-cols-3 gap-4 mt-6">
                                            <div className="p-4 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-center">
                                                <div className="text-xl sm:text-2xl font-black text-[#22c55e] tabular-nums">
                                                    <AnimNum value={rawData.population.movement.trend.reduce((acc: number, cur: any) => acc + (cur.moveInCount || 0) - (cur.moveOutCount || 0), 0)} suffix="명" />
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 mt-2 tracking-widest uppercase truncate">총 순유입</div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-center">
                                                <div className="text-xl sm:text-2xl font-black text-[#38bdf8] tabular-nums">
                                                    <AnimNum value={Math.round(rawData.population.movement.trend.reduce((acc: number, cur: any) => acc + (cur.moveInCount || 0), 0) / rawData.population.movement.trend.length)} suffix="명" />
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 mt-2 tracking-widest uppercase truncate">월 평균 전입</div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-[#eab308]/10 border border-[#eab308]/20 text-center">
                                                <div className="text-xl sm:text-2xl font-black text-[#eab308] tabular-nums">
                                                    {rawData.population.movement.trend.reduce((acc: number, cur: any) => acc + (cur.moveInCount || 0) - (cur.moveOutCount || 0), 0) > 0 ? "↑" : "↓"}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 mt-2 tracking-widest uppercase truncate">
                                                    {rawData.population.movement.trend.reduce((acc: number, cur: any) => acc + (cur.moveInCount || 0) - (cur.moveOutCount || 0), 0) > 0 ? "증가 추세" : "감소 추세"}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'amenities' && (
                        <motion.div key="amenities" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <h3 className="text-2xl font-black">주변 인프라 및 생활권</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { key: '공원', label: '녹지 및 공원', icon: Trees, color: 'sky' },
                                    { key: '교통', label: '지하철 및 교통', icon: Train, color: 'orange' },
                                    { key: '쇼핑', label: '생활 가전/쇼핑', icon: ShoppingBag, color: 'pink' },
                                    { key: '학교', label: '학군/교육기관', icon: GraduationCap, color: 'emerald' },
                                ].map((type) => (
                                    <section key={type.key} className="bg-slate-900 border border-white/5 rounded-[40px] p-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <type.icon className={`w-5 h-5 text-${type.color}-500`} />
                                            <h4 className="text-sm font-black">{type.label}</h4>
                                        </div>
                                        <div className="space-y-4">
                                            {rawData?.nearbyData?.amenities?.[type.key]?.slice(0, 5).map((item: any, i: number) => (
                                                <div key={i} className="group cursor-pointer">
                                                    <p className="text-xs font-black text-white group-hover:text-sky-400 transition-colors">{item.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-slate-500">{item.distance}m</span>
                                                        <span className="text-[10px] text-slate-600 font-bold">| {item.address?.split(' ')[2]}</span>
                                                    </div>
                                                </div>
                                            )) || <p className="text-xs text-slate-600">반경 내 시설 없음</p>}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'properties' && (
                        <motion.div key="properties" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <h3 className="text-2xl font-black">주변 급매 및 추천 매물</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rawData?.nearbyData?.properties && rawData.nearbyData.properties.length > 0 ? (
                                    rawData.nearbyData.properties.map((prop: any, i: number) => (
                                        <div key={i} className="bg-slate-900 border border-sky-500/20 rounded-[40px] p-8 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="px-3 py-1 bg-sky-500 text-white text-[10px] font-black rounded-lg">급매</div>
                                            </div>
                                            <p className="text-[10px] text-sky-500 font-black mb-1 uppercase tracking-widest">{prop.title || '토지/상가'}</p>
                                            <h4 className="text-lg font-black text-white mb-4 leading-tight">{prop.address || '상세 주소 미공개'}</h4>
                                            <div className="space-y-3 mb-6">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-bold">희망가</span>
                                                    <span className="text-white font-black">{formatPrice(prop.price)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500 font-bold">면적</span>
                                                    <span className="text-white font-black">{prop.area} ㎡</span>
                                                </div>
                                            </div>
                                            <button className="w-full py-3 bg-white/5 hover:bg-sky-500 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest">
                                                상세 분석 결과 보기
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-20 text-center bg-white/5 rounded-[40px] border border-white/5">
                                        <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                        <p className="font-bold text-slate-500">현재 주변에 추천할 만한 급매물이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-20 border-t border-white/5 bg-slate-900/20 text-center">
                <div className="max-w-md mx-auto px-6">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="text-slate-400 text-xs font-extrabold tracking-widest mb-2.5 font-noto-sans-kr">인증된 AI 부동산탐정 리포트</p>
                    <p className="text-slate-600 text-[10px] leading-relaxed">
                        본 분석 결과는 국가 공공 데이터와 이미지 분석 인공지능을 토대로 작성되었습니다.<br />
                        최종 투자 및 계약 결정은 반드시 전문가와의 상담이 필요합니다.
                    </p>
                </div>
            </footer>

            {/* AI 분석 중 모달 */}
            <AnimatePresence>
                {isAiAnalyzing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700 rounded-[40px] p-8 sm:p-10 max-w-sm w-full shadow-2xl flex flex-col items-center relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-sky-900/20 via-transparent to-orange-900/10 pointer-events-none" />
                            <div className="flex items-center gap-2 mb-6 z-10">
                                <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-[0.2em]">AI Detective Engine Active</span>
                            </div>
                            <div className="relative w-24 h-24 mb-6 z-10">
                                <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                                <motion.div
                                    className="absolute inset-0 rounded-full border-4 border-t-sky-500"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center text-3xl">{aiSteps[aiStep]?.icon}</div>
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 z-10">{aiSteps[aiStep]?.label}</h3>
                            <p className="text-sm text-slate-400 mb-8 text-center px-4 z-10 leading-relaxed font-medium">{aiSteps[aiStep]?.desc}</p>
                            <div className="w-full z-10">
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-sky-500 to-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((aiStep + 1) / aiSteps.length) * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] font-black text-slate-500 mt-3 tabular-nums uppercase tracking-widest">
                                    <span>Phase {aiStep + 1} / {aiSteps.length}</span>
                                    <span>{aiElapsed}s</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI 분석 입력 모달 */}
            <AnimatePresence>
                {isInputModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl px-4 py-6 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            className="bg-slate-900 border border-white/10 rounded-[32px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative"
                        >
                            <button
                                onClick={() => setIsInputModalOpen(false)}
                                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                            >
                                <Plus className="w-4 h-4 rotate-45 text-slate-400" />
                            </button>

                            <div className="mb-6">
                                <h3 className="text-xl sm:text-2xl font-black text-white mb-1.5 flex items-center gap-3">
                                    공공데이터 + AI 정밀 분석
                                </h3>
                                <p className="text-slate-450 text-xs">정확한 분석을 위해 {report?.category === 'land' ? '토지' : '매물'} 상세 정보를 기입해주세요.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                                <div className="space-y-3.5">
                                    <div>
                                        <label className="text-[10px] font-black text-sky-500 mb-1.5 block uppercase tracking-widest">매매가/호가 (만원) <span className="text-rose-500">*필수</span></label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="예: 50000"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                            value={price}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setPrice(val ? Number(val) : '');
                                            }}
                                        />
                                    </div>

                                    {report?.category !== 'land' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">보증금/전세 (만원)</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="예: 3000"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                    value={deposit}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setDeposit(val ? Number(val) : '');
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">월세 (만원)</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="예: 50"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                    value={monthlyRent}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setMonthlyRent(val ? Number(val) : '');
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {report?.category !== 'land' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">층수/동</label>
                                                <input
                                                    type="text"
                                                    placeholder="예: 5층 / 101동"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                    value={dong}
                                                    onChange={(e) => setDong(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">면적 (㎡)</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="예: 84"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                    value={area}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setArea(val ? Number(val) : '');
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3.5">
                                    <label className="text-[10px] font-black text-emerald-500 mb-1.5 block uppercase tracking-widest">현장 사진 (최대 6장)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {imgLabels.map((label, idx) => (
                                            <div key={idx} className="relative group aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        const newImgs = [...uploadedImages];
                                                        newImgs[idx] = file;
                                                        setUploadedImages(newImgs);
                                                    }}
                                                />
                                                {uploadedImages[idx] ? (
                                                    <img
                                                        src={URL.createObjectURL(uploadedImages[idx]!)}
                                                        className="w-full h-full object-cover"
                                                        alt="upload"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 p-2 text-center text-[8px] font-black text-slate-500 group-hover:text-sky-500">
                                                        <Camera className="w-5 h-5 mb-1" />
                                                        {label.split(': ')[1]}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">특이사항/메모</label>
                                        <textarea
                                            rows={2}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs font-medium outline-none focus:border-sky-500 transition-all resize-none"
                                            placeholder="특이사항 참고 사항 기재"
                                            value={specialNotes}
                                            onChange={(e) => setSpecialNotes(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={runAiAnalysis}
                                className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-2xl shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 text-base"
                            >
                                AI 정밀 분석 3,900원
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI 분석 중 모달 */}
            <AnimatePresence>
                {shareToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className="fixed bottom-10 left-1/2 z-[100] bg-white text-black px-8 py-4 rounded-3xl shadow-2xl font-black text-sm flex items-center gap-3 border-4 border-sky-500"
                    >
                        <Zap className="w-5 h-5 text-sky-500" />
                        {shareToast}
                    </motion.div>
                )}
            </AnimatePresence>
            {/* 결제 모달 */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <PaymentModal
                        propertyId={propertyId || ''}
                        propertyAddress={analysisData?.report?.address || ''}
                        user={user!}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onSuccess={() => {
                            setIsPaymentModalOpen(false);
                            setShareToast('✅ 결제 완료! AI 분석을 시작합니다.');
                            setTimeout(() => setIsInputModalOpen(true), 800);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════
//  결제 모달 컴포넌트 (토스페이먼츠 위젯 SDK)
// ═══════════════════════════════════════════
interface PaymentModalProps {
    propertyId: string;
    propertyAddress: string;
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

function PaymentModal({ propertyId, propertyAddress, user, onClose, onSuccess }: PaymentModalProps) {
    const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const AMOUNT = 3000;

    const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const widgetRef = useRef<any>(null);
    const methodsRef = useRef<any>(null);
    const agreementRef = useRef<any>(null);
    const methodsDivRef = useRef<HTMLDivElement>(null);
    const agreementDivRef = useRef<HTMLDivElement>(null);

    const orderId = useRef(
        'AI-' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0')).join('')
    ).current;

    useEffect(() => {
        // 토스페이먼츠 JS SDK 로드
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v2/standard';
        script.async = true;
        script.onload = () => initWidget();
        document.head.appendChild(script);
        return () => { document.head.removeChild(script); };
    }, []);

    const initWidget = async () => {
        try {
            const TossPayments = (window as any).TossPayments;
            if (!TossPayments) return;

            const paymentWidget = await TossPayments(TOSS_CLIENT_KEY).widgets({
                customerKey: user.uid,
            });
            widgetRef.current = paymentWidget;

            await paymentWidget.setAmount({ currency: 'KRW', value: AMOUNT });

            const [methodsCtrl, agreementCtrl] = await Promise.all([
                paymentWidget.renderPaymentMethods({
                    selector: '#toss-payment-methods',
                    variantKey: 'cstalk',
                }),
                paymentWidget.renderAgreement({
                    selector: '#toss-agreement',
                    variantKey: 'cstalk',
                }),
            ]);

            methodsRef.current = methodsCtrl;
            agreementRef.current = agreementCtrl;
            setIsWidgetLoaded(true);
        } catch (e: any) {
            setErrorMsg('결제 위젯 로드 실패: ' + e.message);
        }
    };

    const handlePay = async () => {
        if (!widgetRef.current) return;
        setErrorMsg(null);
        setIsConfirming(true);

        try {
            const customerName = user.displayName || user.email || '고객';
            const orderName = `AI 부동산 분석 (${propertyAddress})`.slice(0, 100);

            const result = await widgetRef.current.requestPayment({
                orderId,
                orderName,
                customerName,
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`,
            });

            if (result?.paymentKey) {
                // 서버 승인
                const idToken = await user.getIdToken();
                const res = await fetch(`${BACKEND_URL}/api/payment/confirm`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        paymentKey: result.paymentKey,
                        orderId: result.orderId,
                        amount: result.amount,
                        userId: user.uid,
                        propertyId,
                    }),
                });
                if (res.ok) {
                    onSuccess();
                } else {
                    const err = await res.json();
                    setErrorMsg(err.message || '결제 승인 실패');
                    setIsConfirming(false);
                }
            }
        } catch (e: any) {
            const code = e?.code || '';
            if (code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL') {
                setIsConfirming(false);
            } else {
                setErrorMsg(`[${code}] ${e?.message || '결제 실패'}`);
                setIsConfirming(false);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                className="w-full sm:max-w-lg bg-[#0F172A] rounded-t-[32px] sm:rounded-[32px] border border-white/10 flex flex-col max-h-[95vh] overflow-hidden"
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-500/15 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-sky-500" />
                        </div>
                        <div>
                            <p className="font-black text-white text-sm">AI 심층 분석</p>
                            <p className="text-slate-500 text-xs">결제 후 바로 이용 가능</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-500">결제 금액</p>
                            <p className="text-sky-400 font-black text-xl">₩3,000</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 매물 정보 */}
                <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex-shrink-0">
                    <p className="text-xs text-slate-500 mb-1">분석 대상</p>
                    <p className="text-white font-bold text-sm truncate">{propertyAddress || '선택된 매물'}</p>
                    <p className="text-slate-500 text-xs mt-1">결제 후 30일간 AI 심층 분석 이용 가능</p>
                </div>

                {/* 결제 위젯 영역 */}
                <div className="flex-1 overflow-y-auto">
                    {!isWidgetLoaded && !errorMsg && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                            <p className="text-slate-400 text-sm">결제 수단 불러오는 중...</p>
                        </div>
                    )}
                    {errorMsg && (
                        <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-red-400 text-sm font-bold">{errorMsg}</p>
                            <button
                                onClick={() => { setErrorMsg(null); initWidget(); }}
                                className="mt-2 text-xs text-slate-400 hover:text-white underline"
                            >
                                다시 시도
                            </button>
                        </div>
                    )}
                    <div id="toss-payment-methods" ref={methodsDivRef} />
                    <div id="toss-agreement" ref={agreementDivRef} />
                </div>

                {/* 결제 버튼 */}
                <div className="p-4 border-t border-white/5 flex-shrink-0">
                    <button
                        onClick={handlePay}
                        disabled={!isWidgetLoaded || isConfirming}
                        className="w-full py-4 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-base"
                    >
                        {isConfirming ? (
                            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 결제 승인 중...</>
                        ) : (
                            <>₩3,000 결제하고 AI 분석 시작 🔥</>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-600 mt-3">토스페이먼츠 보안 결제 • SSL 암호화</p>
                </div>
            </motion.div>
        </motion.div>
    );
}
