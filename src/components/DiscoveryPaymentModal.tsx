'use client';

import { useEffect, useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'framer-motion';
import { Hexagon } from 'lucide-react';

interface DiscoveryPaymentModalProps {
    address: string;
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DiscoveryPaymentModal({
    address,
    user,
    onClose,
    onSuccess,
}: DiscoveryPaymentModalProps) {
    const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    const AMOUNT = 9900;

    const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const widgetRef = useRef<any>(null);
    const methodsRef = useRef<any>(null);
    const agreementRef = useRef<any>(null);
    const methodsDivRef = useRef<HTMLDivElement>(null);
    const agreementDivRef = useRef<HTMLDivElement>(null);

    const orderId = useRef(
        'DISC-' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0')).join('')
    ).current;

    useEffect(() => {
        // 토스페이먼츠 JS SDK 로드
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v2/standard';
        script.async = true;
        script.onload = () => initWidget();
        document.head.appendChild(script);
        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
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
            const orderName = `AI 투자처 발굴 (${address})`.slice(0, 100);

            const result = await widgetRef.current.requestPayment({
                orderId,
                orderName,
                customerName,
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`,
            });

            if (result?.paymentKey) {
                // 서버 승인 (발굴 전용 승인 API 호출)
                const idToken = await user.getIdToken();
                const res = await fetch('/api/payment/confirm-discovery', {
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
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 text-slate-800"
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
                        <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                            <Hexagon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="font-black text-white text-sm">공공데이터 + AI 투자처 발굴</p>
                            <p className="text-slate-500 text-xs">발굴된 투자처 리스트는 실시간 자동 저장</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-500">결제 금액</p>
                            <p className="text-emerald-400 font-black text-xl">₩9,900</p>
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
                    <p className="text-xs text-slate-500 mb-1">분석 대상 지역</p>
                    <p className="text-white font-bold text-sm truncate">{address || '선택된 지역'}</p>
                    <p className="text-slate-500 text-xs mt-1">발굴된 리포트는 상세 페이지 및 전체 리스트에 자동 반영됩니다.</p>
                </div>

                {/* 결제 위젯 영역 */}
                <div className="flex-1 overflow-y-auto min-h-[250px] bg-white">
                    {!isWidgetLoaded && !errorMsg && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                            <p className="text-slate-500 text-sm">결제 수단 불러오는 중...</p>
                        </div>
                    )}
                    {errorMsg && (
                        <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-red-600 text-sm font-bold">{errorMsg}</p>
                            <button
                                onClick={() => { setErrorMsg(null); initWidget(); }}
                                className="mt-2 text-xs text-slate-500 hover:text-slate-800 underline"
                            >
                                다시 시도
                            </button>
                        </div>
                    )}
                    <div id="toss-payment-methods" ref={methodsDivRef} />
                    <div id="toss-agreement" ref={agreementDivRef} />
                </div>

                {/* 결제 버튼 */}
                <div className="p-4 border-t border-white/5 flex-shrink-0 bg-[#0F172A]">
                    <button
                        onClick={handlePay}
                        disabled={!isWidgetLoaded || isConfirming}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-emerald-500/15"
                    >
                        {isConfirming ? (
                            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 결제 승인 중...</>
                        ) : (
                            <>AI 분석 시작</>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-3">토스페이먼츠 보안 결제 • SSL 암호화</p>
                </div>
            </motion.div>
        </motion.div>
    );
}
