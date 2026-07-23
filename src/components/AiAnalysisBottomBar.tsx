'use client';

interface AiAnalysisBottomBarProps {
    onTriggerAnalysis: () => void;
    isCheckingAccess: boolean;
    isLoggedIn: boolean;
    hasAccess: boolean;
    hasPaidToday: boolean;
    isDevAccount: boolean;
    freeRemaining: number;
}

export default function AiAnalysisBottomBar({
    onTriggerAnalysis,
    isCheckingAccess,
    isLoggedIn,
    hasAccess,
    hasPaidToday,
    isDevAccount,
    freeRemaining,
}: AiAnalysisBottomBarProps) {
    const hasUnlimited = hasAccess || hasPaidToday || isDevAccount;

    let buttonText = '계약 전 AI 검토 · 5,900원';
    if (!isLoggedIn) {
        buttonText = '로그인 후 AI 분석';
    } else if (hasAccess) {
        buttonText = '계약 전 AI 검토';
    } else if (hasPaidToday || isDevAccount) {
        buttonText = '계약 전 AI 검토 (오늘 무제한 패스)';
    } else if (freeRemaining > 0) {
        buttonText = '계약 전 AI 검토 (오늘 1회 무료)';
    }

    return (
        <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
            <div className="pointer-events-auto max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-[#0a0a0c] from-60% via-[#0a0a0c]/95 to-transparent flex flex-col items-center gap-3">
                {/* Free Usage Info Banner */}
                {!hasUnlimited && (
                    !isLoggedIn ? (
                        <div className="bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                            <span className="text-[#0284c7] text-xs font-bold font-noto-sans-kr">
                                로그인하면 매일 1회 무료 분석 가능합니다.
                            </span>
                        </div>
                    ) : freeRemaining > 0 ? (
                        <div className="bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                            <span className="text-[#0284c7] text-xs font-bold font-noto-sans-kr flex items-center gap-1">
                                매일 1회 무료로 분석할 수 있어요
                            </span>
                        </div>
                    ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                            <span className="text-amber-500 text-xs font-bold font-noto-sans-kr">
                                오늘 무료 기회가 끝났습니다. 내일 오전 0시부터 무료를 사용할 수 있습니다.
                            </span>
                        </div>
                    )
                )}

                <button
                    type="button"
                    onClick={onTriggerAnalysis}
                    disabled={isCheckingAccess}
                    className="w-full h-14 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-60 text-white font-bold text-[15px] rounded-2xl shadow-xl shadow-sky-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                    {isCheckingAccess ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-white">결제 확인 중...</span>
                        </>
                    ) : (
                        <span className="text-white">{buttonText}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
