'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, DollarSign } from 'lucide-react';
import { primaryPricePreview } from '../lib/manwonPriceFormatter';
import { toDbSafeFloor } from '../lib/collectAnalysisInputData';

export type TransactionType = '매매' | '전세' | '월세';
export type RentType = 'jeonse' | 'wolse' | null;

export interface AiAnalysisInputState {
    transactionType: TransactionType;
    salePrice: number | '';
    deposit: number | '';
    monthlyRent: number | '';
    premium: number | '';
    currentBusiness: string;
    desiredBusiness: string;
    monthlyRevenue: number | '';
    monthlyProfit: number | '';
    floor: number | string | '';
    dong: string;
    area: number | string | '';
    rentType: RentType;
    jeonseDeposit: number | '';
    wolseDeposit: number | '';
    wolseMonthly: number | '';
    specialNotes: string;
    uploadedImages: (File | null)[];
}

export const defaultAiAnalysisInput = (): AiAnalysisInputState => ({
    transactionType: '매매',
    salePrice: '',
    deposit: '',
    monthlyRent: '',
    premium: '',
    currentBusiness: '',
    desiredBusiness: '',
    monthlyRevenue: '',
    monthlyProfit: '',
    floor: '',
    dong: '',
    area: '',
    rentType: null,
    jeonseDeposit: '',
    wolseDeposit: '',
    wolseMonthly: '',
    specialNotes: '',
    uploadedImages: Array(6).fill(null),
});

const REPORT_NESTED_KEYS = ['storeData', 'rawData', 'report', 'vitals', 'analysis', 'userSubmittedData'];

function findReportValue(map: unknown, key: string): unknown {
    if (!map || typeof map !== 'object') return null;
    const obj = map as Record<string, unknown>;
    if (obj[key] !== undefined && obj[key] !== null) {
        const val = obj[key];
        if (typeof val === 'string' && val.trim() === '') return null;
        return val;
    }
    for (const nestedKey of REPORT_NESTED_KEYS) {
        const sub = obj[nestedKey];
        if (sub && typeof sub === 'object') {
            const val = findReportValue(sub, key);
            if (val !== null && val !== undefined) return val;
        }
    }
    return null;
}

function wonToManwon(value: unknown): number | '' {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : Number(value);
    if (!num || Number.isNaN(num)) return '';
    return Math.floor(num / 10000);
}

function parseFloorField(value: unknown): number | string | '' {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value).trim();
    if (!str) return '';
    const num = Number(str);
    if (!Number.isNaN(num) && str === String(num)) return num;
    return str; // UI 표시용 ("4층" 등). API 전송 시 toDbSafeFloor로 제외
}

function toNumField(value: unknown): number | '' {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    return Number.isNaN(num) ? '' : num;
}

function toStrField(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value);
}

/** 공공데이터 수집(AnalyzePanel) · 리포트 저장값 → AI 입력 모달 prefill (Flutter _prefillFromRawData) */
export function parseAiInputFromReportData(data: unknown): AiAnalysisInputState {
    const base = defaultAiAnalysisInput();
    if (!data || typeof data !== 'object') return base;

    const txRaw = findReportValue(data, 'transactionType') ?? findReportValue(data, 'transaction_type');
    const transactionType: TransactionType =
        txRaw === '전세' || txRaw === '월세' ? txRaw : '매매';

    const salePrice = wonToManwon(
        findReportValue(data, 'price') ?? findReportValue(data, 'sale_price'),
    );
    const deposit = wonToManwon(findReportValue(data, 'deposit'));
    const monthlyRent = wonToManwon(
        findReportValue(data, 'monthlyRent') ?? findReportValue(data, 'monthly_rent'),
    );

    let rentType: RentType = null;
    let jeonseDeposit: number | '' = '';
    let wolseDeposit: number | '' = '';
    let wolseMonthly: number | '' = '';

    const rentData = findReportValue(data, 'rent_info') ?? findReportValue(data, 'rentInfo');
    if (rentData && typeof rentData === 'object') {
        const rd = rentData as Record<string, unknown>;
        const rt = rd.type;
        if (rt === 'jeonse' || rt === 'wolse') rentType = rt;
        jeonseDeposit = wonToManwon(rd.jeonse_deposit ?? rd.jeonseDeposit);
        wolseDeposit = wonToManwon(rd.wolse_deposit ?? rd.wolseDeposit);
        wolseMonthly = wonToManwon(rd.wolse_monthly ?? rd.wolseMonthly);
    }
    if (jeonseDeposit === '') {
        jeonseDeposit = wonToManwon(
            findReportValue(data, 'jeonse_deposit') ?? findReportValue(data, 'jeonseDeposit'),
        );
    }
    if (wolseDeposit === '') {
        wolseDeposit = wonToManwon(
            findReportValue(data, 'wolse_deposit') ?? findReportValue(data, 'wolseDeposit'),
        );
    }
    if (wolseMonthly === '') {
        wolseMonthly = wonToManwon(
            findReportValue(data, 'wolse_monthly') ?? findReportValue(data, 'wolseMonthly'),
        );
    }

    return {
        ...base,
        transactionType,
        salePrice,
        deposit,
        monthlyRent,
        premium: wonToManwon(findReportValue(data, 'premium')),
        currentBusiness: toStrField(
            findReportValue(data, 'currentBusiness') ?? findReportValue(data, 'current_business'),
        ),
        desiredBusiness: toStrField(
            findReportValue(data, 'desiredBusiness') ?? findReportValue(data, 'desired_business'),
        ),
        monthlyRevenue: wonToManwon(
            findReportValue(data, 'monthly_revenue') ?? findReportValue(data, 'monthlyRevenue'),
        ),
        monthlyProfit: wonToManwon(
            findReportValue(data, 'monthly_profit') ?? findReportValue(data, 'monthlyProfit'),
        ),
        floor: parseFloorField(findReportValue(data, 'floor')),
        dong: toStrField(findReportValue(data, 'dong')),
        area: toNumField(findReportValue(data, 'area')),
        rentType,
        jeonseDeposit,
        wolseDeposit,
        wolseMonthly,
        specialNotes: toStrField(
            findReportValue(data, 'specialNotes') ?? findReportValue(data, 'special_notes'),
        ),
    };
}

export function isAiInputValid(input: AiAnalysisInputState): boolean {
    const { transactionType, salePrice, deposit, monthlyRent } = input;
    if (transactionType === '매매') return salePrice !== '';
    if (transactionType === '전세') return deposit !== '';
    if (transactionType === '월세') return deposit !== '' && monthlyRent !== '';
    return false;
}

/** FormData 빌드 (Flutter analysis_service와 동일 필드) */
export function buildAiAnalysisFormData(
    reportId: string,
    input: AiAnalysisInputState,
): FormData {
    const formData = new FormData();
    formData.append('reportId', reportId);

    const toWon = (v: number | '') => (v !== '' ? (Number(v) * 10000).toString() : '');

    const price =
        input.transactionType === '매매' && input.salePrice !== ''
            ? toWon(input.salePrice)
            : '0';
    formData.append('price', price);
    formData.append('transactionType', input.transactionType);

    if (input.transactionType === '전세' || input.transactionType === '월세') {
        if (input.deposit !== '') formData.append('deposit', toWon(input.deposit));
    }
    if (input.transactionType === '월세' && input.monthlyRent !== '') {
        formData.append('monthlyRent', toWon(input.monthlyRent));
    }

    const dbFloor = toDbSafeFloor(input.floor);
    if (dbFloor !== null) formData.append('floor', String(dbFloor));
    if (input.area !== '') formData.append('area', input.area.toString());
    if (input.dong) formData.append('dong', input.dong);
    if (input.specialNotes) formData.append('specialNotes', input.specialNotes);

    if (input.premium !== '') formData.append('premium', toWon(input.premium));
    if (input.currentBusiness) formData.append('currentBusiness', input.currentBusiness);
    if (input.desiredBusiness) formData.append('desiredBusiness', input.desiredBusiness);
    if (input.monthlyRevenue !== '') formData.append('monthly_revenue', toWon(input.monthlyRevenue));
    if (input.monthlyProfit !== '') formData.append('monthly_profit', toWon(input.monthlyProfit));

    if (input.transactionType === '매매' && input.rentType) {
        const rentInfo: Record<string, unknown> = { type: input.rentType };
        if (input.rentType === 'jeonse' && input.jeonseDeposit !== '') {
            rentInfo.jeonse_deposit = Number(input.jeonseDeposit) * 10000;
            formData.append('jeonse_deposit', toWon(input.jeonseDeposit));
        }
        if (input.rentType === 'wolse') {
            if (input.wolseDeposit !== '') {
                rentInfo.wolse_deposit = Number(input.wolseDeposit) * 10000;
                formData.append('wolse_deposit', toWon(input.wolseDeposit));
            }
            if (input.wolseMonthly !== '') {
                rentInfo.wolse_monthly = Number(input.wolseMonthly) * 10000;
                formData.append('wolse_monthly', toWon(input.wolseMonthly));
            }
        }
        formData.append('rentInfo', JSON.stringify(rentInfo));
    }

    const imageTypes: string[] = [];
    input.uploadedImages.forEach((file, originalIndex) => {
        if (file !== null) {
            const type =
                originalIndex === 0 ? 'map'
                    : originalIndex === 5 ? 'document'
                        : originalIndex <= 2 ? 'exterior'
                            : 'interior';
            const extension = file.name.split('.').pop()?.toLowerCase();
            const forceMimeType =
                file.type ||
                (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
            formData.append('images', new File([file], file.name, { type: forceMimeType }));
            imageTypes.push(type);
        }
    });
    formData.append('imageTypes', JSON.stringify(imageTypes));

    return formData;
}

const IMAGE_LABELS: Record<string, string[]> = {
    apartment: ['단지 전경', '주차장', '거실/주방', '안방/방', '조망/창밖', '평면도/문서'],
    store: ['상가 외관', '내부 사진', '간판/입지', '주변 상권', '조망/전경', '계약/문서'],
    default: ['위치/지도', '동네 외관', '건물 외부', '실내1', '실내2', '정면/공문서'],
};

function NumField({
    label,
    value,
    onChange,
    placeholder,
    required,
}: {
    label: string;
    value: number | '';
    onChange: (v: number | '') => void;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">
                {label}
                {required && <span className="text-rose-500 ml-1">*</span>}
            </label>
            <input
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                value={value}
                onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    onChange(val ? Number(val) : '');
                }}
            />
        </div>
    );
}

interface Props {
    isOpen: boolean;
    category?: string;
    input: AiAnalysisInputState;
    onChange: (patch: Partial<AiAnalysisInputState>) => void;
    onClose: () => void;
    onSubmit: () => void;
    isCheckingAccess?: boolean;
}

export default function AiAnalysisInputModal({
    isOpen,
    category = '',
    input,
    onChange,
    onClose,
    onSubmit,
    isCheckingAccess = false,
}: Props) {
    const isLand = category === 'land';
    const isStore = category === 'store';
    const isApartment = category === 'apartment';
    const valid = isAiInputValid(input);

    const pricePreview = useMemo(
        () =>
            primaryPricePreview(
                input.transactionType,
                input.salePrice,
                input.deposit,
                input.monthlyRent,
            ),
        [input.transactionType, input.salePrice, input.deposit, input.monthlyRent],
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl px-4 py-6 overflow-y-auto"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        className="bg-slate-900 border border-white/10 rounded-[32px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-auto"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                        >
                            <Plus className="w-4 h-4 rotate-45 text-slate-400" />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl sm:text-2xl font-black text-white mb-1.5">
                                공공데이터 + AI 정밀 분석
                            </h3>
                            <p className="text-slate-400 text-xs">
                                입력 정보가 정밀할수록 AI 분석 결과가 정확해집니다.
                            </p>
                        </div>

                        <div className="space-y-6 mb-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                            {/* 01 거래 유형 */}
                            <div>
                                <p className="text-sky-500 text-xs font-black uppercase tracking-widest mb-3">
                                    01 거래 유형 선택
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['매매', '전세', '월세'] as TransactionType[]).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => onChange({ transactionType: type })}
                                            className={`py-3 rounded-xl text-sm font-bold border transition-all ${input.transactionType === type
                                                ? 'bg-sky-500 border-sky-500 text-white'
                                                : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 02 가격 정보 */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <DollarSign className="w-4 h-4 text-sky-500 shrink-0" />
                                    <p className="text-sky-500 text-xs font-black uppercase tracking-widest">
                                        02 가격 정보
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {input.transactionType === '매매' && (
                                        <div>
                                            <NumField
                                                label="매매가 (만원)"
                                                value={input.salePrice}
                                                onChange={(v) => onChange({ salePrice: v })}
                                                placeholder="예: 50000"
                                                required
                                            />
                                            {pricePreview && (
                                                <p className="mt-2 px-1 text-sky-400 text-sm font-extrabold tracking-tight">
                                                    → {pricePreview}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {input.transactionType === '전세' && (
                                        <div>
                                            <NumField
                                                label="전세보증금 (만원)"
                                                value={input.deposit}
                                                onChange={(v) => onChange({ deposit: v })}
                                                placeholder="예: 30000"
                                                required
                                            />
                                            {pricePreview && (
                                                <p className="mt-2 px-1 text-sky-400 text-sm font-extrabold tracking-tight">
                                                    → {pricePreview}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {input.transactionType === '월세' && (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <NumField
                                                    label="월세보증금 (만원)"
                                                    value={input.deposit}
                                                    onChange={(v) => onChange({ deposit: v })}
                                                    placeholder="예: 3000"
                                                    required
                                                />
                                                <NumField
                                                    label="월세 (만원)"
                                                    value={input.monthlyRent}
                                                    onChange={(v) => onChange({ monthlyRent: v })}
                                                    placeholder="예: 50"
                                                    required
                                                />
                                            </div>
                                            {pricePreview && (
                                                <p className="px-1 text-sky-400 text-sm font-extrabold tracking-tight">
                                                    → {pricePreview}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {isStore && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <NumField
                                                    label="권리금 (만원)"
                                                    value={input.premium}
                                                    onChange={(v) => onChange({ premium: v })}
                                                    placeholder="예: 5000"
                                                />
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">
                                                        현재 업종
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                        placeholder="예: 카페"
                                                        value={input.currentBusiness}
                                                        onChange={(e) => onChange({ currentBusiness: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">
                                                    희망 업종
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                    placeholder="예: 음식점"
                                                    value={input.desiredBusiness}
                                                    onChange={(e) => onChange({ desiredBusiness: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <NumField
                                                    label="월매출 (만원)"
                                                    value={input.monthlyRevenue}
                                                    onChange={(v) => onChange({ monthlyRevenue: v })}
                                                    placeholder="예: 3000"
                                                />
                                                <NumField
                                                    label="월수익 (만원)"
                                                    value={input.monthlyProfit}
                                                    onChange={(v) => onChange({ monthlyProfit: v })}
                                                    placeholder="예: 500"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {isApartment && input.transactionType === '매매' && (
                                        <div className="p-4 bg-white/[0.04] border border-white/10 rounded-2xl space-y-3">
                                            <p className="text-slate-400 text-xs font-semibold">임차 현황 (선택 입력)</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {([
                                                    { label: '없음', value: null },
                                                    { label: '전세', value: 'jeonse' as const },
                                                    { label: '월세', value: 'wolse' as const },
                                                ]).map(({ label, value }) => (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        onClick={() => onChange({ rentType: value })}
                                                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${input.rentType === value
                                                            ? 'bg-sky-500 border-sky-500 text-white'
                                                            : 'bg-white/5 border-white/15 text-slate-400'
                                                            }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            {input.rentType === 'jeonse' && (
                                                <NumField
                                                    label="전세보증금 (만원)"
                                                    value={input.jeonseDeposit}
                                                    onChange={(v) => onChange({ jeonseDeposit: v })}
                                                    placeholder="예: 20000"
                                                />
                                            )}
                                            {input.rentType === 'wolse' && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <NumField
                                                        label="월세보증금 (만원)"
                                                        value={input.wolseDeposit}
                                                        onChange={(v) => onChange({ wolseDeposit: v })}
                                                        placeholder="예: 3000"
                                                    />
                                                    <NumField
                                                        label="월세 (만원)"
                                                        value={input.wolseMonthly}
                                                        onChange={(v) => onChange({ wolseMonthly: v })}
                                                        placeholder="예: 80"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 층수/동/면적 (토지 제외) */}
                            {!isLand && (
                                <div>
                                    <p className="text-sky-500 text-xs font-black uppercase tracking-widest mb-3">
                                        03 상세 정보
                                    </p>
                                    <div className={`grid gap-3 ${isApartment ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">
                                                층수
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="예: 5, 저층, 중층, 고층"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                value={input.floor}
                                                onChange={(e) => onChange({ floor: e.target.value })}
                                            />
                                        </div>
                                        {isApartment && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">
                                                    동
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                    placeholder="예: 101"
                                                    value={input.dong}
                                                    onChange={(e) => onChange({ dong: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">
                                                전용면적 (㎡)
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white font-bold outline-none focus:border-sky-500 transition-all text-sm"
                                                placeholder="예: 84.5"
                                                value={input.area}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/[^0-9.]/g, '');
                                                    const parts = val.split('.');
                                                    if (parts.length > 2) {
                                                        val = parts[0] + '.' + parts.slice(1).join('');
                                                    }
                                                    onChange({ area: val });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 특이사항 */}
                            <div>
                                <p className="text-sky-500 text-xs font-black uppercase tracking-widest mb-3">
                                    {isLand ? '03' : '04'} 특이 사항 (선택)
                                </p>
                                <textarea
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-xs font-medium outline-none focus:border-sky-500 transition-all resize-none"
                                    placeholder="예: 최근 올수리 완료, 융자 무, 급매물 등"
                                    value={input.specialNotes}
                                    onChange={(e) => onChange({ specialNotes: e.target.value })}
                                />
                            </div>

                            {/* 현장 사진 — 추후 활성화 예정
                            <div>
                                <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-3">
                                    현장 사진 (선택, 최대 6장)
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {(IMAGE_LABELS[category] ?? IMAGE_LABELS.default).map((label, idx) => (
                                        <div key={idx} className="relative group aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                            ...
                                        </div>
                                    ))}
                                </div>
                            </div>
                            */}
                        </div>

                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!valid || isCheckingAccess}
                            className="w-full py-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 text-base"
                        >
                            {isCheckingAccess ? '확인 중...' : 'AI 분석 5.900원 (하루 1회 무료)'}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
