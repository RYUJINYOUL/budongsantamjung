'use client';

import { useEffect, useState, useRef } from 'react';
import { User } from 'firebase/auth';

interface AnalysisPaymentModalProps {
    address: string;
    dailyPropertyId: string;
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AnalysisPaymentModal({
    address,
    dailyPropertyId,
    user,
    onClose,
    onSuccess,
}: AnalysisPaymentModalProps) {
    const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    const AMOUNT = 5900;
    const isDevAccount = user && (user.uid === process.env.NEXT_PUBLIC_DEV_UID || user.uid === process.env.NEXT_PUBLIC_DEV_UID2);

    const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const widgetRef = useRef<any>(null);
    const methodsRef = useRef<any>(null);
    const agreementRef = useRef<any>(null);

    const orderId = useRef(
        'ANAL-' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0')).join('')
    ).current;

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v2/standard';
        script.async = true;
        script.onload = () => initWidget();
        document.head.appendChild(script);
        return () => {
            if (document.head.contains(script)) document.head.removeChild(script);
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
                    selector: '#analysis-payment-methods',
                    variantKey: 'cstalk',
                }),
                paymentWidget.renderAgreement({
                    selector: '#analysis-agreement',
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
            const orderName = `AI 개별분석 (${address})`.slice(0, 100);

            const result = await widgetRef.current.requestPayment({
                orderId,
                orderName,
                customerName,
                successUrl: `${window.location.origin}/payment/success`,
                failUrl: `${window.location.origin}/payment/fail`,
            });

            if (result?.paymentKey) {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/payment/confirm', {
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
                        propertyId: dailyPropertyId,
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
        <div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full sm:max-w-lg bg-[#0F172A] rounded-t-[32px] sm:rounded-[32px] border border-white/10 flex flex-col max-h-[95vh] overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                    <div>
                        <p className="font-black text-white text-sm">🔍 AI 개별 분석</p>
                        <p className="text-slate-500 text-xs mt-0.5">공공데이터 수집 + AI 심층 판독</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-500">결제 금액</p>
                            <p className="text-emerald-400 font-black text-xl">₩5,900</p>
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
                    <p className="text-xs text-slate-500 mb-1">분석 대상 주소</p>
                    <p className="text-white font-bold text-sm truncate">{address || '선택된 주소'}</p>
                    <p className="text-slate-500 text-xs mt-1">결제 후 공공데이터 수집이 즉시 시작됩니다.</p>
                </div>

                {/* 결제 위젯 */}
                <div className="flex-1 overflow-y-auto min-h-[250px] bg-white">
                    {!isWidgetLoaded && !errorMsg && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
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
                    <div id="analysis-payment-methods" />
                    <div id="analysis-agreement" />
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
                            <>{isDevAccount ? '분석 시작' : '분석 시작 · 5,900원'}</>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-3">토스페이먼츠 보안 결제 • SSL 암호화</p>
                </div>
            </div>
        </div>
    );
}
