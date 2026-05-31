'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Trees, Train, Activity, ShoppingBag, School } from 'lucide-react';
import MiniScoreRing, {
    AmenityOverviewGauge,
    amenityCategoryScore,
    amenityOverallScore,
    distanceToAmenityScore,
    parseAmenityDistance,
} from './MiniScoreRing';

const AMENITY_CATEGORIES = [
    { title: '녹지 및 공원', shortLabel: '공원', key: '공원', icon: Trees, themeColor: '#38bdf8' },
    { title: '지하철 및 교통', shortLabel: '교통', key: '교통', icon: Train, themeColor: '#fb923c' },
    { title: '의료 및 종합병원', shortLabel: '의료', key: '의료', icon: Activity, themeColor: '#f472b6' },
    { title: '생활 가전/쇼핑', shortLabel: '쇼핑', key: '쇼핑', icon: ShoppingBag, themeColor: '#e879f9' },
    { title: '학군/교육기관', shortLabel: '학교', key: '학교', icon: School, themeColor: '#34d399' },
] as const;

interface AmenitiesViewProps {
    amenities?: Record<string, unknown>;
    /** 탭 전용 페이지에서는 제목 크게 */
    variant?: 'summary' | 'page';
}

export default function AmenitiesView({ amenities = {}, variant = 'summary' }: AmenitiesViewProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const metrics = useMemo(() => {
        const categories = AMENITY_CATEGORIES.map((cat) => {
            const raw = amenities[cat.key];
            const items = Array.isArray(raw) ? raw : [];
            return { ...cat, items, score: amenityCategoryScore(items) };
        });
        const overall = amenityOverallScore(categories.map((c) => c.score));
        const totalFacilities = categories.reduce((sum, c) => sum + c.items.length, 0);
        return { categories, overall, totalFacilities };
    }, [amenities]);

    if (!amenities || Object.keys(amenities).length === 0) {
        if (variant === 'page') {
            return (
                <div className="p-12 text-center bg-[#0f172a]/50 border border-white/[0.06] rounded-[32px]">
                    <MapPin className="w-10 h-10 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50 text-sm">주변 시설 데이터가 없습니다.</p>
                </div>
            );
        }
        return null;
    }

    const { categories, overall, totalFacilities } = metrics;

    return (
        <div className="p-5 lg:p-6 bg-[#0f172a]/50 border border-white/[0.06] rounded-[32px] space-y-6">
            <div>
                <div className="flex items-center gap-2.5 mb-1">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className={`text-white font-semibold ${variant === 'page' ? 'text-lg' : 'text-sm'}`}>
                        주변 인프라 · 생활권
                    </span>
                </div>
                <p className="text-xs text-white/40 ml-6">
                    {totalFacilities > 0
                        ? `반경 내 ${totalFacilities}개 시설 기준 생활 편의 점수`
                        : '반경 내 등록된 시설 정보가 없습니다'}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start pb-2 border-b border-white/[0.06]">
                {overall > 0 ? (
                    <AmenityOverviewGauge score={overall} />
                ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-white/30 text-3xl font-bold">-</div>
                )}
                <div className="flex-1 grid grid-cols-3 sm:grid-cols-5 gap-4 justify-items-center w-full">
                    {categories.map((cat) => (
                        <MiniScoreRing
                            key={cat.title}
                            label={cat.shortLabel}
                            score={cat.score}
                            color={cat.themeColor}
                            max={100}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {categories.map((cat) => {
                    const { title, items, score, themeColor, icon: Icon } = cat;
                    const hasData = items.length > 0;
                    const isExpanded = !!expanded[title];

                    return (
                        <div key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                            <button
                                type="button"
                                onClick={() => hasData && setExpanded((prev) => ({ ...prev, [title]: !isExpanded }))}
                                className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${hasData ? 'hover:bg-white/[0.03]' : 'cursor-default'}`}
                            >
                                <div
                                    className="p-2 rounded-xl shrink-0 border"
                                    style={{
                                        backgroundColor: `${themeColor}14`,
                                        borderColor: `${themeColor}33`,
                                    }}
                                >
                                    <Icon className="w-4 h-4" style={{ color: themeColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white">{title}</p>
                                    <p className="text-[11px] text-white/40 mt-0.5 truncate">
                                        {hasData
                                            ? `${items.length}개 시설 · 최근접 ${parseAmenityDistance(items[0]?.distance) === 99999 ? '-' : `${parseAmenityDistance(items[0]?.distance)}m`}`
                                            : '반경 내 시설 없음'}
                                    </p>
                                </div>
                                <MiniScoreRing label="" score={score} color={themeColor} max={100} size="sm" />
                                {hasData && (
                                    <svg
                                        className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>

                            <AnimatePresence>
                                {isExpanded && hasData && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden border-t border-white/[0.06]"
                                    >
                                        <div className="p-3 space-y-2">
                                            {items.slice(0, 5).map((item: any, i: number) => {
                                                const distance = parseAmenityDistance(item.distance);
                                                const distScore = distanceToAmenityScore(distance);
                                                const parts = (item.address || '').split(' ');
                                                const addrText = parts.length > 2 ? parts[2] : item.address || '';

                                                return (
                                                    <div
                                                        key={i}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.025] border border-white/[0.05]"
                                                    >
                                                        <MiniScoreRing
                                                            label=""
                                                            score={distScore}
                                                            color={themeColor}
                                                            max={100}
                                                            size="sm"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                                                            {addrText && (
                                                                <p className="text-[10px] text-white/35 truncate mt-0.5">{addrText}</p>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-bold shrink-0" style={{ color: themeColor }}>
                                                            {distance === 99999 ? '-' : `${distance}m`}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
