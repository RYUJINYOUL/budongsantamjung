"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    GraduationCap, Navigation, TrendingUp, TrendingDown,
    Minus, Users, BookOpen, AlertCircle, ChevronRight, Activity
} from 'lucide-react';

interface SchoolData {
    school_id: string;
    school_name: string;
    school_level: string;
    establishment_type: string;
    gender_type: string;
    lat: number;
    lng: number;
    total_classes: number;
    total_students: number;
    total_teachers: number;
    students_2024: number | null;
    students_2025: number | null;
    students_2026: number | null;
    distance: number | null;
    has_coords: number;
}

interface SchoolDistrictTabProps {
    lat: number | undefined;
    lng: number | undefined;
}

function getSignal(y24: number, y25: number, y26: number) {
    const validYears = [y24, y25, y26].filter(v => v > 0);
    if (validYears.length < 2) return null;

    const first = validYears[0];
    const last = validYears[validYears.length - 1];
    const diff = last - first;
    const pct = first > 0 ? ((diff / first) * 100) : 0;

    if (y26 > y25 && y25 > y24 && y24 > 0) {
        return { type: 'strong_up', pct, label: '3년 연속 증가 — 인구 유입 활발', color: 'emerald' };
    } else if (y26 < y25 && y25 < y24 && y24 > 0) {
        return { type: 'strong_down', pct, label: '3년 연속 감소 — 관찰 필요', color: 'amber' };
    } else if (pct > 5) {
        return { type: 'up', pct, label: `${pct.toFixed(1)}% 증가 추세`, color: 'emerald' };
    } else if (pct < -5) {
        return { type: 'down', pct, label: `${Math.abs(pct).toFixed(1)}% 감소 추세`, color: 'slate' };
    } else {
        return { type: 'flat', pct, label: '학생수 안정 유지', color: 'slate' };
    }
}

function TrendBar({ value, max }: { value: number; max: number }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            />
        </div>
    );
}

function SchoolCard({ school, index }: { school: SchoolData; index: number }) {
    const y24 = school.students_2024 ?? 0;
    const y25 = school.students_2025 ?? 0;
    const y26 = school.students_2026 ?? 0;

    // 데이터 없는 학교 → 최소한 학교명과 "통계 미등록" 표시
    const hasAnyStudentData = y24 > 0 || y25 > 0 || y26 > 0;

    const signal = hasAnyStudentData ? getSignal(y24, y25, y26) : null;
    const maxStudents = Math.max(y24, y25, y26, 1);

    const walkMin = school.distance != null ? Math.ceil(school.distance / 80) : null;
    const distM = school.distance != null ? Math.round(school.distance) : null;

    const estBadgeColor = school.establishment_type === '사립'
        ? 'bg-violet-500/10 text-violet-300 border-violet-500/20'
        : 'bg-white/[0.05] text-slate-300 border-white/[0.08]';

    const signalColorMap: Record<string, { bg: string; text: string; bar: string }> = {
        strong_up: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' },
        up: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' },
        strong_down: { bg: 'bg-amber-500/10', text: 'text-amber-400', bar: 'bg-amber-500' },
        down: { bg: 'bg-white/[0.05]', text: 'text-slate-400', bar: 'bg-slate-500' },
        flat: { bg: 'bg-white/[0.05]', text: 'text-slate-400', bar: 'bg-slate-600' },
    };
    const sigColors = signal ? signalColorMap[signal.type] : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.35 }}
            className="bg-[#13131a]/85 border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.15] transition-all duration-200"
        >
            {/* 학교 헤더 */}
            <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h5 className="text-[15px] font-bold text-white leading-tight truncate">{school.school_name}</h5>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {school.establishment_type && (
                            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${estBadgeColor}`}>
                                {school.establishment_type}
                            </span>
                        )}
                        {school.gender_type && (
                            <span className="px-2 py-0.5 text-[11px] font-semibold rounded border bg-white/[0.05] text-slate-300 border-white/[0.08]">
                                {school.gender_type}
                            </span>
                        )}
                    </div>
                </div>
                {/* 거리 뱃지 */}
                {walkMin != null ? (
                    <div className="shrink-0 flex flex-col items-end">
                        <div className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                            <Navigation className="w-3.5 h-3.5" />
                            도보 {walkMin}분
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5">{distM?.toLocaleString()}m</span>
                    </div>
                ) : (
                    <div className="shrink-0 text-[11px] text-slate-600 text-right">좌표<br />미확인</div>
                )}
            </div>

            {/* 데이터 없음 */}
            {!hasAnyStudentData ? (
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-xs text-slate-500">통계 미등록 학교 — NEIS 데이터 없음</span>
                    </div>
                </div>
            ) : (
                <div className="border-t border-white/[0.05] px-4 pt-3.5 pb-4 space-y-3.5">
                    {/* 3개년 바 차트 */}
                    <div className="space-y-2">
                        {[
                            { year: '2024', val: y24, color: 'bg-slate-600' },
                            { year: '2025', val: y25, color: 'bg-emerald-600' },
                            { year: '2026', val: y26, color: 'bg-emerald-400' },
                        ].map(({ year, val, color }) => (
                            <div key={year} className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-500 w-8 shrink-0">{year}</span>
                                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full ${color} rounded-full`}
                                        initial={{ width: 0 }}
                                        animate={{ width: maxStudents > 0 ? `${(val / maxStudents) * 100}%` : '0%' }}
                                        transition={{ duration: 0.6, ease: 'easeOut' }}
                                    />
                                </div>
                                <span className={`text-xs font-semibold w-10 text-right shrink-0 ${val === 0 ? 'text-slate-600' : 'text-slate-200'}`}>
                                    {val > 0 ? `${val.toLocaleString()}명` : '—'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 시그널 뱃지 */}
                    {signal && sigColors && (
                        <div className={`flex items-center gap-2 px-3 py-2 ${sigColors.bg} rounded-xl`}>
                            {signal.type.includes('up')
                                ? <TrendingUp className={`w-3.5 h-3.5 shrink-0 ${sigColors.text}`} />
                                : signal.type.includes('down')
                                    ? <TrendingDown className={`w-3.5 h-3.5 shrink-0 ${sigColors.text}`} />
                                    : <Minus className={`w-3.5 h-3.5 shrink-0 ${sigColors.text}`} />}
                            <span className={`text-[11px] font-semibold ${sigColors.text}`}>{signal.label}</span>
                        </div>
                    )}

                    {/* 부가 통계 (총원이 있을 때만) */}
                    {school.total_students > 0 && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            {[
                                { label: '전체 학생', value: `${school.total_students.toLocaleString()}명` },
                                { label: '학급수', value: `${school.total_classes}개` },
                                {
                                    label: '학급당 학생',
                                    value: school.total_classes > 0
                                        ? `${(school.total_students / school.total_classes).toFixed(0)}명`
                                        : '—'
                                },
                            ].map((item) => (
                                <div key={item.label} className="bg-white/[0.03] rounded-xl p-2.5 text-center border border-white/[0.03]">
                                    <div className="text-[11px] text-slate-500 mb-0.5">{item.label}</div>
                                    <div className="text-xs font-bold text-white">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export default function SchoolDistrictTab({ lat, lng }: SchoolDistrictTabProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [schools, setSchools] = useState<SchoolData[]>([]);
    const [activeLevel, setActiveLevel] = useState<string>('전체');

    useEffect(() => {
        if (!lat || !lng) { setError("위치 정보가 없습니다."); setLoading(false); return; }

        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/land/detective/school-district?lat=${lat}&lng=${lng}`);
                const data = await res.json();
                if (data.success) setSchools(data.schools);
                else setError(data.error || "학군 정보를 불러오지 못했습니다.");
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [lat, lng]);

    if (loading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-emerald-500/10 rounded-full border-t-emerald-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-emerald-500" />
                    </div>
                </div>
                <p className="text-slate-400 text-sm animate-pulse">학군 데이터 분석 중…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-24 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500/60 mx-auto mb-3" />
                <p className="text-amber-500 font-semibold text-sm">데이터 로드 실패</p>
                <p className="text-xs text-slate-500">{error}</p>
            </div>
        );
    }

    if (schools.length === 0) {
        return (
            <div className="py-24 text-center">
                <GraduationCap className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">해당 위치에 배정된 학교 정보가 없습니다.</p>
            </div>
        );
    }

    const levels = ['전체', '초등학교', '중학교', '고등학교'];
    const grouped: Record<string, SchoolData[]> = {};
    for (const s of schools) {
        if (!grouped[s.school_level]) grouped[s.school_level] = [];
        grouped[s.school_level].push(s);
    }

    const visibleSchools = activeLevel === '전체' ? schools : (grouped[activeLevel] || []);

    // 요약 통계
    const totalSchools = schools.length;
    const withDataSchools = schools.filter(s => (s.students_2026 ?? 0) > 0);
    const rising = withDataSchools.filter(s => {
        const y24 = s.students_2024 ?? 0; const y25 = s.students_2025 ?? 0; const y26 = s.students_2026 ?? 0;
        return y26 > y25 && y25 > y24 && y24 > 0;
    }).length;

    return (
        <div className="space-y-6">
            {/* 상단 헤더 배너 (초록색 대표 테마 border-emerald-500/20 및 bg-gradient-to-r) */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] to-transparent p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-emerald-500/[0.04] to-transparent" />
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white mb-1">학군 & 인구 유입 시그널</h3>
                    <p className="text-xs text-emerald-200/60 leading-relaxed">
                        3개년(2024–2026) 학생 수 추이로 지역 인구 유입 강도를 파악합니다.
                        학생 수 증가는 젊은 세대 유입을 의미하는 집값 선행 지표입니다.
                    </p>
                </div>
                <div className="flex gap-3 shrink-0">
                    {[
                        { label: '배정 학교', value: totalSchools },
                        { label: '증가 추세', value: rising },
                    ].map(({ label, value }) => (
                        <div key={label} className="text-center bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5">
                            <div className="text-xl font-black text-white">{value}</div>
                            <div className="text-[11px] text-slate-500">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 탭 필터 (이모지 제외 및 Lucide 아이콘 적용) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {levels.map((lv) => {
                    const count = lv === '전체' ? schools.length : (grouped[lv]?.length ?? 0);
                    if (count === 0 && lv !== '전체') return null;
                    const isActive = activeLevel === lv;
                    return (
                        <button
                            key={lv}
                            onClick={() => setActiveLevel(lv)}
                            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${isActive
                                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                                : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'}`}
                        >
                            {lv === '초등학교' && <BookOpen className="w-4 h-4" />}
                            {lv === '중학교' && <Users className="w-4 h-4" />}
                            {lv === '고등학교' && <GraduationCap className="w-4 h-4" />}
                            {lv === '전체' && <Activity className="w-4 h-4" />}
                            <span>{lv}</span>
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.05] text-slate-500'}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* 학교 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleSchools.map((school, idx) => (
                    <SchoolCard key={school.school_id} school={school} index={idx} />
                ))}
            </div>

            <p className="text-[11px] text-slate-600 text-center pt-2">
                * 학생수: NEIS 3개년 통계 기준 · 거리: 직선거리 (도보 분속 80m 환산) · 2024년 데이터 미수집 시 0으로 표시됩니다.
            </p>
        </div>
    );
}
